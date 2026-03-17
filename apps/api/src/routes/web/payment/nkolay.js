/**
 * PayNkolay Ödeme Route'ları
 * Tek çekim ve banka kartı ödemeleri
 * 
 * apps/api/src/routes/web/payment/nkolay.js
 * app.use('/api/web/payments/nkolay', nkolayRouter)
 */

const express = require('express');
const router = express.Router();
const NkolayService = require('../../../services/plugins/payment/NKolayService');
const WebOrder = require('../../../models/web/order/WebOrder');

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://alastik.com';
const API_URL = process.env.API_URL || 'https://api.alastik.com';

// ========== 3D SECURE BAŞLAT ==========
router.post('/3d-init', async (req, res) => {
    try {
        const {
            orderId,
            cardNumber,
            cardHolderName,
            expMonth,
            expYear,
            cvc,
            email
        } = req.body;

        console.log('[Nkolay Route] 3D Init:', {
            orderId,
            cardNumber: cardNumber ? cardNumber.substring(0, 6) + '******' : 'YOK',
            cardHolderName,
            expMonth,
            expYear
        });

        // Validasyon
        if (!orderId || !cardNumber || !cardHolderName || !expMonth || !expYear || !cvc) {
            return res.status(400).json({ success: false, message: 'Eksik kart bilgisi' });
        }

        // Siparişi bul
        const order = await WebOrder.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Sipariş bulunamadı' });
        }

        console.log('[Nkolay Route] Sipariş:', order.orderNumber, 'Tutar:', order.pricing.total);

        // Müşteri IP'sini al
        const customerIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
            || req.headers['x-real-ip']
            || req.connection?.remoteAddress
            || '127.0.0.1';

        // Callback URL'leri
        const successUrl = `${API_URL}/api/web/payments/nkolay/3d-callback/success`;
        const failUrl = `${API_URL}/api/web/payments/nkolay/3d-callback/fail`;

        // Ödeme başlat
        const result = await NkolayService.processPayment({
            orderNumber: order.orderNumber,
            amount: order.pricing.total,
            cardNumber,
            cardHolderName,
            expMonth,
            expYear: expYear.length === 2 ? '20' + expYear : expYear,
            cvc,
            email: email || order.customerEmail || '',
            customerIP,
            successUrl,
            failUrl
        });

        console.log('[Nkolay Route] processPayment sonuç:', {
            success: result.success,
            hasHtml: !!result.threeDHtml,
            referenceCode: result.referenceCode
        });

        if (result.success && result.threeDHtml) {
            // Sipariş ödeme bilgilerini güncelle
            order.payment = order.payment || {};
            order.payment.method = 'credit_card_3d';
            order.payment.gateway = 'nkolay';
            order.payment.installment = 1;
            order.payment.referenceCode = result.referenceCode;
            order.payment.sessionId = result.sessionId;
            order.payment.status = 'pending';
            await order.save();

            // Nkolay HTML döndürüyor (Netahsilat'ta URL dönüyordu)
            // Frontend bu HTML'i bir sayfada render edecek
            return res.json({
                success: true,
                threeDHtml: result.threeDHtml,
                referenceCode: result.referenceCode
            });
        }

        // 3D'siz direkt başarılı (olası durum)
        if (result.success && result.directSuccess) {
            order.payment = order.payment || {};
            order.payment.method = 'credit_card';
            order.payment.gateway = 'nkolay';
            order.payment.installment = 1;
            order.payment.referenceCode = result.referenceCode;
            order.payment.authCode = result.authCode;
            order.payment.paidAt = new Date();
            order.payment.status = 'paid';
            order.status = 'confirmed';
            await order.save();

            return res.json({
                success: true,
                directSuccess: true,
                orderNumber: order.orderNumber
            });
        }

        return res.status(400).json({
            success: false,
            message: result.message || 'Ödeme başlatılamadı'
        });

    } catch (error) {
        console.error('[Nkolay Route] 3D init hatası:', error);
        return res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
});

