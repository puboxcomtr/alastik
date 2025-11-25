// apps/api/src/routes/web/catalog/brands.js
const express = require('express');
const router = express.Router();
const WebBrand = require('../../../models/WebBrand');

/**
 * GET /api/brands/homepage
 * Anasayfada gösterilecek markaları getirir
 * ÖNEMLİ: Bu route /:brandName'den ÖNCE olmalı
 */
router.get('/homepage', async (req, res) => {
    try {
        const brands = await WebBrand.find({
            webVisible: true,
            showOnHomepage: true
        })
            .select('name slug seoUrl logo.url logo.alt productCount')
            .sort({ homepageOrder: 1, name: 1 })
            .lean();

        const formattedBrands = brands.map(brand => ({
            _id: brand._id,
            name: brand.name,
            slug: brand.slug,
            seoUrl: brand.seoUrl || brand.slug,
            logo: brand.logo?.url || null,
            logoAlt: brand.logo?.alt || `${brand.name} Logo`,
            productCount: brand.productCount || 0
        }));

        res.json({
            success: true,
            data: formattedBrands,
            count: formattedBrands.length
        });

    } catch (error) {
        console.error('Homepage brands error:', error);
        res.status(500).json({
            success: false,
            message: 'Markalar yüklenirken hata oluştu',
            error: error.message
        });
    }
});

router.get('/:brandName', async (req, res) => {
    try {
        const { brandName } = req.params;

        const brand = await WebBrand.findOne({
            $or: [
                { diaBrand: brandName },
                { diaMarkaAck: brandName },
                { name: brandName }
            ],
            webVisible: true
        })
            .select('name diaMarkaAck logo')
            .lean();

        if (!brand) {
            return res.json({
                success: true,
                data: null
            });
        }

        res.json({
            success: true,
            data: {
                name: brand.diaMarkaAck || brand.name,
                logo: brand.logo?.url || null
            }
        });
    } catch (error) {
        console.error('Brand fetch error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;