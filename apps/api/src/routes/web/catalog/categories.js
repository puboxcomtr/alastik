// apps/api/src/routes/web/catalog/categories.js

const express = require('express');
const router = express.Router();
const WebCategory = require('../../../models/web/catalog/WebCategory');

router.get('/slug/:slug/size/:size', async (req, res) => {
    try {
        let { slug, size } = req.params;

        if (slug === 'tum-lastikler') {
            slug = 'lastik';
        }

        console.log('🔍 Kategori + Ebat:', { slug, size });

        const category = await WebCategory.findOne({
            slug,
            webVisible: true
        }).lean();

        if (!category) {
            console.log('❌ Kategori bulunamadı');
            return res.status(404).json({
                success: false,
                message: 'Kategori bulunamadı'
            });
        }

        console.log('✅ Kategori + Ebat bulundu:', category.name);

        res.json({
            success: true,
            data: category
        });

    } catch (error) {
        console.error('❌ Hata:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
router.get('/slug/:slug', async (req, res) => {
    try {
        let { slug } = req.params;

        if (slug === 'tum-lastikler') {
            slug = 'lastik';
        }

        console.log('🔍 Kategori aranıyor:', slug);

        const category = await WebCategory.findOne({
            slug,
            webVisible: true
        }).lean();

        if (!category) {
            console.log('❌ Kategori bulunamadı:', slug);
            return res.status(404).json({
                success: false,
                message: 'Kategori bulunamadı'
            });
        }

        console.log('✅ Kategori bulundu:', category.name);

        res.json({
            success: true,
            data: category
        });

    } catch (error) {
        console.error('❌ Kategori hatası:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        console.log('🔍 ID ile kategori:', id);

        const category = await WebCategory.findById(id)
            .select('name slug seoUrl')
            .lean();

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Kategori bulunamadı'
            });
        }

        res.json({
            success: true,
            data: category
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;