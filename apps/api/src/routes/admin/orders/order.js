const express = require('express');
const router = express.Router();
const WebOrder = require('../../../models/web/order/WebOrder');
const WebProduct = require('../../../models/web/catalog/WebProduct');
const WebMember = require('../../../models/web/user/WebMember');
const WebVehicle = require('../../../models/web/user/WebVehicle');


// Sipariş durumları (model'deki enum'a göre)
const ORDER_STATUSES = {
    pending: 'Onay Bekliyor',
    confirmed: 'Onaylandı',
    processing: 'Hazırlanıyor',
    shipped: 'Kargoya Verildi',
    delivered: 'Teslim Edildi',
    cancelled: 'İptal Edildi',
    returned: 'İade Edildi',
    payment_failed: 'Ödeme Başarısız'
};

// Ödeme durumları (model'deki enum'a göre)
const PAYMENT_STATUSES = {
    pending: 'Bekliyor',
    paid: 'Ödendi',
    failed: 'Başarısız',
    refunded: 'İade Edildi',
    cancelled: 'İptal Edildi'
};

// GET /api/admin/orders - Sipariş listesi
router.get('/', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search = '',
            status = '',
            paymentStatus = '',
            paymentMethod = '',
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Filtre oluştur
        let filter = { isActive: true };

        // Arama
        if (search) {
            filter.$or = [
                { orderNumber: { $regex: search, $options: 'i' } },
                { 'memberSnapshot.firstName': { $regex: search, $options: 'i' } },
                { 'memberSnapshot.lastName': { $regex: search, $options: 'i' } },
                { 'memberSnapshot.email': { $regex: search, $options: 'i' } },
                { 'billingSnapshot.fullName': { $regex: search, $options: 'i' } },
                { customerEmail: { $regex: search, $options: 'i' } },
                { customerName: { $regex: search, $options: 'i' } }
            ];
        }

        if (status) {
            filter.status = status;
        }

        if (paymentStatus) {
            filter['payment.status'] = paymentStatus;
        }

        if (paymentMethod) {
            filter['payment.method'] = paymentMethod;
        }

        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const total = await WebOrder.countDocuments(filter);

        const orders = await WebOrder.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        const formattedOrders = orders.map(order => {
            let customerName = order.customerName || '';
            if (!customerName && order.memberSnapshot) {
                customerName = `${order.memberSnapshot.firstName || ''} ${order.memberSnapshot.lastName || ''}`.trim();
            }
            if (!customerName && order.billingSnapshot) {
                customerName = order.billingSnapshot.fullName || '';
            }

            let customerEmail = order.customerEmail || '';
            if (!customerEmail && order.memberSnapshot) {
                customerEmail = order.memberSnapshot.email || '';
            }
            if (!customerEmail && order.billingSnapshot) {
                customerEmail = order.billingSnapshot.email || '';
            }

            return {
                id: order._id.toString(),
                orderNumber: order.orderNumber,
                customerName: customerName || 'Bilinmiyor',
                customerEmail: customerEmail,
                isGuest: order.isGuest || false,
                status: order.status || 'pending',
                statusText: ORDER_STATUSES[order.status] || order.status || 'Onay Bekliyor',
                paymentMethod: order.payment?.method || '',
                paymentMethodText: order.payment?.method === 'bank_transfer' ? 'Banka Havalesi' :
                    order.payment?.method === 'credit_card' ? 'Kredi Kartı (Ödeme Çekilmedi)' :
                        order.payment?.method === 'credit_card_3d' ? 'Kredi Kartı 3D Secure' :
                            order.payment?.method === 'netahsilat_installment' ? 'Kredi Kartı Taksitli' :
                                order.payment?.method === 'cash_on_delivery' ? 'Kapıda Ödeme' : order.payment?.method || '',
                paymentStatus: order.payment?.status || 'pending',
                statusText: order.payment?.paidAt ? 'Ödendi' :
                    order.payment?.status === 'failed' ? 'Başarısız' :
                        order.payment?.status === 'paid' ? 'Ödendi' :
                            PAYMENT_STATUSES[order.payment?.status] || 'Bekliyor',
                total: order.pricing?.total || 0,
                currency: order.pricing?.currency || 'TRY',
                itemCount: order.items?.length || 0,
                createdAt: order.createdAt
            };
        });

        res.json({
            success: true,
            data: formattedOrders,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            },
            meta: {
                statuses: ORDER_STATUSES,
                paymentStatuses: PAYMENT_STATUSES
            }
        });

    } catch (error) {
        console.error('Sipariş listesi hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Siparişler yüklenirken hata oluştu',
            error: error.message
        });
    }
});