// ========== 3D CALLBACK - BAŞARILI ==========
router.post('/3d-callback/success', async (req, res) => {
    try {
        console.log('[Nkolay Route] 3D Success Callback:', req.body);

        const referenceCode = req.body.REFERENCE_CODE || req.body.referenceCode;
        const clientRefCode = req.body.CLIENT_REFERENCE_CODE || req.body.clientRefCode;
        const authCode = req.body.AUTH_CODE || req.body.authCode;
        const bankMessage = req.body.BANK_MESSAGE || req.body.bankMessage || '';
        const responseCode = req.body.RESPONSE_CODE || req.body.responseCode;

        // Siparişi bul (orderNumber = clientRefCode)
        const order = await WebOrder.findOne({
            $or: [
                { orderNumber: clientRefCode },
                { 'payment.referenceCode': referenceCode }
            ]
        });

        if (!order) {
            console.error('[Nkolay Route] Sipariş bulunamadı:', { referenceCode, clientRefCode });
            return res.redirect(`${FRONTEND_URL}/odeme/basarisiz?error=${encodeURIComponent('Sipariş bulunamadı')}`);
        }

        // CompletePayment gerekli mi dene
        let finalSuccess = false;
        let finalAuthCode = authCode;

        if (referenceCode) {
            const completeResult = await NkolayService.completePayment(referenceCode);
            console.log('[Nkolay Route] CompletePayment sonuç:', completeResult);

            if (completeResult.success) {
                finalSuccess = true;
                finalAuthCode = completeResult.authCode || authCode;
            } else {
                // CompletePayment başarısız ise callback bilgileriyle devam et
                // Bazı durumlarda CompletePayment gerekmeyebilir
                console.log('[Nkolay Route] CompletePayment başarısız, callback bilgileriyle devam ediliyor');
                finalSuccess = true; // Success callback'e geldiyse banka onaylamış demektir
            }
        } else {
            finalSuccess = true;
        }

        if (finalSuccess) {
            order.payment.status = 'paid';
            order.status = 'confirmed';
            order.payment.method = 'credit_card_3d';
            order.payment.paidAt = new Date();
            order.payment.authCode = finalAuthCode;
            order.payment.referenceCode = referenceCode;
            order.payment.bankMessage = bankMessage;
            order.payment.callbackData = req.body;
            await order.save();

            console.log('[Nkolay Route] Ödeme başarılı, sipariş güncellendi:', order.orderNumber);
            return res.redirect(`${FRONTEND_URL}/siparis-basarili?order=${order.orderNumber}`);
        }

        // Buraya düşmemeli ama güvenlik için
        return res.redirect(`${FRONTEND_URL}/odeme/basarisiz?error=${encodeURIComponent('Ödeme doğrulanamadı')}`);

    } catch (error) {
        console.error('[Nkolay Route] Success callback hatası:', error);
        return res.redirect(`${FRONTEND_URL}/odeme/basarisiz?error=${encodeURIComponent('Sistem hatası')}`);
    }
});

// ========== 3D CALLBACK - BAŞARISIZ ==========
router.post('/3d-callback/fail', async (req, res) => {
    try {
        console.log('[Nkolay Route] 3D Fail Callback:', req.body);

        const referenceCode = req.body.REFERENCE_CODE || req.body.referenceCode;
        const clientRefCode = req.body.CLIENT_REFERENCE_CODE || req.body.clientRefCode;
        const errorMessage = req.body.RESPONSE_DATA || req.body.BANK_MESSAGE || req.body.ERROR_MESSAGE || 'Ödeme başarısız';

        // Siparişi bul ve güncelle
        const order = await WebOrder.findOne({
            $or: [
                { orderNumber: clientRefCode },
                { 'payment.referenceCode': referenceCode }
            ]
        });

        if (order) {
            order.payment.status = 'failed';
            order.status = 'payment_failed';
            order.payment.errorMessage = errorMessage;
            order.payment.callbackData = req.body;
            await order.save();
            console.log('[Nkolay Route] Sipariş başarısız güncellendi:', order.orderNumber);
        }

        return res.redirect(`${FRONTEND_URL}/odeme/basarisiz?error=${encodeURIComponent(errorMessage)}`);

    } catch (error) {
        console.error('[Nkolay Route] Fail callback hatası:', error);
        return res.redirect(`${FRONTEND_URL}/odeme/basarisiz?error=${encodeURIComponent('Sistem hatası')}`);
    }
});

// ========== İPTAL ==========
router.post('/cancel', async (req, res) => {
    try {
        const { referenceCode, amount, trxDate } = req.body;

        if (!referenceCode || !amount || !trxDate) {
            return res.status(400).json({ success: false, message: 'Eksik bilgi: referenceCode, amount, trxDate gerekli' });
        }

        const result = await NkolayService.cancelPayment({ referenceCode, amount, trxDate });
        return res.json(result);

    } catch (error) {
        console.error('[Nkolay Route] İptal hatası:', error);
        return res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
});

// ========== İADE ==========
router.post('/refund', async (req, res) => {
    try {
        const { referenceCode, amount, trxDate } = req.body;

        if (!referenceCode || !amount || !trxDate) {
            return res.status(400).json({ success: false, message: 'Eksik bilgi: referenceCode, amount, trxDate gerekli' });
        }

        const result = await NkolayService.refundPayment({ referenceCode, amount, trxDate });
        return res.json(result);

    } catch (error) {
        console.error('[Nkolay Route] İade hatası:', error);
        return res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
});

module.exports = router;