const express = require('express');
const router = express.Router();
const winston = require('winston');

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

router.post('/payment', async (req, res) => {
  try {
    logger.info('Payment webhook received:', {
      body: req.body,
      headers: req.headers,
      timestamp: new Date().toISOString()
    });
    
    const { orderReference, status, amount, last4, paymentDate, referenceCode, transactionStatusId, paymentGuid } = req.body;
    
    let finalOrderRef = orderReference;
    if (!finalOrderRef || finalOrderRef === 'UNKNOWN') {
      finalOrderRef = paymentGuid || referenceCode || 'WEBHOOK_UNKNOWN';
    }

    let sessionOrderRef = 'WEBHOOK_UNKNOWN';
    let sessionReferenceCode = null;
    let sessionTransactionId = null;

    if (req.session && req.session.metadata && req.session.metadata.paymentGatewayData) {
      const paymentData = req.session.metadata.paymentGatewayData;
      sessionOrderRef = paymentData.clientReferenceCode || paymentData.orderId;
      sessionReferenceCode = paymentData.referenceCode;
      sessionTransactionId = paymentData.transactionId;
      logger.info('Session payment data found for webhook', { sessionData: paymentData });
    } else {
      logger.info('No session data found for webhook - using webhook data only');
    }

    if (finalOrderRef === 'WEBHOOK_UNKNOWN' && sessionOrderRef !== 'WEBHOOK_UNKNOWN') {
      finalOrderRef = sessionOrderRef;
    }
    
    logger.info('Full webhook data received', {
      allBodyKeys: Object.keys(req.body),
      allBodyData: req.body,
      timestamp: new Date().toISOString()
    });
    
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

router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'webhook',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
