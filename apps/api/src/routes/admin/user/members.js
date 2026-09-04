const router = require('express').Router();
const mongoose = require('mongoose');
const WebMember = require('../../../models/web/user/WebMember');
const WebOrder = require('../../../models/web/order/WebOrder');
const { revenueMatch, round2 } = require('../../../utils/dashboardMetrics');

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);
// Şifre/token alanları hiçbir uçtan dönmez
const HIDDEN_FIELDS = '-password -resetPasswordToken -resetPasswordExpire -activationToken -activationTokenExpire -activationCode -loginAttempts -lockedUntil';

/**
 * GET / — site üyeleri listesi (arama + durum filtresi + sayfalama)
 * Sipariş sayısı weborders üzerinden hesaplanır; şifre/token alanları asla dönmez.
 */
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 100, 500);
        const match = { site: req.site };

        if (req.query.status && ['pending', 'active', 'suspended', 'deleted'].includes(req.query.status)) {
            match.status = req.query.status;
        }

        if (req.query.search && req.query.search.trim()) {
            const regex = new RegExp(req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            match.$or = [
                { firstName: regex },
                { lastName: regex },
                { email: regex },
                { phone: regex },
                { diaCustomerCode: regex }
            ];
        }

        // Ek filtreler (Üyeler sayfası): kayıt tarihi aralığı ve sipariş vermiş/vermemiş
        const dateRe = /^\d{4}-\d{2}-\d{2}$/;
        if (dateRe.test(req.query.from || '') || dateRe.test(req.query.to || '')) {
            match.createdAt = {};
            if (dateRe.test(req.query.from || '')) match.createdAt.$gte = new Date(`${req.query.from}T00:00:00+03:00`);
            if (dateRe.test(req.query.to || '')) match.createdAt.$lt = new Date(new Date(`${req.query.to}T00:00:00+03:00`).getTime() + 24 * 60 * 60 * 1000);
        }
        if (req.query.hasOrders === 'yes' || req.query.hasOrders === 'no') {
            const memberIds = await WebOrder.distinct('memberId', { site: req.site, isActive: true, memberId: { $ne: null } });
            match._id = req.query.hasOrders === 'yes' ? { $in: memberIds } : { $nin: memberIds };
        }

        // view=table: Üyeler sayfası için ek alanlar (harcama, son sipariş, sepet, etiket/not).
        // Varsayılan görünüm (Site Üyeleri) değişmez.
        const tableView = req.query.view === 'table';

        const tableStages = tableView ? [
            {
                $lookup: {
                    from: 'weborders',
                    let: { memberId: '$_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$memberId', '$$memberId'] }, isActive: true, ...revenueMatch } },
                        { $group: { _id: null, total: { $sum: '$pricing.total' }, lastAt: { $max: '$createdAt' } } }
                    ],
                    as: 'paidStats'
                }
            },
            {
                $lookup: {
                    from: 'webcarts',
                    let: { memberId: '$_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$userId', '$$memberId'] } } },
                        { $sort: { lastActivity: -1 } },
                        { $limit: 1 },
                        {
                            $project: {
                                itemCount: { $sum: '$items.quantity' },
                                total: { $sum: { $map: { input: '$items', as: 'i', in: { $multiply: ['$$i.unitPrice', '$$i.quantity'] } } } }
                            }
                        }
                    ],
                    as: 'carts'
                }
            }
        ] : [];

        const tableFields = tableView ? {
            adminTags: 1, adminNote: 1,
            totalSpend: { $ifNull: [{ $arrayElemAt: ['$paidStats.total', 0] }, 0] },
            lastOrderAt: { $arrayElemAt: ['$paidStats.lastAt', 0] },
            cart: {
                $cond: [
                    { $gt: [{ $size: '$carts' }, 0] },
                    { itemCount: { $arrayElemAt: ['$carts.itemCount', 0] }, total: { $arrayElemAt: ['$carts.total', 0] } },
                    null
                ]
            }
        } : {};

        const [rows, total] = await Promise.all([
            WebMember.aggregate([
                { $match: match },
                { $sort: { createdAt: -1 } },
                { $skip: (page - 1) * limit },
                { $limit: limit },
                {
                    $lookup: {
                        from: 'weborders',
                        let: { memberId: '$_id' },
                        pipeline: [
                            { $match: { $expr: { $eq: ['$memberId', '$$memberId'] } } },
                            { $count: 'n' }
                        ],
                        as: 'orderStats'
                    }
                },
                ...tableStages,
                {
                    $project: {
                        firstName: 1, lastName: 1, email: 1, phone: 1,
                        status: 1, marketingConsent: 1,
                        diaCustomerCode: 1, diaCustomerKey: 1,
                        createdAt: 1, lastLoginAt: 1,
                        orderCount: { $ifNull: [{ $arrayElemAt: ['$orderStats.n', 0] }, 0] },
                        ...tableFields
                    }
                }
            ]),
            WebMember.countDocuments(match)
        ]);

        res.json({ success: true, data: rows, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Üyeler yüklenemedi', error: err.message });
    }
});

