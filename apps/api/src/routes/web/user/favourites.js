const express = require('express');
const router = express.Router();
const WebFavourite = require('../../../models/web/user/WebFavourite');
const WebProduct = require('../../../models/web/catalog/WebProduct');
const authMiddleware = require('../../../middleware/authMiddleware');

// Tüm route'lar auth gerektirir
router.use(authMiddleware);

// POST /api/favourites/toggle - Favori ekle/çıkar
router.post('/toggle', async (req, res) => {
    try {
        const { productKey } = req.body;
        const memberId = req.user._id;

        if (!productKey) {
            return res.status(400).json({
                success: false,
                message: 'Ürün anahtarı gerekli.'
            });
        }

        // Ürün var mı kontrol et
        const product = await WebProduct.findOne({ _key: productKey });
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Ürün bulunamadı.'
            });
        }

        // Favori var mı kontrol et
        const existing = await WebFavourite.findOne({ memberId, productKey });

        if (existing) {
            // Varsa çıkar
            await WebFavourite.deleteOne({ _id: existing._id });

            const count = await WebFavourite.countDocuments({ memberId });

            return res.json({
                success: true,
                message: 'Ürün favorilerden çıkarıldı.',
                data: {
                    isFavourite: false,
                    totalCount: count
                }
            });
        }

        // Yoksa ekle
        await WebFavourite.create({ memberId, productKey });

        const count = await WebFavourite.countDocuments({ memberId });

        res.json({
            success: true,
            message: 'Ürün favorilere eklendi.',
            data: {
                isFavourite: true,
                totalCount: count
            }
        });

    } catch (error) {
        console.error('Favori toggle hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Bir hata oluştu.'
        });
    }
});

// GET /api/favourites - Kullanıcının favorilerini listele
router.get('/', async (req, res) => {
    try {
        const memberId = req.member._id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const [favourites, total] = await Promise.all([
            WebFavourite.find({ memberId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            WebFavourite.countDocuments({ memberId })
        ]);

        // Ürün detaylarını getir
        const productKeys = favourites.map(f => f.productKey);
        const products = await WebProduct.find({ _key: { $in: productKeys } }).lean();

        // Ürünleri favori sırasına göre eşle
        const productMap = {};
        products.forEach(p => { productMap[p._key] = p; });

        const result = favourites
            .map(fav => {
                const product = productMap[fav.productKey];
                if (!product) return null;
                return {
                    ...product,
                    favouriteId: fav._id,
                    favouriteDate: fav.createdAt
                };
            })
            .filter(Boolean);

        res.json({
            success: true,
            data: {
                items: result,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Favori listeleme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Bir hata oluştu.'
        });
    }
});

// GET /api/favourites/check?keys=key1,key2,key3 - Toplu favori kontrolü
router.get('/check', async (req, res) => {
    try {
        const memberId = req.member._id;
        const keys = req.query.keys ? req.query.keys.split(',') : [];

        if (!keys.length) {
            return res.json({
                success: true,
                data: {}
            });
        }

        const favourites = await WebFavourite.find({
            memberId,
            productKey: { $in: keys }
        }).select('productKey').lean();

        const result = {};
        favourites.forEach(f => { result[f.productKey] = true; });

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('Favori kontrol hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Bir hata oluştu.'
        });
    }
});

module.exports = router;