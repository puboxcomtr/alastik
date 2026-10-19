
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const authMiddleware = require('../../../middleware/authMiddleware');
const WebOrder = require('../../../models/web/order/WebOrder');
const WebMember = require('../../../models/web/user/WebMember');
const B2bPayment = require('../../../models/web/user/B2bPayment');
const PaynetService = require('../../../services/plugins/payment/PaynetService');
const NetahsilatService = require('../../../services/plugins/payment/NetahsilatService');
const { SITES } = require('../../../config/sites');
const { queueOrderMail, queuePaymentReceiptMail } = require('../../../services/web/b2b/b2bMail');

const MIN_INSTALLMENT_COUNT = 2;
const INSTALLMENT_TABLE_TTL_MS = 10 * 60 * 1000;
const installmentTableCache = new Map();

const NETAHSILAT_INSTALLMENT_VPOS_IDS = [24, 5];
const isNetahsilatInstallmentPos = (vPosId) => NETAHSILAT_INSTALLMENT_VPOS_IDS.includes(Number(vPosId));
const INSTALLMENT_PROVIDERS = { NETAHSILAT: 'netahsilat', PAYNET: 'paynet' };
const INSTALLMENT_PROVIDER_MISMATCH_MESSAGE = 'Bu kartla taksitli ödeme için lütfen sayfayı yenileyip tekrar deneyiniz.';
const API_PUBLIC_BASE = process.env.PUBLIC_API_URL || 'https://api.alastik.com';

function resolveCallbackBase(site, returnBase) {
    return SITES[site]?.sameOriginApi ? returnBase : API_PUBLIC_BASE;
}

function resolveReturnBase(site, returnOrigin) {
    const domains = SITES[site]?.domains || [];
    if (returnOrigin) {
        try {
            const host = new URL(returnOrigin).hostname.toLowerCase();
            if (domains.includes(host)) return `https://${host}`;
        } catch (_) {  }
    }
    return `https://${domains[0] || ''}`;
}

router.get('/paynet/config', authMiddleware, async (req, res) => {
    try {
        const config = await PaynetService.getPublicConfig(req.site);
        if (!config) {
            return res.status(404).json({ success: false, message: 'Kredi kartı ödemesi şu anda kullanılamıyor.' });
        }
        res.json({ success: true, data: config });
    } catch (error) {
        console.error('[b2b-payment] Paynet config hatası:', error.message);
        res.status(500).json({ success: false, message: 'Ödeme yapılandırması alınamadı.' });
    }
});

router.post('/paynet/ratios', authMiddleware, async (req, res) => {
    try {
        const b = req.body || {};
        const bin = String(b.bin || '').replace(/\D/g, '');
        const amountTL = Number(b.amount);
        if (bin && !/^\d{6}$/.test(bin)) {
            return res.status(400).json({ success: false, message: 'Geçersiz kart bilgisi.' });
        }
        if (!Number.isFinite(amountTL) || amountTL <= 0) {
            return res.status(400).json({ success: false, message: 'Geçersiz tutar.' });
        }
        const result = await PaynetService.getRatios({
            site: req.site,
            amount: Math.round(amountTL * 100),
            bin: bin || undefined
        });
        res.set('Cache-Control', 'no-store');
        return res.json({ success: result.success, data: result.banks, message: result.message });
    } catch (error) {
        console.error('[b2b-payment] Paynet ratios hatası:', error.message);
        res.status(500).json({ success: false, message: 'Taksit seçenekleri alınamadı.' });
    }
});

