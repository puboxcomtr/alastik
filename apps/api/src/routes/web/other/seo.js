const express = require('express');
const router = express.Router();
const SeoSettings = require('../../../models/admin/settings/SeoSettings');

router.get('/', async (req, res) => {
    try {
        const settings = await SeoSettings.findOne({ site: req.site }).lean();

        if (!settings) {
            return res.json({
                success: true,
                data: null
            });
        }

        res.json({
            success: true,
            data: settings
        });
    } catch (error) {
        console.error('SEO fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'SEO ayarları yüklenirken hata oluştu',
            error: error.message
        });
    }
});

module.exports = router;