const router = require('express').Router();
const mongoose = require('mongoose');
const WebMember = require('../../../models/web/user/WebMember');

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
                {
                    $project: {
                        firstName: 1, lastName: 1, email: 1, phone: 1,
                        status: 1, marketingConsent: 1,
                        diaCustomerCode: 1, diaCustomerKey: 1,
                        createdAt: 1, lastLoginAt: 1,
                        orderCount: { $ifNull: [{ $arrayElemAt: ['$orderStats.n', 0] }, 0] }
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

module.exports = router;