/**
 * GET /:id — üye detay sayfası: profil, sipariş istatistikleri, siparişler, adresler, favoriler, zaman çizelgesi
 */
router.get('/:id', async (req, res) => {
    try {
        if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: 'Geçersiz üye kimliği' });
        const member = await WebMember.findOne({ _id: req.params.id, site: req.site }).select(HIDDEN_FIELDS).lean();
        if (!member) return res.status(404).json({ success: false, message: 'Üye bulunamadı' });

        const WebAddress = require('../../../models/web/address/WebAddress');
        const WebFavourite = require('../../../models/web/user/WebFavourite');
        const WebCart = require('../../../models/web/cart/WebCart');
        const WebVehicle = require('../../../models/web/user/WebVehicle');

        const [orders, [orderStats], addresses, favouriteCount, cartDoc, vehicles] = await Promise.all([
            WebOrder.find({ memberId: member._id, isActive: true })
                .sort({ createdAt: -1 }).limit(50)
                .select('orderNumber status payment.status payment.method pricing.total items.quantity createdAt').lean(),
            WebOrder.aggregate([
                { $match: { memberId: member._id, isActive: true } },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        paid: { $sum: { $cond: [{ $and: [{ $eq: ['$payment.status', 'paid'] }, { $ne: ['$status', 'pending'] }] }, 1, 0] } },
                        paidTotal: { $sum: { $cond: [{ $and: [{ $eq: ['$payment.status', 'paid'] }, { $ne: ['$status', 'pending'] }] }, '$pricing.total', 0] } },
                        cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
                        units: { $sum: { $sum: '$items.quantity' } },
                        firstAt: { $min: '$createdAt' },
                        lastAt: { $max: '$createdAt' }
                    }
                }
            ]),
            WebAddress.find({ userId: member._id })
                .select('addressName fullName phone cityName districtName addressDescription addressNote isDefault createdAt').lean(),
            WebFavourite.countDocuments({ memberId: member._id }),
            WebCart.findOne({ userId: member._id })
                .sort({ lastActivity: -1 })
                .select('items lastActivity updatedAt').lean(),
            WebVehicle.find({ memberId: member._id, isActive: true })
                .select('wheelSizeData userInputs.plateNumber image.url isPrimary createdAt').lean()
        ]);

        const stats = orderStats || { total: 0, paid: 0, paidTotal: 0, cancelled: 0, units: 0, firstAt: null, lastAt: null };

        // Sepet özeti: kalemler + toplam (liste görünümündeki hesapla aynı: adet x birim fiyat)
        const cartItems = (cartDoc?.items || []).map(i => ({
            productName: i.productName || i.productKey,
            brandName: i.brandName || '',
            quantity: i.quantity,
            unitPrice: round2(i.unitPrice || 0),
            lineTotal: round2((i.unitPrice || 0) * (i.quantity || 0))
        }));
        const cart = cartItems.length ? {
            itemCount: cartItems.reduce((s, i) => s + i.quantity, 0),
            total: round2(cartItems.reduce((s, i) => s + i.lineTotal, 0)),
            updatedAt: cartDoc.lastActivity || cartDoc.updatedAt || null,
            items: cartItems
        } : null;

        // Zaman çizelgesi: kayıt, aktivasyon, son giriş ve siparişler (en yeni önce)
        const timeline = [
            { type: 'register', title: 'Üye oldu', at: member.createdAt },
            member.activatedAt ? { type: 'activate', title: 'Hesabını aktifleştirdi', at: member.activatedAt } : null,
            member.lastLoginAt ? { type: 'login', title: 'Son giriş', at: member.lastLoginAt } : null,
            ...orders.slice(0, 10).map(o => ({
                type: 'order', title: `Sipariş ${o.orderNumber}`,
                subtitle: `${round2(o.pricing?.total || 0)} TL`, orderId: String(o._id), status: o.status, at: o.createdAt
            }))
        ].filter(Boolean).sort((a, b) => new Date(b.at) - new Date(a.at));

        res.json({
            success: true,
            data: {
                member,
                orders,
                addresses,
                favouriteCount,
                cart,
                vehicles: (vehicles || []).map(v => ({
                    _id: String(v._id),
                    makeName: v.wheelSizeData?.makeName || v.wheelSizeData?.make || '',
                    modelName: v.wheelSizeData?.modelName || v.wheelSizeData?.model || '',
                    year: v.wheelSizeData?.year || null,
                    plateNumber: v.userInputs?.plateNumber || '',
                    imageUrl: v.image?.url || '',
                    isPrimary: !!v.isPrimary,
                    createdAt: v.createdAt
                })),
                stats: {
                    orders: stats.total,
                    paidOrders: stats.paid,
                    totalSpend: round2(stats.paidTotal),
                    cancelledOrders: stats.cancelled,
                    unitsBought: stats.units,
                    firstOrderAt: stats.firstAt,
                    lastOrderAt: stats.lastAt,
                    avgOrderValue: stats.paid ? round2(stats.paidTotal / stats.paid) : 0
                },
                timeline
            }
        });
    } catch (err) {
        console.error('Üye detay hatası:', err);
        res.status(500).json({ success: false, message: 'Üye detayı yüklenemedi' });
    }
});

