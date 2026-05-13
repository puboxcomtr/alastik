const express = require('express');
const router = express.Router();
const WebReview = require('../../../models/web/user/WebReview');
const WebMember = require('../../../models/web/user/WebMember');
const WebProduct = require('../../../models/web/catalog/WebProduct');
const authMiddleware = require('../../../middleware/authMiddleware');

router.get('/my', authMiddleware, async (req, res) => {
    try {
        const userId = req.user._id;

        const reviews = await WebReview.find({ userId })
            .sort({ createdAt: -1 })
            .lean();

        // Ürün bilgilerini çek
        const productKeys = reviews.map(r => r.productKey).filter(Boolean);
        const products = await WebProduct.find(
            { _key: { $in: productKeys } },
            { _key: 1, 'diaData.aciklama': 1, 'diaData.marka': 1, 'diaData.m_resimler': 1, 'customData.seoUrl': 1, 'customData.featuredImage': 1, 'customData.customImages': 1 }
        ).lean();

        const productMap = {};
        products.forEach(p => {
            let image = null;
            if (p.customData?.customImages?.length > 0) {
                const sorted = [...p.customData.customImages].sort((a, b) => (a.order || 0) - (b.order || 0));
                if (sorted[0]?.url) image = sorted[0].url;
            }
            if (!image && p.customData?.featuredImage) image = p.customData.featuredImage;
            if (!image && p.diaData?.m_resimler?.length > 0) {
                const sorted = [...p.diaData.m_resimler].sort((a, b) => parseInt(a.order_id || '999') - parseInt(b.order_id || '999'));
                if (sorted[0]?.aws_url) image = sorted[0].aws_url;
            }
            productMap[p._key] = {
                name: p.diaData?.aciklama || '',
                brand: p.diaData?.marka || '',
                image,
                seoUrl: p.customData?.seoUrl || null
            };
        });

        const result = reviews.map(r => ({
            ...r,
            product: productMap[r.productKey] || null
        }));

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Kullanıcı yorumları hatası:', error);
        res.status(500).json({ success: false, message: 'Yorumlar yüklenemedi' });
    }
});


// GET /api/reviews/top - Ana sayfa icin en iyi yorumlar
router.get('/top', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const reviews = await WebReview.find({
            status: 'active',
            overallRating: { $gte: 4 }
        })
            .sort({ createdAt: -1 })
            .limit(limit * 3)
            .select('displayName overallRating comment tireSize productKey createdAt')
            .lean();

        const productKeys = reviews.map(r => r.productKey).filter(Boolean);

        // Sadece aktif ürünleri çek
        const products = await WebProduct.find({
            _key: { $in: productKeys },
            'diaData.durum': 'A'
        })
            .select('_key diaData.aciklama diaData.marka diaData.m_resimler customData.seoUrl customData.featuredImage customData.customImages')
            .lean();

        const productMap = {};
        products.forEach(p => {
            let image = null;
            if (p.customData?.customImages?.length > 0) {
                const sorted = [...p.customData.customImages].sort((a, b) => (a.order || 0) - (b.order || 0));
                if (sorted[0]?.url) image = sorted[0].url;
            }
            if (!image && p.customData?.featuredImage) image = p.customData.featuredImage;
            if (!image && p.diaData?.m_resimler?.length > 0) {
                const sorted = [...p.diaData.m_resimler].sort((a, b) =>
                    parseInt(a.order_id || '999') - parseInt(b.order_id || '999')
                );
                if (sorted[0]?.aws_url) image = sorted[0].aws_url;
            }
            productMap[p._key] = {
                name: p.diaData?.aciklama || '',
                brand: p.diaData?.marka || '',
                image,
                seoUrl: p.customData?.seoUrl || ''
            };
        });

        // Sadece aktif ürünü olan yorumları döndür, limit'e göre kes
        const data = reviews
            .filter(r => productMap[r.productKey])
            .slice(0, limit)
            .map(r => ({
                _id: r._id,
                displayName: r.displayName,
                overallRating: r.overallRating,
                comment: r.comment,
                tireSize: r.tireSize,
                createdAt: r.createdAt,
                product: productMap[r.productKey]
            }));

        res.json({ success: true, data });
    } catch (error) {
        console.error('Top reviews hatası:', error);
        res.status(500).json({ success: false, message: 'Yorumlar yüklenemedi' });
    }
});