// GET /api/admin/orders/:id - Sipariş detay
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const order = await WebOrder.findById(id).lean();

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Sipariş bulunamadı'
            });
        }
        if (order.items && order.items.length > 0) {
            const productKeys = order.items.map(item => item.productKey);
            const products = await WebProduct.find({
                '_key': { $in: productKeys }
            }).select('_key diaData.m_resimler diaData.marka diaData.stokkartkodu diaData.ozelkod1kodu').lean();
            const productMap = {};
            products.forEach(product => {
                const firstImage = product.diaData?.m_resimler?.[0]?.aws_url || null;
                productMap[product._key] = {
                    image: firstImage,
                    brand: product.diaData?.marka || '',
                    sku: product.diaData?.stokkartkodu || '',
                    season: product.diaData?.ozelkod1kodu || ''
                };
            });
            order.items = order.items.map(item => ({
                ...item,
                image: productMap[item.productKey]?.image || null,
                brand: productMap[item.productKey]?.brand || '',
                sku: productMap[item.productKey]?.sku || '',
                season: productMap[item.productKey]?.season || ''
            }));
        }


        let customerName = order.customerName || '';
        if (!customerName && order.memberSnapshot) {
            customerName = `${order.memberSnapshot.firstName || ''} ${order.memberSnapshot.lastName || ''}`.trim();
        }
        if (!customerName && order.billingSnapshot) {
            customerName = order.billingSnapshot.fullName || '';
        }
        let memberInfo = null;
        if (order.memberId) {
            const member = await WebMember.findById(order.memberId).lean();
            if (member) {
                const orderCount = await WebOrder.countDocuments({
                    memberId: order.memberId,
                    isActive: true
                });

                memberInfo = {
                    id: member._id.toString(),
                    firstName: member.firstName || '',
                    lastName: member.lastName || '',
                    email: member.email || '',
                    phone: member.phone || '',
                    createdAt: member.createdAt,
                    orderCount: orderCount
                };

            }
        }
        // Araç bilgilerini çek
        let vehicleInfo = null;
        if (order.memberId) {
            const vehicle = await WebVehicle.findOne({
                memberId: order.memberId,
                isPrimary: true,
                isActive: true
            }).lean();

            if (vehicle) {
                vehicleInfo = {
                    id: vehicle._id.toString(),
                    make: vehicle.wheelSizeData?.makeName || '',
                    model: vehicle.wheelSizeData?.modelName || '',
                    year: vehicle.wheelSizeData?.year || null,
                    bodyType: vehicle.userInputs?.bodyType || '',
                    enginePower: vehicle.userInputs?.enginePower || '',
                    plateNumber: vehicle.userInputs?.plateNumber || '',
                    mileage: vehicle.userInputs?.mileage || null,
                    image: vehicle.image?.url || null
                };
            }
        }
        const formattedOrder = {
            id: order._id.toString(),
            orderNumber: order.orderNumber,
            isGuest: order.isGuest,
            memberId: order.memberId?.toString() || null,
            memberInfo: memberInfo,
            vehicleInfo: vehicleInfo,

            customer: {
                name: customerName || 'Bilinmiyor',
                email: order.memberSnapshot?.email || order.billingSnapshot?.email || order.customerEmail || '',
                phone: order.memberSnapshot?.phone || order.billingSnapshot?.phone || order.customerPhone || '',
                isGuest: order.isGuest
            },

            billingAddress: order.billingSnapshot || null,
            shippingAddress: order.shippingSnapshot || null,
            items: order.items || [],
            pricing: order.pricing || {},

            payment: {
                method: order.payment?.method || '',
                methodText: order.payment?.method === 'bank_transfer' ? 'Banka Havalesi' :
                    order.payment?.method === 'credit_card' ? 'Kredi Kartı (Ödeme Çekilmedi)' :
                        order.payment?.method === 'credit_card_3d' ? 'Kredi Kartı 3D Secure' :
                            order.payment?.method === 'netahsilat_installment' ? 'Kredi Kartı Taksitli' :
                                order.payment?.method === 'cash_on_delivery' ? 'Kapıda Ödeme' : order.payment?.method || '',
                status: order.payment?.status || 'pending',
                statusText: PAYMENT_STATUSES[order.payment?.status] || order.payment?.status || 'Bekliyor',
                gateway: order.payment?.gateway || null,
                installment: order.payment?.installment || null,
                referenceCode: order.payment?.referenceCode || null,
                bankTransfer: order.payment?.bankTransfer || null,
                cardInfo: order.payment?.cardInfo || null,
                paidAt: order.payment?.paidAt || null
            },

            status: order.status || 'pending',
            statusText: ORDER_STATUSES[order.status] || order.status || 'Onay Bekliyor',

            shipping: order.shipping || {},
            diaIntegration: order.diaIntegration || {},
            customerNote: order.customerNote || '',
            adminNote: order.adminNote || '',
            cancellation: order.cancellation || null,

            createdAt: order.createdAt,
            updatedAt: order.updatedAt
        };

        res.json({
            success: true,
            data: formattedOrder,
            meta: {
                statuses: ORDER_STATUSES,
                paymentStatuses: PAYMENT_STATUSES
            }
        });

    } catch (error) {
        console.error('Sipariş detay hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Sipariş detayı yüklenirken hata oluştu',
            error: error.message
        });
    }
});

