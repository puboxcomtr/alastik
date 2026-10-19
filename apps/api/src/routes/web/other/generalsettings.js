const express = require('express');
const router = express.Router();
const Setting = require('../../../models/admin/settings/Setting');

router.get('/key/:key', async (req, res) => {
    try {
        const { key } = req.params;
        const setting = await Setting.findOne({ key, site: req.site }).lean();

        if (!setting) {
            return res.status(404).json({
                success: false,
                message: 'Ayar bulunamadı'
            });
        }

        res.json({
            success: true,
            data: setting
        });
    } catch (error) {
        console.error('Setting fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Ayar getirilemedi'
        });
    }
});

router.get('/group/:group', async (req, res) => {
    try {
        const { group } = req.params;
        const settings = await Setting.find({ group, site: req.site }).lean();

        res.json({
            success: true,
            data: settings
        });
    } catch (error) {
        console.error('Settings group fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Ayarlar getirilemedi'
        });
    }
});

router.get('/site-status', async (req, res) => {
    try {
        const setting = await Setting.findOne({ key: 'siteStatus', site: req.site }).lean();

        const isActive = setting?.value === '1' || setting?.value === 1;

        res.json({
            success: true,
            isActive: isActive
        });
    } catch (error) {
        console.error('Site status fetch error:', error);
        res.json({
            success: true,
            isActive: true
        });
    }
});

module.exports = router;