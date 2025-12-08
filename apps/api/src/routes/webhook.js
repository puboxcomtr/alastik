const express = require('express');
const router = express.Router();
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'webhook-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/webhook.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Payment webhook endpoint
router.post('/payment', async (req, res) => {
  try {
    logger.info('Payment webhook received:', {
      body: req.body,
      headers: req.headers,
      timestamp: new Date().toISOString()
    });
    
    // Ödeme sonucu işlemleri burada
    const { orderReference, status, amount, last4, paymentDate, referenceCode, transactionStatusId, paymentGuid } = req.body;
    
    // ✅ OrderReference'ı güvenli şekilde al
    let finalOrderRef = orderReference;
    if (!finalOrderRef || finalOrderRef === 'UNKNOWN') {
      // PaymentGuid'den veya diğer alanlardan orderRef çıkarmaya çalış
      finalOrderRef = paymentGuid || referenceCode || 'WEBHOOK_UNKNOWN';
    }

    // ✅ Session'dan payment verilerini al (fallback olarak)
    let sessionOrderRef = 'WEBHOOK_UNKNOWN';
    let sessionReferenceCode = null;
    let sessionTransactionId = null;

    // Eğer webhook'ta orderReference yoksa session'dan almaya çalış
    // Not: Webhook'larda session olmayabilir, bu durumda sadece webhook verilerini kullan
    if (req.session && req.session.metadata && req.session.metadata.paymentGatewayData) {
      const paymentData = req.session.metadata.paymentGatewayData;
      sessionOrderRef = paymentData.clientReferenceCode || paymentData.orderId;
      sessionReferenceCode = paymentData.referenceCode;
      sessionTransactionId = paymentData.transactionId;
      logger.info('Session payment data found for webhook', { sessionData: paymentData });
    } else {
      logger.info('No session data found for webhook - using webhook data only');
    }

    // ✅ Final orderReference belirleme
    if (finalOrderRef === 'WEBHOOK_UNKNOWN' && sessionOrderRef !== 'WEBHOOK_UNKNOWN') {
      finalOrderRef = sessionOrderRef;
    }
    
    // ✅ Webhook'tan gelen tüm verileri logla
    logger.info('Full webhook data received', {
      allBodyKeys: Object.keys(req.body),
      allBodyData: req.body,
      timestamp: new Date().toISOString()
    });
    
    // Sipariş durumunu güncelle
    if (finalOrderRef && status) {
      logger.info('Processing payment webhook:', {
        orderReference: finalOrderRef,
        originalOrderRef: orderReference,
        status,
        amount,
        last4,
        paymentDate,
        referenceCode,
        paymentGuid
      });
      
      // TODO: Burada sipariş veritabanını güncelleyin
      // const Order = require('../models/Order');
      // await Order.findOneAndUpdate(
      //   { orderReference },
      //   { 
      //     paymentStatus: status,
      //     paymentAmount: amount,
      //     paymentDate: paymentDate,
      //     paymentReference: referenceCode,
      //     last4: last4
      //   }
      // );
      
      // TODO: Email gönderimi
      // if (status === 'SUCCESS') {
      //   await sendPaymentSuccessEmail(orderReference);
      // } else {
      //   await sendPaymentFailureEmail(orderReference);
      // }
      
      // TODO: Stok güncelleme
      // if (status === 'SUCCESS') {
      //   await updateInventoryAfterPayment(orderReference);
      // }
    }
    
    res.status(200).json({ 
      success: true, 
      message: 'Webhook processed successfully',
      orderReference: finalOrderRef,
      originalOrderRef: orderReference,
      status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Webhook processing error:', {
      error: error.message,
      stack: error.stack,
      body: req.body,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Health check endpoint for webhook
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'webhook',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
