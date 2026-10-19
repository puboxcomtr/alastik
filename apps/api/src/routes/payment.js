const express = require('express');
const Order = require('../models/admin/catalog/Order');
const User = require('../models/User');
const { authenticateUser } = require('../middleware/auth');
const crypto = require('crypto');
const router = express.Router();

const BANK_ACCOUNTS = [
  { id: 'isbank', bankName: 'İş Bankası', iban: 'TR12 3456 7890 1234 5678 9012 34', accountName: 'ALastik Ticaret A.Ş.' },
  { id: 'garanti', bankName: 'Garanti BBVA', iban: 'TR98 7654 3210 9876 5432 1098 76', accountName: 'ALastik Ticaret A.Ş.' },
];

const iyzicoConfig = {
  apiKey: process.env.IYZICO_API_KEY || 'sandbox-api-key',
  secretKey: process.env.IYZICO_SECRET_KEY || 'sandbox-secret-key',
  uri: process.env.IYZICO_URI || 'https://sandbox-api.iyzipay.com'
};

router.post('/3d-secure/initialize', authenticateUser, async (req, res) => {
  try {
    const {
      orderId,
      cardNumber,
      cardHolderName,
      expireMonth,
      expireYear,
      cvc,
      installment = 1
    } = req.body;

    const order = await Order.findOne({
      _id: orderId,
      userId: req.user.userId
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Sipariş bulunamadı'
      });
    }

    const user = await User.findById(req.user.userId);

    const conversationId = crypto.randomUUID();
    const callbackUrl = `${process.env.FRONTEND_URL}/payment/callback`;
    
    const threeDSecureRequest = {
      locale: 'tr',
      conversationId,
      price: order.pricing.total.toString(),
      paidPrice: order.pricing.total.toString(),
      currency: 'TRY',
      installment,
      basketId: order.orderNumber,
      paymentChannel: 'WEB',
      paymentGroup: 'PRODUCT',
      callbackUrl,
      enabledInstallments: [1, 2, 3, 6, 9, 12],
      buyer: {
        id: user._id.toString(),
        name: user.profile.firstName,
        surname: user.profile.lastName,
        gsmNumber: user.profile.phone,
        email: user.email,
        identityNumber: '11111111111',
        lastLoginDate: user.lastLogin?.date?.toISOString() || new Date().toISOString(),
        registrationDate: user.createdAt.toISOString(),
        registrationAddress: order.billing.address.address,
        ip: req.ip,
        city: order.billing.address.city,
        country: order.billing.address.country,
        zipCode: order.billing.address.postalCode
      },
      shippingAddress: {
        contactName: `${order.shipping.address.firstName} ${order.shipping.address.lastName}`,
        city: order.shipping.address.city,
        country: order.shipping.address.country,
        address: order.shipping.address.address,
        zipCode: order.shipping.address.postalCode
      },
      billingAddress: {
        contactName: `${order.billing.address.firstName} ${order.billing.address.lastName}`,
        city: order.billing.address.city,
        country: order.billing.address.country,
        address: order.billing.address.address,
        zipCode: order.billing.address.postalCode
      },
      basketItems: order.items.map((item, index) => ({
        id: item.productId,
        name: item.name,
        category1: 'Otomobil',
        category2: 'Lastik',
        itemType: 'PHYSICAL',
        price: (item.totalPrice || (item.unitPrice * item.quantity)).toString()
      })),
      paymentCard: {
        cardHolderName,
        cardNumber: cardNumber.replace(/\s/g, ''),
        expireMonth,
        expireYear,
        cvc,
        registerCard: '0'
      }
    };

    const mockResponse = {
      status: 'success',
      locale: 'tr',
      systemTime: Date.now(),
      conversationId,
      threeDSHtmlContent: generateMock3DForm(conversationId, order.orderNumber),
      paymentId: crypto.randomUUID(),
      errorCode: null,
      errorMessage: null,
      errorGroup: null
    };

    order.payment.threeDSecure = {
      isEnabled: true,
      status: 'pending',
      conversationId,
      returnUrl: callbackUrl,
      callbackUrl,
      htmlContent: mockResponse.threeDSHtmlContent
    };

    order.payment.transaction = {
      status: 'pending',
      paymentId: mockResponse.paymentId,
      conversationId,
      locale: 'tr',
      systemTime: new Date(mockResponse.systemTime)
    };

    await order.save();

    res.json({
      success: true,
      message: '3D Secure doğrulama başlatıldı',
      data: {
        threeDSHtmlContent: mockResponse.threeDSHtmlContent,
        paymentId: mockResponse.paymentId,
        conversationId
      }
    });

  } catch (error) {
    console.error('3D Secure başlatma hatası:', error);
    res.status(500).json({
      success: false,
      message: '3D Secure doğrulama başlatılırken hata oluştu'
    });
  }
});

