// apps/api/src/routes/web/other/settings.js
const express = require('express');
const router = express.Router();
const Setting = require('../../../models/admin/settings/Setting');

router.get('/:key', async (req, res) => {
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
        console.error('❌ Ayar getirme hatası:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /api/settings/group/:group - Grup bazlı ayarlar
router.get('/group/:group', async (req, res) => {
    try {
        const { group } = req.params;

        const settings = await Setting.find({ group, site: req.site }).lean();

        if (!settings || settings.length === 0) {
            return res.json({
                success: true,
                data: []
            });
        }

        // Key-value formatına dönüştür
        const settingsObj = {};
        settings.forEach(setting => {
            settingsObj[setting.key] = setting.value;
        });

        res.json({
            success: true,
            data: settingsObj
        });
    } catch (error) {
        console.error('❌ Grup ayarları getirme hatası:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /api/settings
router.get('/', async (req, res) => {
    try {
        const settings = await Setting.find({ site: req.site }).lean();

        // Gruplara göre organize et
        const groupedSettings = {};
        settings.forEach(setting => {
            if (!groupedSettings[setting.group]) {
                groupedSettings[setting.group] = {};
            }
            groupedSettings[setting.group][setting.key] = setting.value;
        });

        res.json({
            success: true,
            data: groupedSettings
        });
    } catch (error) {
        console.error('❌ Ayarlar getirme hatası:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;