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
            [`siteSettings.${req.site}.webVisible`]: true,
            [`siteSettings.${req.site}.productCount`]: { $gt: 0 }
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
            [`siteSettings.${req.site}.webVisible`]: true,
            [`siteSettings.${req.site}.productCount`]: { $gt: 0 }
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
        category.description = sc.description ?? category.description;
        category.sliderId = sc.sliderId !== undefined ? sc.sliderId : category.sliderId;
        category.menuIds = (sc.menuIds && sc.menuIds.length) ? sc.menuIds : (sc.menuId ? [sc.menuId] : []);
        category.priceDisplay = sc.priceDisplay || 'dahil';
        category.vatRate = sc.vatRate ?? 20;
        category.hideStockCode = sc.hideStockCode === true;
        if (sc.seoKeywords && sc.seoKeywords.length) category.seoKeywords = sc.seoKeywords;
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
            [`siteSettings.${req.site}.webVisible`]: true,
            [`siteSettings.${req.site}.productCount`]: { $gt: 0 }
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
        category.description = sc.description ?? category.description;
        category.sliderId = sc.sliderId !== undefined ? sc.sliderId : category.sliderId;
        category.menuIds = (sc.menuIds && sc.menuIds.length) ? sc.menuIds : (sc.menuId ? [sc.menuId] : []);
        category.priceDisplay = sc.priceDisplay || 'dahil';
        category.vatRate = sc.vatRate ?? 20;
        category.hideStockCode = sc.hideStockCode === true;
        if (sc.seoKeywords && sc.seoKeywords.length) category.seoKeywords = sc.seoKeywords;
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