router.post('/netahsilat/ratios', authMiddleware, async (req, res) => {
    try {
        const b = req.body || {};
        const bin = String(b.bin || '').replace(/\D/g, '');
        const amountTL = Number(b.amount);
        if (!/^\d{6}$/.test(bin)) {
            return res.status(400).json({ success: false, message: 'Geçersiz kart bilgisi.' });
        }
        if (!Number.isFinite(amountTL) || amountTL <= 0) {
            return res.status(400).json({ success: false, message: 'Geçersiz tutar.' });
        }

        const r = await NetahsilatService.getPosByBin(bin, req.site);
        res.set('Cache-Control', 'no-store');

        const netahsilatCard = (r?.installments || []).some((it) => isNetahsilatInstallmentPos(it.vPosId));
        if (!netahsilatCard) {
            const paynet = await PaynetService.getRatios({ site: req.site, amount: Math.round(amountTL * 100), bin });
            const paynetOptions = (paynet.banks?.[0]?.options || [])
                .filter((o) => Number(o.instalment) >= MIN_INSTALLMENT_COUNT)
                .map((o) => ({
                    instalment: o.instalment,
                    desc: `${o.instalment} Taksit`,
                    instalmentAmount: o.instalmentAmount,
                    totalAmount: o.totalAmount,
                    commission: o.commission
                }));
            return res.json({ success: true, data: { provider: INSTALLMENT_PROVIDERS.PAYNET, cardInfo: r?.cardInfo || null, options: paynetOptions } });
        }

        if (!r.hasInstallment) {
            return res.json({ success: true, data: { provider: INSTALLMENT_PROVIDERS.NETAHSILAT, cardInfo: r.cardInfo || null, options: [] } });
        }
        const options = (r.installments || [])
            .filter((it) => Number(it.installment) >= MIN_INSTALLMENT_COUNT && isNetahsilatInstallmentPos(it.vPosId))
            .map((it) => {
                const komisyon = Number(it.commRate) || 0;
                const total = Math.round(amountTL * (1 + komisyon / 100) * 100) / 100;
                const aylik = Math.round((total / it.installment) * 100) / 100;
                return {
                    instalment: it.installment,
                    desc: `${it.installment} Taksit`,
                    instalmentAmount: aylik,
                    totalAmount: total,
                    commission: Math.round((total - amountTL) * 100) / 100,
                    vPosId: it.vPosId
                };
            })
            .sort((a, b) => a.instalment - b.instalment);

        return res.json({ success: true, data: { provider: INSTALLMENT_PROVIDERS.NETAHSILAT, cardInfo: r.cardInfo, options } });
    } catch (error) {
        console.error('[b2b-payment] NetTahsilat ratios hatası:', error.message);
        res.status(500).json({ success: false, message: 'Taksit seçenekleri alınamadı.' });
    }
});

const PAYNET_TABLE_SAMPLE_AMOUNT_KURUS = 100000;

async function paynetMaxInstallmentRate(site) {
    const result = await PaynetService.getRatios({ site, amount: PAYNET_TABLE_SAMPLE_AMOUNT_KURUS });
    let best = null;
    for (const bank of (result.banks || [])) {
        for (const option of (bank.options || [])) {
            if (option.instalment < MIN_INSTALLMENT_COUNT || (best && option.instalment <= best.installment)) continue;
            const sample = PAYNET_TABLE_SAMPLE_AMOUNT_KURUS / 100;
            const commRate = option.totalAmount > sample ? Math.round(((option.totalAmount - sample) / sample) * 10000) / 100 : 0;
            best = { installment: option.instalment, commRate };
        }
    }
    return best;
}

