const express = require('express');
const router = express.Router();
const WebTranslation = require('../../../models/web/settings/WebTranslation');

// GET /api/admin/settings/translations
router.get('/', async (req, res) => {
    
    try {
        const { category, search, page = 1, limit = 100 } = req.query;

        let query = { isActive: true, site: req.site };

        if (category && category !== 'all') {
            query.category = category;
        }

        if (search) {
            query.$or = [
                { key: { $regex: search, $options: 'i' } },
                { value: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (page - 1) * limit;

        const [translations, total] = await Promise.all([
            WebTranslation.find(query)
                .sort({ category: 1, key: 1 })
                .skip(skip)
                .limit(parseInt(limit)),
            WebTranslation.countDocuments(query)
        ]);
        const grouped = translations.reduce((acc, item) => {
            if (!acc[item.category]) {
                acc[item.category] = [];
            }
            acc[item.category].push({
                id: item._id,
                key: item.key,
                value: item.value,
                category: item.category,
                description: item.description,
                updatedAt: item.updatedAt
            });
            return acc;
        }, {});

        res.json({
            success: true,
            data: {
                translations,
                grouped,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Çeviriler getirme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Çeviriler getirilirken hata oluştu',
            error: error.message
        });
    }
});

// GET /api/admin/settings/translations/categories
router.get('/categories', async (req, res) => {
    try {
        const categories = await WebTranslation.distinct('category', { isActive: true, site: req.site });

        const categoryCounts = await Promise.all(
            categories.map(async (category) => ({
                name: category,
                count: await WebTranslation.countDocuments({ category, isActive: true, site: req.site })
            }))
        );

        res.json({
            success: true,
            data: categoryCounts
        });

    } catch (error) {
        console.error('Kategori getirme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Kategoriler getirilirken hata oluştu',
            error: error.message
        });
    }
});

// GET /api/admin/settings/translations/:id
router.get('/:id', async (req, res) => {
    try {
        const translation = await WebTranslation.findOne({ _id: req.params.id, site: req.site });

        if (!translation) {
            return res.status(404).json({
                success: false,
                message: 'Çeviri bulunamadı'
            });
        }

        res.json({
            success: true,
            data: translation
        });

    } catch (error) {
        console.error('Çeviri getirme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Çeviri getirilirken hata oluştu',
            error: error.message
        });
    }
});

// POST /api/admin/settings/translations
router.post('/', async (req, res) => {
    try {
        const { key, value, category, description } = req.body;

        if (!key || !value) {
            return res.status(400).json({
                success: false,
                message: 'Anahtar ve değer zorunludur'
            });
        }

        const exists = await WebTranslation.findOne({ key, site: req.site });
        if (exists) {
            return res.status(400).json({
                success: false,
                message: 'Bu anahtar zaten mevcut'
            });
        }

        const translation = new WebTranslation({
            site: req.site,
            key,
            value,
            category: category || 'general',
            description
        });

        await translation.save();

        res.status(201).json({
            success: true,
            message: 'Çeviri başarıyla eklendi',
            data: translation
        });

    } catch (error) {
        console.error('Çeviri ekleme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Çeviri eklenirken hata oluştu',
            error: error.message
        });
    }
});


// PUT /api/admin/settings/translations/:id
router.put('/:id', async (req, res) => {
    try {
        const { value, category, description, isActive } = req.body;

        if (!value) {
            return res.status(400).json({
                success: false,
                message: 'Değer zorunludur'
            });
        }

        const translation = await WebTranslation.findOneAndUpdate(
            { _id: req.params.id, site: req.site },
            {
                value,
                ...(category && { category }),
                ...(description !== undefined && { description }),
                ...(isActive !== undefined && { isActive }),
                updatedAt: new Date()
            },
            { new: true, runValidators: true }
        );

        if (!translation) {
            return res.status(404).json({
                success: false,
                message: 'Çeviri bulunamadı'
            });
        }

        res.json({
            success: true,
            message: 'Çeviri başarıyla güncellendi',
            data: translation
        });

    } catch (error) {
        console.error('Çeviri güncelleme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Çeviri güncellenirken hata oluştu',
            error: error.message
        });
    }
});

// DELETE /api/admin/settings/translations/:id
router.delete('/:id', async (req, res) => {
    try {
        const translation = await WebTranslation.findOneAndUpdate(
            { _id: req.params.id, site: req.site },
            { isActive: false },
            { new: true }
        );

        if (!translation) {
            return res.status(404).json({
                success: false,
                message: 'Çeviri bulunamadı'
            });
        }

        res.json({
            success: true,
            message: 'Çeviri başarıyla silindi',
            data: translation
        });

    } catch (error) {
        console.error('Çeviri silme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Çeviri silinirken hata oluştu',
            error: error.message
        });
    }
});

module.exports = router;