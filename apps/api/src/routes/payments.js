const express = require('express');
const crypto = require('crypto');
const Order = require('../models/admin/catalog/Order');
const User = require('../models/User');
const axios = require('axios');
let logger;
try { logger = require('../utils/logger'); } catch { logger = console; }

const router = express.Router();

const NETAHSILAT_SHARED_SECRET = process.env.NETAHSILAT_SHARED_SECRET || 'change-this-in-prod';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3080';
const GATEWAY_BASE_URL = process.env.NETAHSILAT_GATEWAY_BASE_URL || 'https://netahsilatapi.compiturk.com.tr';

function safeJsonStringify(obj) {
  try { return JSON.stringify(obj); } catch { return ''; }
}

function verifySignature(req) {
  try {
    const signature = req.get('x-signature') || req.get('X-Signature');
    if (!signature) return false;
    // Not: En doğru doğrulama, gateway tarafından gönderilen ham body üstünden HMAC hesaplamaktır.
    // Express JSON parser ham gövdeyi tutmadığı için, burada JSON.stringify(req.body) üzerinden hesaplama yapıyoruz.
    // Gateway ile mutabık kalın: İmzayı JSON.stringify(req.body) + shared secret ile HMAC-SHA256 olarak üretin.
    const bodyStr = safeJsonStringify(req.body);
    const expected = crypto
      .createHmac('sha256', NETAHSILAT_SHARED_SECRET)
      .update(bodyStr)
      .digest('hex');
    // Zaman sabit karşılaştırma
    const a = Buffer.from(signature, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch (e) {
    return false;
  }
}

function mapStatusToOrder(status) {
  const s = (status || '').toString().toUpperCase();
  if (s === 'SUCCESS' || s === 'OK' || s === 'APPROVED') {
    return { paymentStatus: 'paid', orderStatus: 'confirmed' };
  }
  if (s === 'PENDING' || s === 'PROCESSING') {
    return { paymentStatus: 'pending', orderStatus: 'pending' };
  }
  return { paymentStatus: 'failed', orderStatus: 'payment_failed' };
}

// Netahsilat Webhook (Gateway -> Backend)
// POST /api/payments/netahsilat/webhook
router.post('/netahsilat/webhook', async (req, res) => {
  const requestId = `wh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  try {
    const isValid = verifySignature(req);
    if (!isValid) {
      logger.error('Netahsilat webhook signature invalid', { requestId });
      return res.status(401).json({ success: false, message: 'invalid signature' });
    }

    const {
      orderReference, // sipariş referansı (bizde orderNumber)
      status, // SUCCESS | FAIL | CANCEL | PENDING
      amount,
      currency,
      transactionId,
      authCode,
      last4,
      installment,
      extra
    } = req.body || {};

    if (!orderReference) {
      return res.status(400).json({ success: false, message: 'orderReference required' });
    }

    const order = await Order.findOne({ orderNumber: orderReference });
    if (!order) {
      logger.error('Netahsilat webhook order not found', { requestId, orderReference });
      return res.status(404).json({ success: false, message: 'order not found' });
    }

    // Idempotency: aynı SUCCESS tekrar gelirse no-op
    if (order.paymentStatus === 'paid' && (status || '').toUpperCase() === 'SUCCESS') {
      return res.json({ success: true, message: 'already processed' });
    }

    const mapped = mapStatusToOrder(status);

    // Order ödeme alanlarını güncelle
    order.payment = order.payment || {};
    order.payment.method = 'credit_card_3d';
    order.paymentStatus = mapped.paymentStatus;
    order.status = mapped.orderStatus;
    if (mapped.paymentStatus === 'paid') {
      order.payment.paidAt = new Date();
    }
    order.payment.transaction = {
      ...(order.payment.transaction || {}),
      status: mapped.paymentStatus === 'paid' ? 'success' : (mapped.paymentStatus === 'pending' ? 'pending' : 'failed'),
      paymentId: transactionId || order.payment?.transaction?.paymentId,
      conversationId: order.payment?.transaction?.conversationId || null,
      locale: 'tr',
      systemTime: new Date()
    };
    order.payment.gateway = {
      name: 'netahsilat',
      transactionId: transactionId || null,
      authCode: authCode || null,
      cardLast4: last4 || null,
      amount: amount || null,
      currency: currency || 'TRY',
      installment: installment || 1,
      raw: req.body
    };
    order.addToHistory(order.status, `Netahsilat: ${status} (${amount || ''} ${currency || ''})`);

    await order.save();

    // Ödeme başarıysa: kullanıcının sepetini temizle (opsiyonel, biz daha önce yaptık)
    if (mapped.paymentStatus === 'paid') {
      try {
        const user = await User.findById(order.userId);
        if (user) {
          user.activeCart = {
            items: [], totalItems: 0, totalPrice: 0, currency: 'TRY', lastUpdated: new Date()
          };
          await user.save();
        }
      } catch { }
    }

    logger.info ? logger.info('Netahsilat webhook processed', { requestId, orderReference, mapped }) : null;
    return res.json({ success: true });
  } catch (error) {
    logger.error('Netahsilat webhook error', { message: error.message, stack: error.stack });
    return res.status(500).json({ success: false, message: 'internal error' });
  }
});

// POS listesi (Gateway -> Backend proxy)
// GET /api/payments/netahsilat/pos
router.get('/netahsilat/pos', async (req, res) => {
  const requestId = `pos_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  try {
    logger.info ? logger.info('Netahsilat POS list request', { requestId }) : null;
    const gwRes = await axios.get(`${GATEWAY_BASE_URL}/api/netahsilat/pos`, { timeout: 15000 });
    logger.info ? logger.info('Netahsilat POS list response', { requestId, status: gwRes.status, length: Array.isArray(gwRes.data) ? gwRes.data.length : undefined }) : null;
    return res.status(gwRes.status).json(gwRes.data);
  } catch (error) {
    logger.error('Netahsilat POS list error', { message: error.message, status: error.response?.status });
    return res.status(500).json({ success: false, message: 'POS listesi alınamadı' });
  }
});

// BIN'e göre POS (Gateway -> Backend proxy)
// GET /api/payments/netahsilat/pos/bin/:bin
router.get('/netahsilat/pos/bin/:bin', async (req, res) => {
  const requestId = `bin_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const { bin } = req.params || {};
  try {
    if (!bin || !/^\d{6}$/.test(bin)) {
      return res.status(400).json({ success: false, message: 'Geçerli 6 haneli BIN gereklidir' });
    }
    logger.info ? logger.info('Netahsilat BIN POS request', { requestId, bin }) : null;
    const gwRes = await axios.get(`${GATEWAY_BASE_URL}/api/netahsilat/pos/bin/${bin}`, { timeout: 15000 });
    logger.info ? logger.info('Netahsilat BIN POS response', { requestId, bin, status: gwRes.status, data: gwRes.data }) : null;
    return res.status(gwRes.status).json(gwRes.data);
  } catch (error) {
    logger.error('Netahsilat BIN POS error', { bin, message: error.message, status: error.response?.status, data: error.response?.data });
    return res.status(500).json({ success: false, message: 'BIN POS bilgisi alınamadı' });
  }
});

router.get('/netahsilat/return', async (req, res) => {
  try {
    const orderRef = req.query.orderRef || req.query.OrderReference || '';
    const status = req.query.status || req.query.Status || '';
    const error = req.query.error || req.query.ErrorMessage || '';
    const redirectUrl = `${FRONTEND_URL}/payment-result?orderRef=${encodeURIComponent(orderRef)}&status=${encodeURIComponent(status)}&error=${encodeURIComponent(error)}`;
    return res.redirect(302, redirectUrl);
  } catch (error) {
    return res.redirect(302, `${FRONTEND_URL}/payment-result?status=FAIL`);
  }
});
// 3D başlat (Backend -> Gateway)
// POST /api/payments/netahsilat/3d-init
// body: { orderId, cardNumber, cardHolderName, expireMonth, expireYear, cvc, installment }
router.post('/netahsilat/3d-init', async (req, res) => {
  const requestId = `init_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  try {
    const { orderId, cardNumber, cardHolderName, expireMonth, expireYear, cvc, installment = 1, vPosId } = req.body || {};
    if (!orderId) return res.status(400).json({ success: false, message: 'orderId gereklidir' });

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Sipariş bulunamadı' });

    const masked = (num) => (typeof num === 'string' ? `${num.slice(0, 6)}******${num.slice(-4)}` : '');
    const bin = (cardNumber || '').replace(/\s/g, '').slice(0, 6);
    logger.info ? logger.info('Netahsilat 3D init received', { requestId, orderId, bin, cardMasked: masked(cardNumber), expireMonth, expireYear, installment, vPosId }) : null;

    // Kullanıcı bilgileri (e-posta/telefon)
    let customerEmail = undefined;
    let customerPhone = undefined;
    try {
      const user = await User.findById(order.userId).select('email profile.phone');
      customerEmail = user?.email || undefined;
      customerPhone = user?.profile?.phone || undefined;
    } catch { }

    // Kart tarihi normalize: Ay sayı, Yıl 4 haneli
    // IP ve tarih normalizasyonu
    const forwardedFor = (req.headers['x-forwarded-for'] && String(req.headers['x-forwarded-for']).split(',')[0].trim()) || null;
    const clientIp = forwardedFor || req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || '127.0.0.1';

    const expMonthStr = String(expireMonth || '').padStart(2, '0');
    const expYearRaw = String(expireYear || '');
    const expYear2 = expYearRaw.length === 2 ? expYearRaw : expYearRaw.slice(-2);
    const expYear4 = expYearRaw.length === 4 ? expYearRaw : `20${expYear2}`;

    // BIN'den uygun POS seçimi (vPosId gelmediyse)
    let selectedVPosId = vPosId || null;
    if (!selectedVPosId && bin && bin.length === 6) {
      try {
        const binRes = await axios.get(`${GATEWAY_BASE_URL}/api/netahsilat/pos/bin/${bin}`, { timeout: 10000 });
        const binData = binRes.data || {};
        const list = binData.virtualPoses || binData.VirtualPoses || binData.poses || binData.Poses || [];
        // İzinli taksitleri hem explicit installments hem de comissionRates üzerinden topla
        const extractInstallments = (p) => {
          const out = new Set();
          const inst = p.installments || p.Installments || [];
          for (const x of Array.isArray(inst) ? inst : []) {
            const v = x?.count ?? x?.Count ?? x?.installment ?? x?.Installment;
            if (v) out.add(Number(v));
          }
          const rates = p.comissionRates || p.ComissionRates || p.commissionRates || p.CommissionRates || [];
          for (const r of Array.isArray(rates) ? rates : []) {
            const v = r?.count ?? r?.Count ?? r?.installment ?? r?.Installment ?? r?.term ?? r?.Term;
            if (v) out.add(Number(v));
          }
          if (out.size === 0) {
            // hiçbir bilgi yoksa en az tek çekim varsay
            out.add(1);
          }
          return Array.from(out);
        };
        const isActive = (p) => (p.isActive ?? p.IsActive ?? p.active ?? p.Active ?? true) === true;
        const getId = (p) => p.vPosId ?? p.virtualPosId ?? p.id ?? p.Id ?? null;
        const desired = Number(installment) || 1;
        const withDesired = list.filter(p => isActive(p) && extractInstallments(p).includes(desired));
        const withOne = list.filter(p => isActive(p) && extractInstallments(p).includes(1));
        const candidate = withDesired[0] || withOne[0] || list.find(p => isActive(p));
        selectedVPosId = candidate ? getId(candidate) : null;
        logger.info ? logger.info('BIN POS selection', { requestId, bin, desiredInstallment: desired, selectedVPosId }) : null;
      } catch (e) {
        logger.info ? logger.info('BIN POS selection failed', { requestId, bin, error: e.message }) : null;
      }
    }

    // Gateway ile maksimum uyumluluk için hem camelCase hem PascalCase alanları gönder
    const payload = {
      // Kimlik/Referans
      orderReference: order.orderNumber,
      OrderReference: order.orderNumber,
      clientReferenceCode: order.orderNumber,
      ClientReferenceCode: order.orderNumber,
      // Tutar/Para birimi
      amount: order.pricing?.total,
      Amount: order.pricing?.total,
      currency: order.pricing?.currency || 'TRY',
      Currency: order.pricing?.currency || 'TRY',
      // 3D
      use3d: true,
      Use3D: true,
      use3DSecure: true,
      Use3DSecure: true,
      installment,
      Installment: installment,
      // POS seçimi (opsiyonel)
      ...(selectedVPosId ? { vPosId: selectedVPosId, virtualPosId: selectedVPosId, VirtualPosId: selectedVPosId } : {}),
      // Kart bilgileri
      card: { number: cardNumber, holder: cardHolderName, expireMonth: expMonthStr, expireYear: expYear4, cvc },
      creditCard: { cardNumber, cardHolderName, expMonth: expMonthStr, expYear: expYear2, cvcNumber: cvc },
      CreditCard: { CardNumber: cardNumber, CardHolderName: cardHolderName, ExpMonth: expMonthStr, ExpYear: expYear4, CvcNumber: cvc },
      // Müşteri bilgileri (opsiyonel)
      email: customerEmail,
      Email: customerEmail,
      description: `Order ${order.orderNumber}`,
      Description: `Order ${order.orderNumber}`,
      customer: { email: customerEmail, phone: customerPhone },
      // IP ve dönüşler
      customerIp: clientIp,
      CustomerIp: clientIp,

      returnUrl: process.env.NETAHSILAT_RETURN_URL || `${process.env.BACKEND_URL || 'http://localhost:3082'}/api/payments/netahsilat/return`,
      ReturnUrl: process.env.NETAHSILAT_RETURN_URL || `${process.env.BACKEND_URL || 'http://localhost:3082'}/api/payments/netahsilat/return`
    };

    const gwRes = await axios.post(`${GATEWAY_BASE_URL}/api/netahsilat/process`, payload, { timeout: 30000, headers: { 'Content-Type': 'application/json' } });
    const gwData = gwRes.data || {};
    const gwKeys = typeof gwData === 'object' && gwData ? Object.keys(gwData) : [];
    logger.info ? logger.info('Netahsilat 3D init gateway response', { requestId, status: gwRes.status, keys: gwKeys, sample: { isSuccess: gwData.isSuccess ?? gwData.IsSuccess, bankMessage: gwData.bankMessage ?? gwData.BankMessage, internalMessage: gwData.internalMessage ?? gwData.InternalMessage } }) : null;

    // Önce 3D yönlendirme/HTML var mı diye kontrol et (bazı gateway'lerde isSuccess=false iken 3D başlatılır)
    let htmlContent = gwData.ThreeDSHtmlContent || gwData.threeDSHtmlContent || gwData.ThreeDSHtmlContent;
    let redirectUrl = gwData.ThreeDUrl || gwData.threeDUrl || gwData.redirectUrl || gwData.ThreeDUrl;
    if (htmlContent) {
      return res.json({ success: true, data: { threeDSHtmlContent: htmlContent, gatewayRef: gwData.ReferenceCode || gwData.referenceCode || gwData.reference } });
    }
    if (redirectUrl) {
      return res.json({ success: true, data: { redirectUrl, gatewayRef: gwData.ReferenceCode || gwData.referenceCode || gwData.reference } });
    }

    // Başarısızsa mesajı değerlendir ve fallback dene
    if (gwRes.status >= 400 || gwData.success === false || gwData.isSuccess === false || gwData.IsSuccess === false) {
      const msg = gwData.message || gwData.bankMessage || gwData.internalMessage || gwData.Message || gwData.BankMessage || gwData.InternalMessage || 'Gateway hatası';
      const msgLower = String(msg).toLowerCase();
      const needInstallmentFallback = msgLower.includes('taksit') || msgLower.includes('installment');
      if (needInstallmentFallback) {
        // Tek çekim ve POS belirtmeden yeniden dene
        const fallback = { ...payload, installment: 1, Installment: 1 };
        delete fallback.vPosId; delete fallback.virtualPosId; delete fallback.VirtualPosId;
        logger.info ? logger.info('Netahsilat 3D init fallback (single installment, no vPos)', { requestId }) : null;
        const fbRes = await axios.post(`${GATEWAY_BASE_URL}/api/netahsilat/process`, fallback, { timeout: 30000, headers: { 'Content-Type': 'application/json' } });
        const fbData = fbRes.data || {};
        const fbKeys = typeof fbData === 'object' && fbData ? Object.keys(fbData) : [];

        // Önce fallback yanıtında yönlendirme/HTML var mı?
        htmlContent = fbData.ThreeDSHtmlContent || fbData.threeDSHtmlContent || fbData.ThreeDSHtmlContent;
        redirectUrl = fbData.ThreeDUrl || fbData.threeDUrl || fbData.redirectUrl || fbData.ThreeDUrl;
        if (htmlContent) {
          return res.json({ success: true, data: { threeDSHtmlContent: htmlContent, gatewayRef: fbData.ReferenceCode || fbData.referenceCode || fbData.reference } });
        }
        if (redirectUrl) {
          return res.json({ success: true, data: { redirectUrl, gatewayRef: fbData.ReferenceCode || fbData.referenceCode || fbData.reference } });
        }

        const fbMsg = fbData.message || fbData.bankMessage || fbData.internalMessage || fbData.Message || fbData.BankMessage || fbData.InternalMessage || msg;
        if (process.env.NODE_ENV !== 'production') {
          return res.status(400).json({ success: false, message: fbMsg, details: { fallbackTried: true, keys: fbKeys, raw: fbData } });
        }
        return res.status(400).json({ success: false, message: fbMsg });
      }

      // Geliştirme ortamında ham yanıtı da dön (debug için)
      if (process.env.NODE_ENV !== 'production') {
        return res.status(400).json({ success: false, message: msg, details: { keys: gwKeys, raw: gwData } });
      }
      return res.status(400).json({ success: false, message: msg });
    }

    if (gwData.formAction && (gwData.formFields || gwData.fields)) {
      const fields = gwData.formFields || gwData.fields;
      const inputs = Object.keys(fields).map(k => `<input type=\"hidden\" name=\"${k}\" value=\"${String(fields[k]).replace(/"/g, '&quot;')}\"/>`).join('');
      const html = `<!DOCTYPE html><html><head><meta charset=\"utf-8\"/><title>3D Secure</title></head><body onload=\"document.forms[0].submit()\"><form method=\"POST\" action=\"${gwData.formAction}\">${inputs}<noscript><button type=\"submit\">Devam</button></noscript></form></body></html>`;
      return res.json({ success: true, data: { threeDSHtmlContent: html, gatewayRef: gwData.reference } });
    }
    // Beklenen alanlar yoksa hata döndür
    return res.status(400).json({ success: false, message: 'Gateway 3D HTML veya yönlendirme bilgisi döndürmedi' });
  } catch (error) {
    logger.error('Netahsilat 3D init error', { requestId, message: error.message, stack: error.stack, status: error.response?.status, data: error.response?.data });
    return res.status(500).json({ success: false, message: '3D başlatma hatası', error: error.message });
  }
});

module.exports = router;