router.get('/netahsilat/installment-table', authMiddleware, async (req, res) => {
    try {
        const hit = installmentTableCache.get(req.site);
        if (hit && Date.now() - hit.at < INSTALLMENT_TABLE_TTL_MS) return res.json({ success: true, data: hit.data });

        const r = await NetahsilatService.getVirtualPosList(req.site);
        if (!r?.success) return res.status(502).json({ success: false, message: 'Taksit oranları alınamadı.' });

        const PaymentMethod = require('../../../models/admin/order/PaymentMethod');
        const method = await PaymentMethod.findOne({
            site: req.site, provider: 'netahsilat', type: 'credit_card', isActive: true, isDeleted: { $ne: true }
        }).select('creditCardSettings.installmentBanks').lean();
        const bankMeta = new Map((method?.creditCardSettings?.installmentBanks || []).map(b => [Number(b.vPosId), b]));

        const paynetRate = await paynetMaxInstallmentRate(req.site);

        const byName = new Map();
        for (const pos of r.poses) {
            const meta = bankMeta.get(Number(pos.vPosId));
            const name = String(meta?.displayName || pos.name || '').trim();
            const rates = isNetahsilatInstallmentPos(pos.vPosId)
                ? pos.rates.filter(x => x.installment >= MIN_INSTALLMENT_COUNT)
                : (paynetRate ? [paynetRate] : []);
            if (!name || rates.length === 0) continue;
            const bank = byName.get(name) || { name, logo: null, rates: {} };
            if (!bank.logo && meta?.logo) bank.logo = meta.logo;
            for (const x of rates) if (!(x.installment in bank.rates)) bank.rates[x.installment] = x.commRate;
            byName.set(name, bank);
        }
        const banks = [...byName.values()].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
        const installments = [...new Set(banks.flatMap(bank => Object.keys(bank.rates).map(Number)))].sort((a, b) => a - b);

        const data = { installments, banks };
        installmentTableCache.set(req.site, { at: Date.now(), data });
        res.json({ success: true, data });
    } catch (error) {
        console.error('[b2b-payment] Taksit tablosu hatası:', error.message);
        res.status(500).json({ success: false, message: 'Taksit oranları alınamadı.' });
    }
});

router.post('/netahsilat/3d-init', authMiddleware, async (req, res) => {
    try {
        const b = req.body || {};
        const { orderId, pt, cardNumber, cardHolderName, expMonth, expYear, cvc, installment, vPosId } = b;
        if (!orderId || !pt || !cardNumber || !cardHolderName || !expMonth || !expYear || !cvc || !installment || !vPosId) {
            return res.status(400).json({ success: false, message: 'Eksik ödeme bilgisi.' });
        }
        if (!isNetahsilatInstallmentPos(vPosId)) {
            return res.status(400).json({ success: false, message: INSTALLMENT_PROVIDER_MISMATCH_MESSAGE });
        }

        const order = await WebOrder.findOne({ _id: orderId, site: req.site });
        if (!order || order.payment?.paymentGuid !== pt) {
            return res.status(404).json({ success: false, message: 'Sipariş doğrulanamadı.' });
        }
        if (order.payment?.status === 'paid') {
            return res.status(400).json({ success: false, message: 'Bu sipariş zaten ödendi.' });
        }

        const returnBase = resolveReturnBase(req.site, b.returnOrigin);
        const result = await NetahsilatService.processPayment({
            orderNumber: order.orderNumber,
            customerName: (order.customerName || order.shippingSnapshot?.fullName || '').trim(),
            site: order.site,
            amount: order.pricing?.total,
            installment: parseInt(installment),
            vPosId: parseInt(vPosId),
            cardNumber,
            cardHolderName,
            expMonth,
            expYear: String(expYear).length === 2 ? `20${expYear}` : String(expYear),
            cvc,
            email: order.customerEmail || order.memberSnapshot?.email || 'bayi@lastikjantavm.com',
            returnUrl: `${resolveCallbackBase(req.site, returnBase)}/api/b2b/payment/netahsilat/3d-callback`
        });

        if (result.success && result.threeDUrl) {
            order.payment.gateway = 'netahsilat';
            order.payment.installment = parseInt(installment);
            order.payment.referenceCode = result.referenceCode;
            order.payment.transactionId = result.transactionId;
            order.payment.returnOrigin = returnBase;
            order.payment.status = 'pending';
            await order.save();
            return res.json({ success: true, threeDUrl: result.threeDUrl });
        }

        return res.status(400).json({ success: false, message: result.message || 'Ödeme başlatılamadı.' });
    } catch (error) {
        console.error('[b2b-payment] NetTahsilat 3d-init hatası:', error.message);
        return res.status(500).json({ success: false, message: 'Ödeme başlatılamadı.' });
    }
});

