const express = require('express');
const router = express.Router();
const Setting = require('../../../models/admin/settings/Setting');

router.get('/:group', async (req, res) => {
    try {
        const { group } = req.params;
        
        const settings = await Setting.find({ group, site: req.site }).lean();
        
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

router.put('/:group', async (req, res) => {
    try {
        const { group } = req.params;
        const updates = req.body;

        const bulkOps = [];

        for (const [key, value] of Object.entries(updates)) {
            bulkOps.push({
                updateOne: {
                    filter: { key, site: req.site },
                    update: {
                        $set: {
                            value,
                            group,
                            site: req.site,
                            type: typeof value === 'boolean' ? 'boolean' :
                                  typeof value === 'number' ? 'number' :
                                  (value !== null && typeof value === 'object') ? 'json' : 'string'
                        }
                    },
                    upsert: true
                }
            });
        }

        if (bulkOps.length > 0) {
            await Setting.bulkWrite(bulkOps);
        }

        const filigranDegisti = require('../../../services/media/WatermarkService').AYAR_ANAHTARLARI
            .some(key => Object.prototype.hasOwnProperty.call(updates, key));

        if (filigranDegisti) {
            try {
                require('../../../services/media/WatermarkService').onbellegiSil(req.site);
            } catch (error) {
                console.error('Filigran önbelleği temizlenemedi:', error.message);
            }
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

router.get('/', async (req, res) => {
    try {
        const settings = await Setting.find({ site: req.site }).lean();
        
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