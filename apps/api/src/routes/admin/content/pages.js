const express = require('express');
const router = express.Router();
const Page = require('../../../models/Page');

/**
 * GET /api/admin/pages
 * Sayfa listesi
 */
router.get('/', async (req, res) => {
    try {
        const { search, status } = req.query;

        const query = {};

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { slug: { $regex: search, $options: 'i' } }
            ];
        }

        if (status) {
            query.status = status;
        }

        const pages = await Page.find(query)
            .sort({ createdAt: -1 })
            .lean();

        res.json({
            success: true,
            data: pages
        });

    } catch (error) {
        console.error('Sayfa listesi hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Sayfalar listelenemedi'
        });
    }
});

/**
 * GET /api/admin/pages/:id
 * Sayfa detayı
 */
router.get('/:id', async (req, res) => {
    try {
        const page = await Page.findById(req.params.id);

        if (!page) {
            return res.status(404).json({
                success: false,
                message: 'Sayfa bulunamadı'
            });
        }

        res.json({
            success: true,
            data: page
        });

    } catch (error) {
        console.error('Sayfa detay hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Sayfa detayı alınamadı'
        });
    }
});

/**
 * POST /api/admin/pages
 * Yeni sayfa oluştur
 */
router.post('/', async (req, res) => {
    try {
        // Slug kontrolü
        const existingPage = await Page.findOne({ slug: req.body.slug });
        if (existingPage) {
            return res.status(400).json({
                success: false,
                message: 'Bu URL zaten kullanılıyor'
            });
        }

        const page = new Page(req.body);
        await page.save();

        res.status(201).json({
            success: true,
            message: 'Sayfa oluşturuldu',
            data: page
        });

    } catch (error) {
        console.error('Sayfa oluşturma hatası:', error);

        // MongoDB duplicate key hatası
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Bu URL zaten kullanılıyor'
            });
        }

        res.status(500).json({
            success: false,
            message: error.message || 'Sayfa oluşturulamadı'
        });
    }
});

/**
 * PUT /api/admin/pages/:id
 * Sayfa güncelle
 */
router.put('/:id', async (req, res) => {
    try {
        // Eğer slug değiştiriliyorsa, başka bir sayfada kullanılıp kullanılmadığını kontrol et
        if (req.body.slug) {
            const existingPage = await Page.findOne({
                slug: req.body.slug,
                _id: { $ne: req.params.id }
            });

            if (existingPage) {
                return res.status(400).json({
                    success: false,
                    message: 'Bu URL zaten başka bir sayfa tarafından kullanılıyor'
                });
            }
        }

        const page = await Page.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!page) {
            return res.status(404).json({
                success: false,
                message: 'Sayfa bulunamadı'
            });
        }

        res.json({
            success: true,
            message: 'Sayfa güncellendi',
            data: page
        });

    } catch (error) {
        console.error('Sayfa güncelleme hatası:', error);

        // MongoDB duplicate key hatası
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Bu URL zaten kullanılıyor'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Sayfa güncellenemedi'
        });
    }
});

/**
 * DELETE /api/admin/pages/:id
 * Sayfa sil
 */
router.delete('/:id', async (req, res) => {
    try {
        const page = await Page.findByIdAndDelete(req.params.id);

        if (!page) {
            return res.status(404).json({
                success: false,
                message: 'Sayfa bulunamadı'
            });
        }

        res.json({
            success: true,
            message: 'Sayfa silindi'
        });

    } catch (error) {
        console.error('Sayfa silme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Sayfa silinemedi'
        });
    }
});

module.exports = router;