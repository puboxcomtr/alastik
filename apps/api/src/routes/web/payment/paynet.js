/**
 * Paynet Ödeme Route'ları
 * /api/web/payments/paynet
 * Tek çekim ödemeler için
 */

const express = require('express');
const router = express.Router();
const PaynetService = require('../../../services/plugins/payment/PaynetService');
const WebOrder = require('../../../models/web/order/WebOrder');

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://alastik.com';

// 3D Ödeme Başlat
router.post('/3d-init', async (req, res) => {
    try {
        const {
            orderId,
            cardNumber,
            cardHolderName,
            expMonth,
            expYear,
            cvc,
            email,
            phone
        } = req.body;

        console.log('Paynet 3D Init Request:', {
            orderId,
            cardNumber: cardNumber ? cardNumber.substring(0, 6) + '******' : 'YOK',
            cardHolderName,
            expMonth,
            expYear
        });

        if (!orderId || !cardNumber || !cardHolderName || !expMonth || !expYear || !cvc) {
            return res.status(400).json({ success: false, message: 'Eksik bilgi' });
        }

        const order = await WebOrder.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Sipariş bulunamadı' });
        }

        console.log('Sipariş bulundu:', order.orderNumber, 'Tutar:', order.pricing.total);

        const result = await PaynetService.initiate3DPayment({
            orderNumber: order.orderNumber,
            amount: order.pricing.total,
            cardNumber,
            cardHolderName,
            expMonth,
            expYear: expYear.length === 2 ? '20' + expYear : expYear,
            cvc,
            email: email || order.customerEmail,
            phone: phone || order.customerPhone
        });

        console.log('Paynet Init Result:', result);

        if (result.success && result.postUrl) {
            // Sipariş durumunu güncelle
            order.payment = order.payment || {};
            order.payment.method = 'credit_card_paynet';
            order.payment.gateway = 'paynet';
            order.payment.installment = 1;
            order.payment.transactionId = result.tokenId;
            order.payment.referenceCode = result.sessionId;
            order.payment.status = 'pending';
            await order.save();

            return res.json({
                success: true,
                postUrl: result.postUrl,
                tokenId: result.tokenId,
                sessionId: result.sessionId
            });
        }

        return res.status(400).json(result);
    } catch (error) {
        console.error('Paynet 3D init hatası:', error);
        return res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
});

// 3D Callback - Bankadan dönüş
router.post('/3d-callback', async (req, res) => {
    try {
        console.log('Paynet 3D Callback Body:', req.body);

        const sessionId = req.body.session_id;
        const tokenId = req.body.token_id;

        if (!sessionId || !tokenId) {
            console.error('Paynet callback: session_id veya token_id yok');
            return res.redirect(`${FRONTEND_URL}/odeme/basarisiz?error=Eksik%20parametre`);
        }

        // Siparişi bul
        const order = await WebOrder.findOne({ 'payment.referenceCode': sessionId });

        if (!order) {
            console.error('Paynet callback: Sipariş bulunamadı, sessionId:', sessionId);
            return res.redirect(`${FRONTEND_URL}/odeme/basarisiz?error=Sipariş%20bulunamadı`);
        }

        // 3D Ödemeyi tamamla
        const chargeResult = await PaynetService.complete3DPayment(sessionId, tokenId);
        console.log('Paynet Charge Result:', chargeResult);

        if (chargeResult.success) {
            // Başarılı ödeme
            order.payment.status = 'paid';
            order.payment.paidAt = new Date();
            order.payment.authCode = chargeResult.authCode;
            order.payment.transactionId = chargeResult.transactionId;
            order.payment.cardInfo = {
                lastFourDigits: chargeResult.maskedCardNo?.slice(-4) || '',
                cardType: 'credit'
            };
            order.status = 'confirmed';
            await order.save();

            // Kredi kartı ödemesi onaylandı → DIA'ya otomatik aktar (arka planda)
            const { syncOrderToDiaBackground } = require('../../../services/plugins/dia/DiaOrderService');
            syncOrderToDiaBackground(order, 'paynet-callback');

            return res.redirect(`${FRONTEND_URL}/siparis-basarili?order=${order.orderNumber}`);
        }

        // Başarısız ödeme
        order.payment.status = 'failed';
        order.payment.errorMessage = chargeResult.message || chargeResult.bankErrorMessage;
        order.payment.errorCode = chargeResult.errorCode;
        order.status = 'payment_failed';
        await order.save();

        return res.redirect(`${FRONTEND_URL}/odeme/basarisiz?error=${encodeURIComponent(chargeResult.message || 'Ödeme başarısız')}`);
    } catch (error) {
        console.error('Paynet 3D callback hatası:', error);
        return res.redirect(`${FRONTEND_URL}/odeme/basarisiz?error=Sistem%20hatası`);
    }
});

// GET callback (bazı bankalar GET ile dönebilir)
router.get('/3d-callback', async (req, res) => {
    try {
        console.log('Paynet 3D Callback (GET) Query:', req.query);

        const sessionId = req.query.session_id;
        const tokenId = req.query.token_id;

        if (!sessionId || !tokenId) {
            return res.redirect(`${FRONTEND_URL}/odeme/basarisiz?error=Eksik%20parametre`);
        }

        // POST ile aynı işlemi yap
        req.body = { session_id: sessionId, token_id: tokenId };
        return router.handle(req, res);
    } catch (error) {
        console.error('Paynet GET callback hatası:', error);
        return res.redirect(`${FRONTEND_URL}/odeme/basarisiz?error=Sistem%20hatası`);
    }
});

module.exports = router;