router.post('/netahsilat/3d-callback', async (req, res) => {
    const b = req.body || {};
    const paymentGuid = b.PaymentGuid || b.paymentguid;
    const status = String(b.status || b.Status || '').toUpperCase();
    const orderReference = b.orderreference || b.OrderReference || b.ClientReferenceCode;
    const bankMsg = b.errormessage || b.BankMessage || '';
    const errCode = b.errorcode || b.BankErrorCode || '';

    let order = null;
    try {
        order = orderReference ? await WebOrder.findOne({ 'payment.referenceCode': orderReference }) : null;
    } catch (_) {  }

    const base = order?.payment?.returnOrigin
        || `https://${((SITES[order?.site]?.domains) || SITES.b2b.domains || [])[0] || ''}`;
    const redir = (params) => {
        const clean = {};
        Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') clean[k] = String(v); });
        return res.redirect(`${base}/siparis-sonuc?${new URLSearchParams(clean).toString()}`);
    };

    try {
        if (!order) {
            return res.redirect(`${base}/siparis-sonuc?durum=basarisiz&mesaj=${encodeURIComponent('Sipariş bulunamadı')}`);
        }
        if (order.payment?.status === 'paid') {
            return redir({ durum: 'basarili', siparis: order.orderNumber, tutar: order.pricing?.total });
        }

        if (status === 'SUCCESS' && paymentGuid) {
            const commit = await NetahsilatService.commitPayment(paymentGuid, order.site);
            if (commit.success) {
                order.payment.status = 'paid';
                order.status = 'confirmed';
                order.payment.method = 'credit_card';
                order.payment.gateway = 'netahsilat';
                order.payment.paidAt = new Date();
                order.payment.authCode = commit.authCode;
                order.payment.transactionId = commit.transactionId || order.payment.transactionId;
                order.payment.paymentGuid = undefined;
                await order.save();
                try {
                    const { syncOrderToDia } = require('../../../services/plugins/dia/DiaOrderService');
                    await syncOrderToDia(order.toObject());
                } catch (e) {
                    console.error('[b2b-payment] NetTahsilat DIA aktarım hatası:', e.message);
                }
                queueOrderMail(order._id, { withReceipt: true });
                return redir({ durum: 'basarili', siparis: order.orderNumber, tutar: order.pricing?.total });
            }
            order.payment.status = 'failed';
            order.status = 'payment_failed';
            order.payment.errorMessage = commit.message;
            await order.save();
            return redir({ durum: 'basarisiz', siparis: order.orderNumber, tutar: order.pricing?.total, banka: commit.message, kod: commit.bankErrorCode });
        }

        order.payment.status = 'failed';
        order.status = 'payment_failed';
        order.payment.errorMessage = bankMsg || 'Ödeme tamamlanamadı';
        await order.save();
        return redir({ durum: 'basarisiz', siparis: order.orderNumber, tutar: order.pricing?.total, banka: bankMsg, kod: errCode });
    } catch (error) {
        console.error('[b2b-payment] NetTahsilat 3d-callback hatası:', error.message);
        return res.redirect(`${base}/siparis-sonuc?durum=basarisiz&mesaj=${encodeURIComponent('Ödeme sırasında hata oluştu')}`);
    }
});

const CLIENT_ERROR_MAX_LENGTH = 300;
const PAYNET_CLIENT_ERROR_KINDS = { PAYMENT: 'payment', ORDER: 'order' };

