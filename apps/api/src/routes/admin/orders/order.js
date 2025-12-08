const express = require('express');
const router = express.Router();

/* Model */
const Order = require('../../../models/admin/catalog/Order');
const WebOrder = require('../../../models/web/catalog/WebOrder');

/* Service */
const DiaOrderService = require('../../../services/plugins/dia/DiaOrderService');

/**
 * GET /api/admin/orders/sync-from-dia
 * DIA'dan siparişleri çek ve DB'ye kaydet
 */
router.get('/sync-from-dia', async (req, res) => {
    try {
        const { limit = 50, offset = 0, fullSync = false } = req.query;

        const diaOrderService = new DiaOrderService();

        let result;
        if (fullSync === 'true') {
            result = await diaOrderService.fullSync();
        } else {
            result = await diaOrderService.syncOrdersToDatabase(
                parseInt(limit),
                parseInt(offset)
            );
        }

        res.json({
            success: true,
            message: 'DIA sipariş senkronizasyonu tamamlandı',
            data: result
        });

    } catch (error) {
        console.error('DIA sipariş senkronizasyonu hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Sipariş senkronizasyonu başarısız',
            error: error.message
        });
    }
});

/**
 * GET /api/admin/orders/sync-to-weborders
 * orders collection'dan weborders collection'a aktar
 */
router.get('/sync-to-weborders', async (req, res) => {
    try {
        const diaOrderService = new DiaOrderService();

        const result = await diaOrderService.syncOrdersToWebOrders();

        res.json({
            success: true,
            message: 'Orders → WebOrders senkronizasyonu tamamlandı',
            data: result
        });

    } catch (error) {
        console.error('Orders → WebOrders sync hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Senkronizasyon başarısız',
            error: error.message
        });
    }
});

/**
 * GET /api/admin/orders
 * WebOrder listele (filtreleme ile - limit yok)
 */
router.get('/', async (req, res) => {
    try {
        const {
            search,
            status,
            dateFrom,
            dateTo,
            minAmount,
            maxAmount
        } = req.query;

        const query = {};

        // Arama (sipariş no, müşteri adı)
        if (search) {
            query.$or = [
                { 'diaData.fisno': { $regex: search, $options: 'i' } },
                { 'diaData.__cariunvan': { $regex: search, $options: 'i' } }
            ];
        }

        // Durum filtresi
        if (status) {
            query['syncInfo.webStatus'] = status;
        }

        // Tarih aralığı
        if (dateFrom || dateTo) {
            query['diaData.tarih'] = {};
            if (dateFrom) query['diaData.tarih'].$gte = new Date(dateFrom);
            if (dateTo) query['diaData.tarih'].$lte = new Date(dateTo);
        }

        // Tutar aralığı
        if (minAmount || maxAmount) {
            query['diaData.net'] = {};
            if (minAmount) query['diaData.net'].$gte = parseFloat(minAmount);
            if (maxAmount) query['diaData.net'].$lte = parseFloat(maxAmount);
        }

        const webOrders = await WebOrder.find(query)
            .sort({ 'diaData.tarih': -1 })
            .lean();

        res.json({
            success: true,
            data: {
                orders: webOrders.map(order => ({
                    _id: order._id,
                    _key: order._key,
                    orderNumber: order.diaData.fisno,
                    customerName: order.diaData.__cariunvan,
                    phone: order.diaData.__cariceptel || '',
                    email: '',
                    date: order.diaData.tarih,
                    status: order.syncInfo.webStatus,
                    total: order.diaData.net,
                    currency: order.diaData.dovizturu,
                    itemCount: order.diaData.m_kalemler?.length || 0
                })),
                total: webOrders.length
            }
        });

    } catch (error) {
        console.error('WebOrder listeleme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Siparişler listelenemedi',
            error: error.message
        });
    }
});

/**
 * GET /api/admin/orders/:orderId
 * Sipariş detayı
 */
router.get('/:orderNumber', async (req, res) => {
    try {
        const { orderNumber } = req.params;

        // orderNumber ile ara (ALT251006XXXX gibi)
        const order = await Order.findOne({ orderNumber: orderNumber })
            .populate('userId', 'email firstName lastName phone')
            .populate('items.productId', 'name brand images')
            .lean();

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Sipariş bulunamadı'
            });
        }

        // Frontend'e uygun formatta dön
        const formattedOrder = {
            order: order.orderNumber,
            date: order.createdAt,
            customer: order.userId
                ? `${order.userId.firstName} ${order.userId.lastName}`
                : `${order.billing?.address?.firstName || ''} ${order.billing?.address?.lastName || ''}`.trim(),
            email: order.userId?.email || '',

            shippingAddress: order.shipping?.address,
            billingAddress: order.billing?.address,

            orderItems: order.items.map(item => ({
                productId: item.productId,
                name: item.name,
                brand: item.brand,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice
            })),

            payment: {
                subtotal: order.pricing?.subtotal || 0,
                discount: order.pricing?.discountAmount || 0,
                tax: order.pricing?.vatAmount || 0,
                shippingCharges: order.pricing?.shippingCost || 0,
                total: order.pricing?.total || 0,
                currency: order.pricing?.currency || 'TRY'
            },

            status: order.status,
            paymentStatus: order.paymentStatus,
            paymentMethod: order.payment?.method,

            history: order.history || []
        };

        res.json({
            success: true,
            data: formattedOrder
        });

    } catch (error) {
        console.error('Sipariş detay hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Sipariş detayı alınamadı',
            error: error.message
        });
    }
});

/**
 * GET /api/admin/orders/stats
 * Sipariş istatistikleri
 */
router.get('/stats', async (req, res) => {
    try {
        const totalOrders = await Order.countDocuments();
        const pendingOrders = await Order.countDocuments({ status: 'pending' });
        const confirmedOrders = await Order.countDocuments({ status: 'confirmed' });
        const shippedOrders = await Order.countDocuments({ status: 'shipped' });
        const diaOrders = await Order.countDocuments({ source: 'dia_sync' });

        const totalRevenue = await Order.aggregate([
            { $match: { status: { $in: ['confirmed', 'shipped', 'delivered'] } } },
            { $group: { _id: null, total: { $sum: '$pricing.total' } } }
        ]);

        res.json({
            success: true,
            data: {
                totalOrders,
                pendingOrders,
                confirmedOrders,
                shippedOrders,
                diaOrders,
                totalRevenue: totalRevenue[0]?.total || 0
            }
        });

    } catch (error) {
        console.error('İstatistik hatası:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PATCH /api/admin/orders/:orderId/status
 * Sipariş durumunu güncelle
 */
router.patch('/:orderId/status', async (req, res) => {
    try {
        const { status, note } = req.body;

        const order = await Order.findById(req.params.orderId);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Sipariş bulunamadı'
            });
        }

        order.status = status;

        // History ekle
        order.history.push({
            status,
            note: note || `Durum güncellendi: ${status}`,
            timestamp: new Date()
        });

        await order.save();

        res.json({
            success: true,
            message: 'Sipariş durumu güncellendi',
            data: { order }
        });

    } catch (error) {
        console.error('Durum güncelleme hatası:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;