// GET /api/reviews/:productKey - Ürün yorumları + istatistik
router.get('/:productKey', async (req, res) => {
    try {
        const { productKey } = req.params;
        const { page = 1, limit = 10, status = 'active' } = req.query;

        // Toplam yorum sayısı
        const totalReviews = await WebReview.countDocuments({
            productKey,
            status
        });

        // Yorumları getir (kullanıcı bilgileriyle birlikte)
        const reviews = await WebReview.find({ productKey, status })
            .populate('userId', 'firstName lastName')
            .sort({ createdAt: -1 })
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit))
            .lean();

        // İstatistik hesapla
        const stats = await WebReview.aggregate([
            { $match: { productKey, status } },
            {
                $group: {
                    _id: null,
                    averageOverall: { $avg: '$overallRating' },
                    averageDrivingComfort: { $avg: '$drivingComfort' },
                    averageNoise: { $avg: '$noise' },
                    averageBraking: { $avg: '$braking' },
                    averageQuality: { $avg: '$quality' },
                    averageFuelEfficiency: { $avg: '$fuelEfficiency' },
                    averageWetGrip: { $avg: '$wetGrip' },
                    averageSnowGrip: { $avg: '$snowGrip' },
                    averageIceGrip: { $avg: '$iceGrip' },
                    averageEasyMount: { $avg: '$easyMount' },
                    averageHillPerformance: { $avg: '$hillPerformance' },
                    averageChainComfort: { $avg: '$chainComfort' },
                    averageChainQuality: { $avg: '$chainQuality' },
                    total: { $sum: 1 }
                }
            }
        ]);

        // Yıldız dağılımı (1-5)
        const ratingDistribution = await WebReview.aggregate([
            { $match: { productKey, status } },
            {
                $group: {
                    _id: '$overallRating',
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: -1 } }
        ]);

        // Dağılımı obje formatına çevir
        const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        ratingDistribution.forEach(item => {
            distribution[item._id] = item.count;
        });

        res.json({
            success: true,
            data: {
                reviews: reviews.map(review => ({
                    ...review,
                    displayName: review.displayName || null,
                    user: review.displayName ? {
                        firstName: review.displayName.split(' ')[0],
                        lastName: review.displayName.split(' ').slice(1).join(' ')
                    } : {
                        firstName: review.userId?.firstName,
                        lastName: review.userId?.lastName
                    }
                })),
                stats: stats.length > 0 ? {
                    averageOverall: stats[0].averageOverall ? parseFloat(stats[0].averageOverall.toFixed(1)) : 0,
                    averageDrivingComfort: stats[0].averageDrivingComfort ? parseFloat(stats[0].averageDrivingComfort.toFixed(1)) : 0,
                    averageNoise: stats[0].averageNoise ? parseFloat(stats[0].averageNoise.toFixed(1)) : 0,
                    averageBraking: stats[0].averageBraking ? parseFloat(stats[0].averageBraking.toFixed(1)) : 0,
                    averageQuality: stats[0].averageQuality ? parseFloat(stats[0].averageQuality.toFixed(1)) : 0,
                    averageFuelEfficiency: stats[0].averageFuelEfficiency ? parseFloat(stats[0].averageFuelEfficiency.toFixed(1)) : 0,
                    averageWetGrip: stats[0].averageWetGrip ? parseFloat(stats[0].averageWetGrip.toFixed(1)) : 0,
                    // Kar Paleti
                    averageSnowGrip: stats[0].averageSnowGrip ? parseFloat(stats[0].averageSnowGrip.toFixed(1)) : 0,
                    averageIceGrip: stats[0].averageIceGrip ? parseFloat(stats[0].averageIceGrip.toFixed(1)) : 0,
                    averageEasyMount: stats[0].averageEasyMount ? parseFloat(stats[0].averageEasyMount.toFixed(1)) : 0,
                    averageHillPerformance: stats[0].averageHillPerformance ? parseFloat(stats[0].averageHillPerformance.toFixed(1)) : 0,
                    averageChainComfort: stats[0].averageChainComfort ? parseFloat(stats[0].averageChainComfort.toFixed(1)) : 0,
                    averageChainQuality: stats[0].averageChainQuality ? parseFloat(stats[0].averageChainQuality.toFixed(1)) : 0,
                    total: totalReviews
                } : {
                    averageOverall: 0,
                    total: 0
                },
                distribution,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalReviews / parseInt(limit)),
                    totalReviews,
                    limit: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error('Yorumları getirme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Yorumlar yüklenirken hata oluştu',
            error: error.message
        });
    }
});

// POST /api/reviews - Yeni yorum ekle
router.post('/', async (req, res) => {
    try {
        const {
            productKey,
            userId,
            overallRating,
            drivingComfort,
            noise,
            braking,
            quality,
            fuelEfficiency,
            wetGrip,
            // Kar Paleti
            snowGrip,
            iceGrip,
            easyMount,
            hillPerformance,
            chainComfort,
            chainQuality,
            comment,
            source,
            tireSize,
            mileage
        } = req.body;

        const user = await WebMember.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Kullanıcı bulunamadı'
            });
        }

        const existingReview = await WebReview.findOne({ productKey, userId });
        if (existingReview) {
            return res.status(400).json({
                success: false,
                message: 'Bu ürüne daha önce yorum yaptınız'
            });
        }

        // Yeni yorum oluştur
        const newReview = new WebReview({
            productKey,
            userId,
            overallRating,
            // Lastik özellikleri
            drivingComfort,
            noise,
            braking,
            quality,
            fuelEfficiency,
            wetGrip,
            // Kar Paleti özellikleri
            snowGrip,
            iceGrip,
            easyMount,
            hillPerformance,
            chainComfort,
            chainQuality,
            // Diğer
            comment,
            source: source || 'ALastik',
            tireSize,
            mileage,
            status: 'pending'
        });

        await newReview.save();

        res.status(201).json({
            success: true,
            message: 'Yorumunuz başarıyla gönderildi. Onaylandıktan sonra yayınlanacaktır.',
            data: newReview
        });

    } catch (error) {
        console.error('Yorum ekleme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Yorum eklenirken hata oluştu',
            error: error.message
        });
    }
});

module.exports = router;