router.post('/paynet/client-error', authMiddleware, async (req, res) => {
    try {
        const b = req.body || {};
        const message = String(b.message || '').trim().slice(0, CLIENT_ERROR_MAX_LENGTH) || 'Ödeme ekranına geçilemedi';
        const code = String(b.code || '').slice(0, 40);
        if (!b.id || !b.pt) return res.status(400).json({ success: false, message: 'Eksik bilgi.' });

        if (b.kind === PAYNET_CLIENT_ERROR_KINDS.PAYMENT) {
            const payment = await B2bPayment.findOne({ _id: b.id, site: req.site, memberId: req.user._id });
            if (!payment || payment.paymentGuid !== b.pt) return res.status(404).json({ success: false, message: 'Kayıt bulunamadı.' });
            if (payment.status === 'pending') {
                payment.status = 'failed';
                payment.errorMessage = `Paynet: ${message}`;
                payment.errorCode = code;
                await payment.save();
            }
            return res.json({ success: true });
        }
        if (b.kind === PAYNET_CLIENT_ERROR_KINDS.ORDER) {
            const order = await WebOrder.findOne({ _id: b.id, site: req.site, memberId: req.user._id });
            if (!order || order.payment?.paymentGuid !== b.pt) return res.status(404).json({ success: false, message: 'Kayıt bulunamadı.' });
            if (order.payment?.status === 'pending') {
                order.payment.status = 'failed';
                order.payment.gateway = 'paynet';
                order.payment.errorMessage = `Paynet: ${message}`;
                order.payment.errorCode = code;
                order.status = 'payment_failed';
                await order.save();
            }
            return res.json({ success: true });
        }
        return res.status(400).json({ success: false, message: 'Geçersiz kayıt türü.' });
    } catch (error) {
        console.error('[b2b-payment] Paynet istemci hatası kaydedilemedi:', error.message);
        res.status(500).json({ success: false, message: 'Kaydedilemedi.' });
    }
});

router.post('/paynet/return', async (req, res) => {
    const b = req.body || {};
    const sessionId = b.session_id;
    const tokenId = b.token_id;
    const orderId = b.orderId;
    const pt = b.pt;
    const base = resolveReturnBase(req.site, b.returnOrigin);
    const sonucUrl = (params) => {
        const clean = {};
        Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') clean[k] = String(v); });
        return `${base}/siparis-sonuc?${new URLSearchParams(clean).toString()}`;
    };
    const fail = (msg, extra = {}) => res.redirect(sonucUrl({ durum: 'basarisiz', mesaj: msg || 'Ödeme tamamlanamadı', ...extra }));

    try {
        if (!orderId || !pt) return fail('Eksik ödeme bilgisi');

        const order = await WebOrder.findOne({ _id: orderId, site: req.site });
        if (!order || order.payment?.paymentGuid !== pt) {
            return fail('Sipariş doğrulanamadı');
        }
        if (order.payment?.status === 'paid') {
            return res.redirect(sonucUrl({ durum: 'basarili', siparis: order.orderNumber, tutar: order.pricing?.total }));
        }
        if (!sessionId || !tokenId) {
            order.payment.status = 'failed';
            order.payment.errorMessage = '3D doğrulaması tamamlanmadı';
            order.status = 'payment_failed';
            await order.save();
            return fail('3D doğrulaması tamamlanmadı', { siparis: order.orderNumber, tutar: order.pricing?.total, kod: '3DS_INCOMPLETE' });
        }

        const requestedInstallment = parseInt(b.installment) || 0;
        if (requestedInstallment >= MIN_INSTALLMENT_COUNT && Number(order.payment?.installment) >= MIN_INSTALLMENT_COUNT) {
            order.payment.installment = requestedInstallment;
        }

        const amountKurus = Math.round((Number(order.pricing?.total) || 0) * 100);
        if (amountKurus <= 0) return fail('Geçersiz tutar');

        const result = await PaynetService.charge({
            site: req.site,
            sessionId,
            tokenId,
            amount: amountKurus,
            referenceNo: order.orderNumber,
            installments: order.payment?.installment,
            tdsRequired: true
        });

        if (!result.success) {
            order.payment.status = 'failed';
            order.payment.gateway = 'paynet';
            order.payment.errorMessage = result.message;
            order.payment.errorCode = String(result.errorCode || '');
            order.status = 'payment_failed';
            await order.save();
            return fail(result.message, {
                siparis: order.orderNumber,
                tutar: order.pricing?.total,
                banka: result.bankMessage || '',
                paynet: result.paynetMessage || '',
                kod: result.errorCode || ''
            });
        }

        order.payment.status = 'paid';
        order.payment.gateway = 'paynet';
        order.payment.transactionId = result.transactionId;
        order.payment.authCode = result.authCode;
        order.payment.paidAt = new Date();
        order.payment.paymentGuid = undefined;
        if (result.maskedCardNo) {
            order.payment.cardInfo = {
                lastFourDigits: String(result.maskedCardNo).slice(-4),
                cardType: 'credit',
                bankName: result.bankName || ''
            };
        }
        order.status = 'confirmed';
        await order.save();

        try {
            const { syncOrderToDia } = require('../../../services/plugins/dia/DiaOrderService');
            await syncOrderToDia(order.toObject());
        } catch (e) {
            console.error('[b2b-payment] DIA aktarım hatası:', e.message);
        }
        queueOrderMail(order._id, { withReceipt: true });

        return res.redirect(sonucUrl({ durum: 'basarili', siparis: order.orderNumber, tutar: order.pricing?.total }));
    } catch (error) {
        console.error('[b2b-payment] Paynet return hatası:', error.message);
        return fail('Ödeme sırasında hata oluştu');
    }
});

