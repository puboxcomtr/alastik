const express = require('express');
const router = express.Router();
const Page = require('../../../models/admin/content/Page');

/**
 * GET /api/admin/pages
 * Sayfa listesi
 */
router.get('/', async (req, res) => {
    try {
        const { search, status } = req.query;

        const query = { site: req.site };

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
        const page = await Page.findOne({ _id: req.params.id, site: req.site }).lean();

        if (!page) {
            return res.status(404).json({
                success: false,
                message: 'Sayfa bulunamadı'
            });
        }

        // Content'i olduğu gibi gönder, encode etme
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
        const existingPage = await Page.findOne({ slug: req.body.slug, site: req.site });
        if (existingPage) {
            return res.status(400).json({
                success: false,
                message: 'Bu URL zaten kullanılıyor'
            });
        }

        const page = new Page({ ...req.body, site: req.site });
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
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('🔥 BACKEND - Gelen Content:', req.body.content.substring(0, 200))
        console.log('🔥 BACKEND - Content Length:', req.body.content.length)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

        // Eğer slug değiştiriliyorsa...
        if (req.body.slug) {
            const existingPage = await Page.findOne({
                slug: req.body.slug,
                site: req.site,
                _id: { $ne: req.params.id }
            });

            if (existingPage) {
                return res.status(400).json({
                    success: false,
                    message: 'Bu URL zaten başka bir sayfa tarafından kullanılıyor'
                });
            }
        }

        // site alanı gövdeden ayıklanır; kayıt başka siteye taşınamaz
        const { site: _ignoredSite, ...pagePayload } = req.body || {};

        const page = await Page.findOneAndUpdate(
            { _id: req.params.id, site: req.site },
            pagePayload,
            { new: true, runValidators: true }
        );

        console.log('🔥 BACKEND - Kaydedilen Content:', page.content.substring(0, 200))

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
        const page = await Page.findOneAndDelete({ _id: req.params.id, site: req.site });

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