/**
 * PUT /:id/status — askıya al / aktifleştir (yalnızca active|suspended; silme ayrı uçtan)
 */
router.put('/:id/status', async (req, res) => {
    try {
        if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: 'Geçersiz üye kimliği' });
        const status = String(req.body.status || '');
        if (!['active', 'suspended'].includes(status)) return res.status(400).json({ success: false, message: 'Durum yalnızca active veya suspended olabilir' });

        const member = await WebMember.findOneAndUpdate({ _id: req.params.id, site: req.site }, { $set: { status } }, { new: true })
            .select('_id status').lean();
        if (!member) return res.status(404).json({ success: false, message: 'Üye bulunamadı' });
        res.json({ success: true, data: member, message: status === 'suspended' ? 'Üye askıya alındı' : 'Üye aktifleştirildi' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Durum güncellenemedi' });
    }
});

/**
 * PUT /:id/annotations — panel etiketleri ve notu
 */
router.put('/:id/annotations', async (req, res) => {
    try {
        if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: 'Geçersiz üye kimliği' });
        const update = {};
        if (Array.isArray(req.body.adminTags)) {
            update.adminTags = [...new Set(req.body.adminTags.map(t => String(t).trim()).filter(Boolean))].slice(0, 20);
        }
        if (typeof req.body.adminNote === 'string') update.adminNote = req.body.adminNote.trim().slice(0, 1000);
        if (!Object.keys(update).length) return res.status(400).json({ success: false, message: 'Güncellenecek etiket veya not gönderilmedi' });

        const member = await WebMember.findOneAndUpdate({ _id: req.params.id, site: req.site }, { $set: update }, { new: true })
            .select('adminTags adminNote').lean();
        if (!member) return res.status(404).json({ success: false, message: 'Üye bulunamadı' });
        res.json({ success: true, data: member });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Etiket/not kaydedilemedi' });
    }
});

/**
 * DELETE /:id — yumuşak silme: kayıt korunur, durum "deleted" olur (siparişler ve geçmiş kaybolmaz)
 */
router.delete('/:id', async (req, res) => {
    try {
        if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: 'Geçersiz üye kimliği' });
        const member = await WebMember.findOneAndUpdate({ _id: req.params.id, site: req.site }, { $set: { status: 'deleted' } }, { new: true })
            .select('_id status').lean();
        if (!member) return res.status(404).json({ success: false, message: 'Üye bulunamadı' });
        res.json({ success: true, data: member, message: 'Üye silindi olarak işaretlendi' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Üye silinemedi' });
    }
});

module.exports = router;
