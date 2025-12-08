// apps/api/src/routes/web/other/theme.js (YENİ DOSYA)
const express = require('express');
const router = express.Router();
const SiteSetting = require('../../../models/admin/settings/SiteSetting');

router.get('/', async (req, res) => {
    try {
        const themeSetting = await SiteSetting.findOne({
            key: 'theme',
            category: 'theme'
        }).lean();

        if (!themeSetting || !themeSetting.value) {
            return res.json({
                success: true,
                data: {
                    defaultCatalogImage: '/assets/img/shop/default-product.jpg'
                }
            });
        }

        res.json({
            success: true,
            data: themeSetting.value
        });
    } catch (error) {
        console.error('❌ Theme ayarları hatası:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;