router.post('/tekcekim/baslat', authMiddleware, async (req, res) => {
    try {
        const amountTL = Number(req.body?.amount);
        if (!Number.isFinite(amountTL) || amountTL <= 0) {
            return res.status(400).json({ success: false, message: 'Geçerli bir tutar giriniz.' });
        }
        const member = await WebMember.findOne({ _id: req.user._id, site: req.site })
            .select('diaCustomerKey diaCustomerCode').lean();
        if (!member?.diaCustomerKey) {
            return res.status(404).json({ success: false, message: 'Cari kaydınız bulunamadı.' });
        }
        const config = await PaynetService.getPublicConfig(req.site);
        if (!config) {
            return res.status(404).json({ success: false, message: 'Kredi kartı ödemesi şu anda kullanılamıyor.' });
        }
        const requestedInstallment = parseInt(req.body?.installment) || 0;
        const installment = requestedInstallment >= MIN_INSTALLMENT_COUNT ? requestedInstallment : 0;
        const reference = `TC${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
        const paymentGuid = crypto.randomBytes(24).toString('hex');
        const doc = await B2bPayment.create({
            site: req.site,
            memberId: req.user._id,
            diaCustomerKey: String(member.diaCustomerKey),
            cariKodu: member.diaCustomerCode || '',
            amountKurus: Math.round(amountTL * 100),
            reference,
            paymentGuid,
            gateway: 'paynet',
            type: installment ? 'taksit' : 'tekcekim',
            ...(installment ? { installment } : {}),
            status: 'pending'
        });
        return res.json({
            success: true,
            data: { paymentId: String(doc._id), pt: paymentGuid, reference, amountKurus: doc.amountKurus, installment, config }
        });
    } catch (error) {
        console.error('[b2b-payment] tekcekim baslat hatası:', error.message);
        return res.status(500).json({ success: false, message: 'Ödeme başlatılamadı.' });
    }
});

router.post('/tekcekim/return', async (req, res) => {
    const b = req.body || {};
    const sessionId = b.session_id;
    const tokenId = b.token_id;
    const paymentId = b.paymentId;
    const pt = b.pt;

    let payment = null;
    try { payment = paymentId ? await B2bPayment.findById(paymentId) : null; } catch (_) {  }

    const base = resolveReturnBase(payment?.site || req.site, b.returnOrigin);
    const sonucUrl = (params) => {
        const clean = {};
        Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') clean[k] = String(v); });
        return `${base}/odeme-sonuc?${new URLSearchParams(clean).toString()}`;
    };
    const fail = (msg, extra = {}) => res.redirect(sonucUrl({ durum: 'basarisiz', mesaj: msg || 'Ödeme tamamlanamadı', ...extra }));

    try {
        if (!payment || payment.paymentGuid !== pt) return fail('Ödeme doğrulanamadı');
        const tutarTL = (payment.amountKurus / 100).toFixed(2);
        if (payment.status === 'paid') {
            return res.redirect(sonucUrl({ durum: 'basarili', ref: payment.reference, tutar: tutarTL }));
        }
        if (!sessionId || !tokenId) {
            payment.status = 'failed';
            payment.errorMessage = '3D doğrulaması tamamlanmadı';
            await payment.save();
            return fail('3D doğrulaması tamamlanmadı', { ref: payment.reference, tutar: tutarTL, kod: '3DS_INCOMPLETE' });
        }

        const result = await PaynetService.charge({
            site: payment.site,
            sessionId,
            tokenId,
            amount: payment.amountKurus,
            referenceNo: payment.reference,
            installments: payment.installment,
            tdsRequired: true
        });

        if (!result.success) {
            payment.status = 'failed';
            payment.errorMessage = result.message;
            payment.errorCode = String(result.errorCode || '');
            await payment.save();
            return fail(result.message, {
                ref: payment.reference, tutar: tutarTL,
                banka: result.bankMessage || '', paynet: result.paynetMessage || '', kod: result.errorCode || ''
            });
        }

        payment.status = 'paid';
        payment.transactionId = result.transactionId;
        payment.authCode = result.authCode;
        payment.paidAt = new Date();
        payment.paymentGuid = undefined;
        if (result.maskedCardNo) {
            payment.cardInfo = { lastFourDigits: String(result.maskedCardNo).slice(-4), bankName: result.bankName || '' };
        }
        await payment.save();
        queuePaymentReceiptMail(payment._id);

        return res.redirect(sonucUrl({ durum: 'basarili', ref: payment.reference, tutar: tutarTL }));
    } catch (error) {
        console.error('[b2b-payment] tekcekim return hatası:', error.message);
        return fail('Ödeme sırasında hata oluştu');
    }
});

router.post('/netahsilat/borc-init', authMiddleware, async (req, res) => {
    try {
        const b = req.body || {};
        const { cardNumber, cardHolderName, expMonth, expYear, cvc, installment, vPosId } = b;
        const amountTL = Number(b.amount);
        if (!Number.isFinite(amountTL) || amountTL <= 0) {
            return res.status(400).json({ success: false, message: 'Geçerli bir tutar giriniz.' });
        }
        if (!cardNumber || !cardHolderName || !expMonth || !expYear || !cvc || !installment || !vPosId) {
            return res.status(400).json({ success: false, message: 'Eksik ödeme bilgisi.' });
        }
        if (!isNetahsilatInstallmentPos(vPosId)) {
            return res.status(400).json({ success: false, message: INSTALLMENT_PROVIDER_MISMATCH_MESSAGE });
        }
        const member = await WebMember.findOne({ _id: req.user._id, site: req.site })
            .select('diaCustomerKey diaCustomerCode firstName lastName email').lean();
        if (!member?.diaCustomerKey) {
            return res.status(404).json({ success: false, message: 'Cari kaydınız bulunamadı.' });
        }

        const reference = `TK${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
        const paymentGuid = crypto.randomBytes(24).toString('hex');
        const returnBase = resolveReturnBase(req.site, b.returnOrigin);
        const doc = await B2bPayment.create({
            site: req.site,
            memberId: req.user._id,
            diaCustomerKey: String(member.diaCustomerKey),
            cariKodu: member.diaCustomerCode || '',
            amountKurus: Math.round(amountTL * 100),
            reference,
            paymentGuid,
            gateway: 'netahsilat',
            type: 'taksit',
            status: 'pending',
            installment: parseInt(installment),
            returnOrigin: returnBase
        });

        const custName = `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.diaCustomerCode || 'Bayi';
        const result = await NetahsilatService.processPayment({
            orderNumber: reference,
            customerName: custName,
            site: req.site,
            amount: amountTL,
            installment: parseInt(installment),
            vPosId: parseInt(vPosId),
            cardNumber,
            cardHolderName,
            expMonth,
            expYear: String(expYear).length === 2 ? `20${expYear}` : String(expYear),
            cvc,
            email: member.email || 'bayi@lastikjantavm.com',
            returnUrl: `${resolveCallbackBase(req.site, returnBase)}/api/b2b/payment/netahsilat/borc-callback`
        });

        if (result.success && result.threeDUrl) {
            doc.referenceCode = result.referenceCode;
            doc.transactionId = result.transactionId;
            await doc.save();
            return res.json({ success: true, threeDUrl: result.threeDUrl });
        }
        doc.status = 'failed';
        doc.errorMessage = result.message;
        await doc.save();
        return res.status(400).json({ success: false, message: result.message || 'Ödeme başlatılamadı.' });
    } catch (error) {
        console.error('[b2b-payment] borc-init hatası:', error.message);
        return res.status(500).json({ success: false, message: 'Ödeme başlatılamadı.' });
    }
});

router.post('/netahsilat/borc-callback', async (req, res) => {
    const b = req.body || {};
    const paymentGuid = b.PaymentGuid || b.paymentguid;
    const status = String(b.status || b.Status || '').toUpperCase();
    const orderReference = b.orderreference || b.OrderReference || b.ClientReferenceCode;
    const bankMsg = b.errormessage || b.BankMessage || '';
    const errCode = b.errorcode || b.BankErrorCode || '';

    let payment = null;
    try { payment = orderReference ? await B2bPayment.findOne({ referenceCode: orderReference }) : null; } catch (_) {  }

    const base = payment?.returnOrigin || resolveReturnBase(payment?.site || req.site);
    const tutarTL = payment ? (payment.amountKurus / 100).toFixed(2) : '';
    const redir = (params) => {
        const clean = {};
        Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') clean[k] = String(v); });
        return res.redirect(`${base}/odeme-sonuc?${new URLSearchParams(clean).toString()}`);
    };

    try {
        if (!payment) {
            return res.redirect(`${base}/odeme-sonuc?durum=basarisiz&mesaj=${encodeURIComponent('Ödeme bulunamadı')}`);
        }
        if (payment.status === 'paid') {
            return redir({ durum: 'basarili', ref: payment.reference, tutar: tutarTL });
        }

        if (status === 'SUCCESS' && paymentGuid) {
            const commit = await NetahsilatService.commitPayment(paymentGuid, payment.site);
            if (commit.success) {
                payment.status = 'paid';
                payment.paidAt = new Date();
                payment.authCode = commit.authCode;
                payment.transactionId = commit.transactionId || payment.transactionId;
                payment.paymentGuid = undefined;
                await payment.save();
                queuePaymentReceiptMail(payment._id);
                return redir({ durum: 'basarili', ref: payment.reference, tutar: tutarTL });
            }
            payment.status = 'failed';
            payment.errorMessage = commit.message;
            await payment.save();
            return redir({ durum: 'basarisiz', ref: payment.reference, tutar: tutarTL, banka: commit.message, kod: commit.bankErrorCode });
        }

        payment.status = 'failed';
        payment.errorMessage = bankMsg || 'Ödeme tamamlanamadı';
        await payment.save();
        return redir({ durum: 'basarisiz', ref: payment.reference, tutar: tutarTL, banka: bankMsg, kod: errCode });
    } catch (error) {
        console.error('[b2b-payment] borc-callback hatası:', error.message);
        return res.redirect(`${base}/odeme-sonuc?durum=basarisiz&mesaj=${encodeURIComponent('Ödeme sırasında hata oluştu')}`);
    }
});

module.exports = router;