router.post('/3d-secure/callback', async (req, res) => {
  try {
    const {
      conversationId,
      paymentId,
      mdStatus,
      status,
      orderId
    } = req.body;

    console.log('3D Secure Callback:', req.body);

    const order = await Order.findOne({
      'payment.transaction.conversationId': conversationId
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Sipariş bulunamadı'
      });
    }

    if (mdStatus === '1' && status === 'success') {
      order.payment.threeDSecure.status = 'success';
      order.payment.threeDSecure.mdStatus = mdStatus;
      order.payment.transaction.status = 'success';
      order.paymentStatus = 'paid';
      order.status = 'confirmed';
      order.payment.paidAt = new Date();

      const user = await User.findById(order.userId);
      if (user) {
        user.activeCart = {
          items: [],
          totalItems: 0,
          totalPrice: 0,
          currency: 'TRY',
          lastUpdated: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        };
        await user.save();
      }

      await order.save();

      return res.redirect(`${process.env.FRONTEND_URL}/order-success?order=${order.orderNumber}`);
    } else {
      order.payment.threeDSecure.status = 'failed';
      order.payment.threeDSecure.mdStatus = mdStatus;
      order.payment.transaction.status = 'failed';
      order.paymentStatus = 'failed';
      
      await order.save();

      return res.redirect(`${process.env.FRONTEND_URL}/payment-failed?order=${order.orderNumber}&error=3d-secure-failed`);
    }

  } catch (error) {
    console.error('3D Secure callback hatası:', error);
    res.redirect(`${process.env.FRONTEND_URL}/payment-failed?error=callback-error`);
  }
});

router.get('/status/:orderId', authenticateUser, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findOne({
      _id: orderId,
      userId: req.user.userId
    }).select('paymentStatus payment.transaction status orderNumber');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Sipariş bulunamadı'
      });
    }

    res.json({
      success: true,
      data: {
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus,
        orderStatus: order.status,
        transactionStatus: order.payment.transaction.status
      }
    });
  } catch (error) {
    console.error('Ödeme durumu kontrol hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Ödeme durumu kontrol edilirken hata oluştu'
    });
  }
});

router.post('/installments', authenticateUser, async (req, res) => {
  try {
    const { cardNumber, amount } = req.body;

    const cardBin = cardNumber.substring(0, 6);
    
    const installmentOptions = [
      { installmentCount: 1, installmentAmount: amount, totalAmount: amount },
      { installmentCount: 2, installmentAmount: amount / 2, totalAmount: amount },
      { installmentCount: 3, installmentAmount: amount / 3, totalAmount: amount },
      { installmentCount: 6, installmentAmount: amount / 6, totalAmount: amount * 1.05 },
      { installmentCount: 9, installmentAmount: amount / 9, totalAmount: amount * 1.08 },
      { installmentCount: 12, installmentAmount: amount / 12, totalAmount: amount * 1.12 }
    ];

    res.json({
      success: true,
      data: {
        cardBin,
        bankName: 'Test Bankası',
        cardType: 'CREDIT_CARD',
        installmentOptions
      }
    });
  } catch (error) {
    console.error('Taksit seçenekleri hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Taksit seçenekleri alınırken hata oluştu'
    });
  }
});

function generateMock3DForm(conversationId, orderNumber) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>3D Secure Doğrulama</title>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
            .form-container { max-width: 400px; margin: 0 auto; }
            .btn { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
            .btn:hover { background: #0056b3; }
        </style>
    </head>
    <body>
        <div class="form-container">
            <h2>3D Secure Doğrulama</h2>
            <p>Sipariş No: ${orderNumber}</p>
            <p>Ödemenizi tamamlamak için aşağıdaki butona tıklayın.</p>
            
            <form method="POST" action="${process.env.API_URL}/api/payment/3d-secure/callback">
                <input type="hidden" name="conversationId" value="${conversationId}">
                <input type="hidden" name="paymentId" value="${crypto.randomUUID()}">
                <input type="hidden" name="mdStatus" value="1">
                <input type="hidden" name="status" value="success">
                <button type="submit" class="btn">Ödemeyi Onayla</button>
            </form>
            
            <br><br>
            <form method="POST" action="${process.env.API_URL}/api/payment/3d-secure/callback">
                <input type="hidden" name="conversationId" value="${conversationId}">
                <input type="hidden" name="paymentId" value="${crypto.randomUUID()}">
                <input type="hidden" name="mdStatus" value="0">
                <input type="hidden" name="status" value="failed">
                <button type="submit" class="btn" style="background: #dc3545;">Ödemeyi Reddet (Test)</button>
            </form>
        </div>
    </body>
    </html>
  `;
}

module.exports = router;

router.get('/bank-accounts', async (req, res) => {
  try {
    res.json({ success: true, data: BANK_ACCOUNTS });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Hesaplar alınamadı' });
  }
});

router.post('/bank-transfer/notify', authenticateUser, async (req, res) => {
  try {
    const { orderId, bankId, amount, description } = req.body;
    const order = await Order.findOne({ _id: orderId, userId: req.user.userId });
    if (!order) return res.status(404).json({ success: false, message: 'Sipariş bulunamadı' });

    order.payment.method = 'bank_transfer';
    order.paymentStatus = 'pending';
    order.status = 'pending';
    order.addToHistory('pending', `Havale bildirimi alındı: ${bankId} - ${amount}`);
    await order.save();

    res.json({ success: true, message: 'Havale bildirimi alındı' });
  } catch (error) {
    console.error('Bank transfer notify error:', error);
    res.status(500).json({ success: false, message: 'Havale bildirimi alınamadı' });
  }
});