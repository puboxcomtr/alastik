const express = require('express');
const router = express.Router();
const SiteSetting = require('../../../models/SiteSetting');

router.get('/:key', async (req, res) => {
    try {
        const { key } = req.params;
        const setting = await SiteSetting.findOne({ key });

        if (!setting) {
            return res.json({
                success: true,
                data: {} 
            });
        }

        res.json({
            success: true,
            data: setting.value
        });
    } catch (error) {
        console.error('Ayar getirme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Ayar getirilemedi',
            error: error.message
        });
    }
});

router.put('/:key', async (req, res) => {
    try {
        const { key } = req.params;
        const { value } = req.body;

        if (!value) {
            return res.status(400).json({
                success: false,
                message: 'Value alanı zorunludur'
            });
        }

        // findOneAndUpdate ile upsert yap
        const setting = await SiteSetting.findOneAndUpdate(
            { key },
            {
                key,
                value,
                category: 'theme',
                updatedAt: new Date()
            },
            {
                upsert: true,  // Yoksa oluştur
                new: true,     // Güncel veriyi dön
                setDefaultsOnInsert: true
            }
        );

        res.json({
            success: true,
            message: 'Ayarlar başarıyla kaydedildi',
            data: setting.value
        });
    } catch (error) {
        console.error('Ayar kaydetme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Ayarlar kaydedilemedi',
            error: error.message
        });
    }
});

module.exports = router;