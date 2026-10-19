const express = require('express');
const router = express.Router();
const WebSettings = require('../../../models/web/settings/WebSettings');

router.get('/', async (req, res) => {
    try {
        const settings = await WebSettings.findOne({ site: req.site }).lean();

        if (!settings) {
            return res.status(404).json({
                success: false,
                message: 'Site ayarları bulunamadı'
            });
        }

        res.json({
            success: true,
            data: settings
        });
    } catch (error) {
        console.error('WebSettings fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Site ayarları yüklenirken hata oluştu',
            error: error.message
        });
    }
});

module.exports = router;