// PUT /api/admin/orders/:id/status - Sipariş durumu güncelle
router.put('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!ORDER_STATUSES[status]) {
            return res.status(400).json({
                success: false,
                message: 'Geçersiz sipariş durumu'
            });
        }

        const order = await WebOrder.findByIdAndUpdate(
            id,
            { status, updatedAt: new Date() },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Sipariş bulunamadı'
            });
        }

        res.json({
            success: true,
            message: 'Sipariş durumu güncellendi',
            data: {
                id: order._id.toString(),
                status: order.status,
                statusText: ORDER_STATUSES[order.status]
            }
        });

    } catch (error) {
        console.error('Sipariş durumu güncelleme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Sipariş durumu güncellenirken hata oluştu',
            error: error.message
        });
    }
});

// PUT /api/admin/orders/:id/payment-status - Ödeme durumu güncelle
router.put('/:id/payment-status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!PAYMENT_STATUSES[status]) {
            return res.status(400).json({
                success: false,
                message: 'Geçersiz ödeme durumu'
            });
        }

        const updateData = {
            'payment.status': status,
            updatedAt: new Date()
        };

        // Ödendi ise paidAt ekle
        if (status === 'paid') {
            updateData['payment.paidAt'] = new Date();
        }

        const order = await WebOrder.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        );

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Sipariş bulunamadı'
            });
        }

        res.json({
            success: true,
            message: 'Ödeme durumu güncellendi',
            data: {
                id: order._id.toString(),
                paymentStatus: order.payment.status,
                paymentStatusText: PAYMENT_STATUSES[order.payment.status]
            }
        });

    } catch (error) {
        console.error('Ödeme durumu güncelleme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Ödeme durumu güncellenirken hata oluştu',
            error: error.message
        });
    }
});

module.exports = router;