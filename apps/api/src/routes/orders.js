const express = require('express');
const Order = require('../models/admin/catalog/Order');
const User = require('../models/User');
const { authenticateUser } = require('../middleware/auth');
const logger = require('../utils/logger');
const router = express.Router();
const { syncOrderToDia } = require('../services/DiaService');

const generateOrderNumber = () => {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${timestamp.slice(-6)}-${random}`;
};

router.post('/create', authenticateUser, async (req, res) => {
  const startTime = Date.now();
  const requestId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  logger.info('=== [ORDER][CREATE][START] ===', { requestId, userId: req.user?.userId, bodyKeys: Object.keys(req.body||{}) });
  try {
    const {
      shippingAddress,
      billingAddress,
      paymentMethod,
      installments,
      notes
    } = req.body;

    const user = await User.findById(req.userId || req.user?.userId);
    logger.info('=== [ORDER][CREATE][USER_LOADED] ===', { requestId, hasUser: !!user });
    
    if (!user) {
      logger.warn('=== [ORDER][CREATE][USER_NOT_FOUND] ===', { requestId, userId: req.user?.userId });
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    if (!user.activeCart.items || user.activeCart.items.length === 0) {
      logger.warn('=== [ORDER][CREATE][EMPTY_CART] ===', { requestId, userId: user._id });
      return res.status(400).json({
        success: false,
        message: 'Sepetiniz boş'
      });
    }

    if (!shippingAddress) {
      logger.warn('=== [ORDER][CREATE][NO_ADDRESS] ===', { requestId });
      return res.status(400).json({
        success: false,
        message: 'Teslimat adresi gereklidir'
      });
    }

    if (!paymentMethod) {
      logger.warn('=== [ORDER][CREATE][NO_PAYMENT_METHOD] ===', { requestId });
      return res.status(400).json({
        success: false,
        message: 'Ödeme yöntemi seçilmelidir'
      });
    }

    const orderItems = user.activeCart.items.map(item => {
      const quantity = Math.max(1, item.quantity || 1);
      const unitPrice = Number(item.price) || 0;
      const totalPrice = unitPrice * quantity;
      const vatRate = 18;
      const vatAmount = Math.round((totalPrice * vatRate) / 100);

      return {
        productId: item.productId,
        sku: item.sku || item.SKU || item.id || item.productId,
        barcode: item.barcode || item.BARKOD || item.ean || item.ean13,
        productCode: item.productCode || item.sku || item.SKU,
        name: item.name,
        brand: item.brand,
        size: item?.specifications?.size,
        specifications: {
          width: item?.specifications?.width,
          profile: item?.specifications?.aspectRatio,
          diameter: item?.specifications?.rimDiameter,
          season: item?.specifications?.season,
          loadIndex: item?.specifications?.loadIndex,
          speedRating: item?.specifications?.speedIndex
        },
        quantity,
        unitPrice,
        totalPrice,
        vatRate,
        vatAmount,
        discount: 0
      };
    });

    const subtotal = orderItems.reduce((total, item) => total + item.totalPrice, 0);
    const vatAmount = orderItems.reduce((total, item) => total + (item.vatAmount || 0), 0);
    const shippingCost = subtotal > 500 ? 0 : 50;
    const total = subtotal + vatAmount + shippingCost;

    const order = new Order({
      orderNumber: generateOrderNumber(),
      userId: user._id,
      status: 'pending',
      paymentStatus: 'pending',
      items: orderItems,
      pricing: {
        subtotal,
        vatAmount,
        shippingCost,
        total,
        currency: 'TRY'
      },
      shipping: {
        address: shippingAddress,
        method: 'standard'
      },
      billing: {
        address: billingAddress || shippingAddress
      },
      payment: {
        method: paymentMethod,
        provider: 'external',
        installments: {
          count: installments || 1,
          amount: total,
          monthlyAmount: installments ? total / installments : total
        }
      },
      notes: { customer: notes },
      source: 'web',
      device: { userAgent: req.headers['user-agent'] || '', ip: req.ip || '' }
    });

    await order.save();
    logger.info('=== [ORDER][CREATE][SAVED] ===', { requestId, orderId: order._id, orderNumber: order.orderNumber });
    (async () => {
      try {
        const result = await syncOrderToDia(order.toObject());
        if (result?.success) {
          await Order.findByIdAndUpdate(order._id, {
            $set: {
              'integration.diaOrderId': result.diaKey || null,
              'integration.diaStatus': 'synced',
              'integration.lastSyncAt': new Date(),
            }
          });
          logger.info('=== [ORDER][DIA_SYNC][SUCCESS] ===', { requestId, orderId: order._id, diaKey: result.diaKey });
        } else if (!result?.skipped) {
          await Order.findByIdAndUpdate(order._id, {
            $set: {
              'integration.diaStatus': 'error',
              'integration.lastSyncAt': new Date(),
            },
            $push: { 'integration.syncErrors': result?.error || result?.message || 'unknown' }
          });
          logger.warn('=== [ORDER][DIA_SYNC][FAIL] ===', { requestId, orderId: order._id, error: result?.error || result?.message });
        }
      } catch (e) {
        logger.error('=== [ORDER][DIA_SYNC][EXCEPTION] ===', { requestId, orderId: order._id, error: e.message });
      }
    })();
    if (!user.statistics) {
      user.statistics = { totalOrders: 0, totalSpent: 0, lastOrderDate: null };
    }
    user.statistics.totalOrders = (user.statistics.totalOrders || 0) + 1;
    user.statistics.totalSpent = (user.statistics.totalSpent || 0) + total;
    user.statistics.lastOrderDate = new Date();

    if (!user.cartHistory) {
      user.cartHistory = { totalCarts: 0, completedCarts: 0, averageCartValue: 0, lastCartDate: null };
    }
    user.cartHistory.totalCarts = (user.cartHistory.totalCarts || 0) + 1;
    user.cartHistory.completedCarts = (user.cartHistory.completedCarts || 0) + 1;
    const completed = user.cartHistory.completedCarts;
    const prevAvg = user.cartHistory.averageCartValue || 0;
    user.cartHistory.averageCartValue = ((prevAvg * (completed - 1)) + total) / completed;
    user.cartHistory.lastCartDate = new Date();

    await user.save();
    logger.info('=== [ORDER][CREATE][USER_STATS_UPDATED] ===', { requestId, userId: user._id, totals: { totalOrders: user.statistics.totalOrders, totalSpent: user.statistics.totalSpent } });

    const duration = Date.now() - startTime;
    logger.info('=== [ORDER][CREATE][RESPONSE] ===', { requestId, duration: `${duration}ms`, statusCode: 201 });
    res.status(201).json({
      success: true,
      message: 'Sipariş başarıyla oluşturuldu',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        total: order.pricing.total,
        currency: order.pricing.currency,
        paymentRequired: paymentMethod !== 'cash_on_delivery'
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('=== [ORDER][CREATE][ERROR] ===', { requestId, duration: `${duration}ms`, error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Sipariş oluşturulurken hata oluştu'
    });
  }
});

router.get('/', authenticateUser, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    const query = { userId: req.user.userId };
    if (status) {
      query.status = status;
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-payment.threeDSecure.htmlContent');

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Sipariş listesi hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Siparişler listelenirken hata oluştu'
    });
  }
});

router.get('/:orderId', authenticateUser, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findOne({
      _id: orderId,
      userId: req.user.userId
    }).select('-payment.threeDSecure.htmlContent');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Sipariş bulunamadı'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Sipariş detay hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sipariş detayları alınırken hata oluştu'
    });
  }
});

router.get('/number/:orderNumber', authenticateUser, async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const order = await Order.findOne({ orderNumber, userId: req.user.userId })
      .select('-payment.threeDSecure.htmlContent');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Sipariş bulunamadı' });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    console.error('Sipariş numaradan getirme hatası:', error);
    res.status(500).json({ success: false, message: 'Sipariş alınırken hata oluştu' });
  }
});

router.post('/:orderId/cancel', authenticateUser, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    
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

    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Bu sipariş iptal edilemez'
      });
    }

    order.status = 'cancelled';
    order.history.push({
      status: 'cancelled',
      note: reason || 'Müşteri tarafından iptal edildi',
      updatedBy: req.user.userId
    });

    await order.save();

    res.json({
      success: true,
      message: 'Sipariş başarıyla iptal edildi'
    });
  } catch (error) {
    console.error('Sipariş iptal hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sipariş iptal edilirken hata oluştu'
    });
  }
});

router.put('/:orderId/status', authenticateUser, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, reason, trackingNumber } = req.body;
    
    if (req.user.type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için yetkiniz yok'
      });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Sipariş bulunamadı'
      });
    }

    order.status = status;
    
    if (trackingNumber) {
      order.shipping.trackingNumber = trackingNumber;
    }

    order.history.push({
      status,
      note: reason,
      updatedBy: req.user.userId
    });

    await order.save();

    res.json({
      success: true,
      message: 'Sipariş durumu güncellendi'
    });
  } catch (error) {
    console.error('Sipariş durum güncelleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sipariş durumu güncellenirken hata oluştu'
    });
  }
});

module.exports = router;