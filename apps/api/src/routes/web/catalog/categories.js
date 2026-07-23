const express = require('express');
const router = express.Router();
const WebCategory = require('../../../models/web/catalog/WebCategory');

// İsme göre kategori arama (Breadcrumb)
router.get('/search/by-name', async (req, res) => {
    try {
        const { name } = req.query;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Kategori adı gerekli'
            });
        }
        const category = await WebCategory.findOne({
            $or: [
                { name: name },
                { diaCategory: name }
            ],
            webVisible: true
        }).select('name slug seoUrl diaCategory').lean();

        if (!category) {
            return res.json({
                success: false,
                data: null
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
router.get('/slug/:slug/size/:size', async (req, res) => {
    try {
        let { slug, size } = req.params;
        if (slug === 'tum-lastikler') {
            slug = 'lastik';
        }
        const category = await WebCategory.findOne({
            slug,
            webVisible: true
        }).lean();
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Kategori bulunamadı'
            });
        }
        const sc = category.siteContent?.[req.site] || {};
        category.seoTitle = sc.seoTitle || category.seoTitle;
        category.seoDescription = sc.seoDescription || category.seoDescription;
        category.siteContentHtml = sc.content || '';
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

router.get('/slug/:slug', async (req, res) => {
    try {
        let { slug } = req.params;
        if (slug === 'tum-lastikler') {
            slug = 'lastik';
        }
        const category = await WebCategory.findOne({
            slug,
            webVisible: true
        }).lean();
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Kategori bulunamadı'
            });
        }
        const sc = category.siteContent?.[req.site] || {};
        category.seoTitle = sc.seoTitle || category.seoTitle;
        category.seoDescription = sc.seoDescription || category.seoDescription;
        category.siteContentHtml = sc.content || '';
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

router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
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