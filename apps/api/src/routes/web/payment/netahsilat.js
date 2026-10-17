/**
 * Netahsilat Ödeme Route'ları
 * /api/web/payments/netahsilat
 */

const express = require('express');
const router = express.Router();
const NetahsilatService = require('../../../services/plugins/payment/NetahsilatService');
const WebOrder = require('../../../models/web/order/WebOrder');
const { clearOrderCart } = require('../../../utils/orderCart');
const { sendTemplateMail } = require('../../../services/plugins/mail/mailOrchestrator');

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://alastik.com';
// Bankadan dönüşte müşteri SİPARİŞİN sitesine gönderilir (LJA siparişi alastik.com'a düşmesin).
// Sipariş bulunamazsa (site bilinmiyorsa) varsayılan vitrin adresi kullanılır.
const { getSiteUrl } = require('../../../config/sites');
const frontendUrlFor = (site) => getSiteUrl(site) || FRONTEND_URL;

// BIN ile kart bilgisi ve taksit seçenekleri
router.get('/bin/:bin', async (req, res) => {
    try {
        const { bin } = req.params;

        if (!bin || bin.length !== 6 || !/^\d+$/.test(bin)) {
            return res.status(400).json({ success: false, message: 'Geçerli 6 haneli BIN gerekli' });
        }

        const result = await NetahsilatService.getPosByBin(bin, req.site);
        return res.json(result);
    } catch (error) {
        console.error('BIN sorgulama hatası:', error);
        return res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
});

// 3D Secure başlat
router.post('/3d-init', async (req, res) => {
    try {
        const {
            orderId,
            cardNumber,
            cardHolderName,
            expMonth,
            expYear,
            cvc,
            installment,
            vPosId,
            email
        } = req.body;

        console.log('3D Init Request:', {
            orderId,
            cardNumber: cardNumber ? cardNumber.substring(0, 6) + '******' : 'YOK',
            cardHolderName,
            expMonth,
            expYear,
            installment,
            vPosId,
            email
        });

        if (!orderId || !cardNumber || !cardHolderName || !expMonth || !expYear || !cvc || !installment || !vPosId) {
            return res.status(400).json({ success: false, message: 'Eksik bilgi' });
        }

        const order = await WebOrder.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Sipariş bulunamadı' });
        }

        console.log('Sipariş bulundu:', order.orderNumber, 'Tutar:', order.pricing.total);

        // ProcessPayment ile 3D başlat
        const result = await NetahsilatService.processPayment({
            orderNumber: order.orderNumber,
            customerName: (order.customerName || order.billingSnapshot?.fullName || order.shippingSnapshot?.fullName || order.guestShippingAddress?.fullName || '').trim(),
            site: order.site,
            amount: order.pricing.total,
            installment: parseInt(installment),
            vPosId: parseInt(vPosId),
            cardNumber,
            cardHolderName,
            expMonth,
            expYear: expYear.length === 2 ? '20' + expYear : expYear,
            cvc,
            email: email || order.customerEmail || 'musteri@alastik.com',
            returnUrl: 'https://api.alastik.com/api/web/payments/netahsilat/3d-callback'
        });

        console.log('ProcessPayment Result:', result);

        if (result.success && result.threeDUrl) {
            // Sipariş durumunu güncelle
            order.payment = order.payment || {};
            order.payment.method = 'credit_card_3d';
            order.payment.gateway = 'netahsilat';
            order.payment.installment = parseInt(installment);
            order.payment.referenceCode = result.referenceCode;
            order.payment.transactionId = result.transactionId;
            order.payment.status = 'pending';
            await order.save();

            return res.json({
                success: true,
                threeDUrl: result.threeDUrl,
                referenceCode: result.referenceCode
            });
        }

        return res.status(400).json(result);
    } catch (error) {
        console.error('3D init hatası:', error);
        return res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
});


// 3D Callback - Bankadan dönüş (POST)
router.post('/3d-callback', async (req, res) => {
    let siteUrl = FRONTEND_URL;
    try {
        console.log('3D Callback Body:', req.body);

        // Netahsilat parametreleri (küçük/büyük harf karışık)
        const paymentGuid = req.body.PaymentGuid || req.body.paymentguid;
        const status = req.body.status || req.body.Status;
        const orderReference = req.body.orderreference || req.body.OrderReference;
        const errorMessage = req.body.errormessage || req.body.BankMessage || '';
        const errorCode = req.body.errorcode || req.body.BankErrorCode || '';

        // Aynı 3D dönüşü tekrar gelirse (tarayıcıda geri / yenile ile form yeniden gönderilir) ödeme zaten alınmıştır:
        // CommitPayment ikinci kez başarısız döner ve ödenmiş sipariş yanlışlıkla "başarısız" olurdu — durum değiştirilmez
        if (orderReference) {
            const alreadyPaid = await WebOrder.findOne({ 'payment.referenceCode': orderReference, 'payment.status': 'paid' })
                .select('site orderNumber').lean();
            if (alreadyPaid) {
                console.log('[netahsilat:3d-callback] Tekrarlanan dönüş, sipariş zaten ödenmiş:', alreadyPaid.orderNumber);
                return res.redirect(`${frontendUrlFor(alreadyPaid.site)}/siparis-basarili?order=${alreadyPaid.orderNumber}`);
            }
        }

        // İşlem başarılıysa CommitPayment yap
        if (status === 'SUCCESS' && paymentGuid) {
            const commitResult = await NetahsilatService.commitPayment(paymentGuid, req.site);
            console.log('CommitPayment Result:', commitResult);

            if (commitResult.success) {
                // Siparişi bul ve güncelle
                const order = await WebOrder.findOne({ 'payment.referenceCode': orderReference });
                if (order) {
                    siteUrl = frontendUrlFor(order.site);
                    order.payment.status = 'paid';
                    order.status = 'confirmed';
                    order.payment.method = 'netahsilat_installment';
                    order.payment.paidAt = new Date();
                    order.payment.authCode = commitResult.authCode;
                    order.payment.paymentGuid = paymentGuid;
                    await order.save();
                    await clearOrderCart(order, 'netahsilat-success');

                    // Kredi kartı ödemesi onaylandı → DIA'ya otomatik aktar (arka planda)
                    const { syncOrderToDiaBackground } = require('../../../services/plugins/dia/DiaOrderService');
                    syncOrderToDiaBackground(order, 'netahsilat-3d');

                    // Ödeme başarılı → mail tetikle (fire-and-forget)
                    if (order.payment.status === 'paid' && !order.payment.mailSent) {
                        order.payment.mailSent = true;
                        await order.save();

                        const customerMail = order.isGuest
                            ? (order.guestBillingAddress?.email || order.customerEmail)
                            : (order.memberSnapshot?.email || order.customerEmail);

                        sendTemplateMail({
                            templateKey: order.isGuest ? 'uyeliksiz_alisveris_sablonu' : 'siparis_sablonu',
                            context: { orderId: order._id.toString() },
                            to: customerMail,
                            alsoSendToAdmin: true,
                            adminPurpose: 'order',
                            site: order.site
                        }).then((mailResult) => {
                            if (!mailResult.success) {
                                console.warn('[netahsilat:3d-callback] Mail gönderilemedi:', order.orderNumber, mailResult.errors);
                            } else {
                                console.log('[netahsilat:3d-callback] Mail gönderildi:', order.orderNumber);
                            }
                        }).catch((err) => {
                            console.error('[netahsilat:3d-callback] Mail hatası:', order.orderNumber, err.message);
                        });
                    }

                    return res.redirect(`${siteUrl}/siparis-basarili?order=${order.orderNumber}`);
                }

                return res.redirect(`${FRONTEND_URL}/siparis-basarili`);
            }
        }

        // Başarısız işlem
        const order = await WebOrder.findOne({ 'payment.referenceCode': orderReference });
        if (order) {
            siteUrl = frontendUrlFor(order.site);
            order.payment.status = 'failed';
            order.status = 'payment_failed';
            order.payment.errorMessage = errorMessage || 'Ödeme başarısız';
            order.payment.errorCode = errorCode;
            await order.save();
            await clearOrderCart(order, 'netahsilat-failed');
        }

        return res.redirect(`${siteUrl}/odeme/basarisiz?error=${encodeURIComponent(errorMessage || 'Ödeme başarısız')}`);
    } catch (error) {
        console.error('3D callback hatası:', error);
        return res.redirect(`${siteUrl}/odeme/basarisiz?error=${encodeURIComponent('Sistem hatası')}`);
    }
});

// 3D Commit - Frontend'den çağrılacak (JSON response)
router.post('/3d-commit', async (req, res) => {
    try {
        const { paymentGuid, orderReference } = req.body;

        if (!paymentGuid) {
            return res.status(400).json({ success: false, message: 'PaymentGuid gerekli' });
        }

        // CommitPayment çağır
        const commitResult = await NetahsilatService.commitPayment(paymentGuid, req.site);

        if (commitResult.success) {
            // Siparişi bul ve güncelle
            const order = await WebOrder.findOne({
                $or: [
                    { 'payment.referenceCode': orderReference },
                    { 'payment.transactionId': { $exists: true } }
                ]
            }).sort({ createdAt: -1 });

            if (order) {
                order.payment.status = 'paid';
                order.status = 'confirmed';
                order.payment.method = 'netahsilat_installment';
                order.payment.paidAt = new Date();
                order.payment.authCode = commitResult.authCode;
                order.payment.paymentGuid = paymentGuid;
                await order.save();
                // Bu uçtaki sipariş araması geniştir; yalnız referans birebir eşleşiyorsa sepet silinir
                if (orderReference && order.payment.referenceCode === orderReference) await clearOrderCart(order, 'netahsilat-commit-success');

                // Kredi kartı ödemesi onaylandı → DIA'ya otomatik aktar (arka planda)
                const { syncOrderToDiaBackground } = require('../../../services/plugins/dia/DiaOrderService');
                syncOrderToDiaBackground(order, 'netahsilat-callback');

                // Ödeme başarılı → mail tetikle (fire-and-forget)
                if (order.payment.status === 'paid' && !order.payment.mailSent) {
                    order.payment.mailSent = true;
                    await order.save();

                    const customerMail = order.isGuest
                        ? (order.guestBillingAddress?.email || order.customerEmail)
                        : (order.memberSnapshot?.email || order.customerEmail);

                    sendTemplateMail({
                        templateKey: order.isGuest ? 'uyeliksiz_alisveris_sablonu' : 'siparis_sablonu',
                        context: { orderId: order._id.toString() },
                        to: customerMail,
                        alsoSendToAdmin: true,
                        adminPurpose: 'order',
                        site: order.site
                    }).then((mailResult) => {
                        if (!mailResult.success) {
                            console.warn('[netahsilat:3d-commit] Mail gönderilemedi:', order.orderNumber, mailResult.errors);
                        } else {
                            console.log('[netahsilat:3d-commit] Mail gönderildi:', order.orderNumber);
                        }
                    }).catch((err) => {
                        console.error('[netahsilat:3d-commit] Mail hatası:', order.orderNumber, err.message);
                    });
                }

                return res.json({
                    success: true,
                    orderNumber: order.orderNumber,
                    message: 'Ödeme başarılı'
                });
            }

            return res.json({
                success: true,
                message: 'Ödeme başarılı fakat sipariş bulunamadı'
            });
        }

        // Başarısız
        const order = await WebOrder.findOne({ 'payment.referenceCode': orderReference });
        if (order) {
            order.payment.status = 'failed';
            order.status = 'payment_failed';
            order.payment.errorMessage = commitResult.message;
            await order.save();
            await clearOrderCart(order, 'netahsilat-commit-failed');
        }

        return res.json({
            success: false,
            message: commitResult.message || 'Ödeme tamamlanamadı'
        });

    } catch (error) {
        console.error('3D commit hatası:', error);
        return res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
});

// İşlem sorgula
router.get('/transaction/:orderNumber', async (req, res) => {
    try {
        const { orderNumber } = req.params;
        const result = await NetahsilatService.getTransaction(orderNumber, req.site);
        return res.json(result);
    } catch (error) {
        console.error('Transaction sorgulama hatası:', error);
        return res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
});


module.exports = router;