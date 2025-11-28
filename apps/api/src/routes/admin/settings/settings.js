const express = require('express');
const router = express.Router();
const Setting = require('../../../models/admin/settings/Setting');

// GET /api/admin/settings/:group - Grup bazlı ayarları getir
router.get('/:group', async (req, res) => {
    try {
        const { group } = req.params;
        
        const settings = await Setting.find({ group }).lean();
        
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
        console.error('Ayarlar getirme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Ayarlar getirilemedi'
        });
    }
});

// PUT /api/admin/settings/:group - Grup bazlı ayarları güncelle
router.put('/:group', async (req, res) => {
    try {
        const { group } = req.params;
        const updates = req.body;

        const bulkOps = [];

        for (const [key, value] of Object.entries(updates)) {
            bulkOps.push({
                updateOne: {
                    filter: { key, group },
                    update: { 
                        $set: { 
                            value,
                            group,
                            type: typeof value === 'boolean' ? 'boolean' : 
                                  typeof value === 'number' ? 'number' : 'string'
                        } 
                    },
                    upsert: true
                }
            });
        }

        if (bulkOps.length > 0) {
            await Setting.bulkWrite(bulkOps);
        }

        res.json({
            success: true,
            message: 'Ayarlar güncellendi'
        });

    } catch (error) {
        console.error('Ayarlar güncelleme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Ayarlar güncellenemedi'
        });
    }
});

// GET /api/admin/settings - Tüm ayarları getir
router.get('/', async (req, res) => {
    try {
        const settings = await Setting.find().lean();
        
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
        console.error('Ayarlar getirme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Ayarlar getirilemedi'
        });
    }
});

module.exports = router;