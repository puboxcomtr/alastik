const express = require('express');
const router = express.Router();
const WebSettings = require('../../../models/web/settings/WebSettings');

// GET /api/admin/settings/general - Ayarları getir
router.get('/', async (req, res) => {
    try {
        const settings = await WebSettings.getSettings(req.site);

        res.json({
            success: true,
            data: settings
        });

    } catch (error) {
        console.error('Ayarlar getirme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Ayarlar getirilirken hata oluştu',
            error: error.message
        });
    }
});

// PUT /api/admin/settings/general - Ayarları güncelle
router.put('/', async (req, res) => {
    try {
        const updateData = req.body;

        // Mevcut settings'i al veya oluştur
        let settings = await WebSettings.getSettings(req.site);

        // Her kategoriyi güncelle
        if (updateData.companyInfo) {
            settings.companyInfo = {
                ...settings.companyInfo,
                ...updateData.companyInfo
            };
        }

        if (updateData.emailInfo) {
            settings.emailInfo = {
                ...settings.emailInfo,
                ...updateData.emailInfo
            };
        }

        // Servis noktaları liste olduğu için birleştirilmez, doğrudan değiştirilir
        if (updateData.serviceInfo) {
            settings.serviceInfo = {
                ...(settings.serviceInfo ? settings.serviceInfo.toObject?.() || settings.serviceInfo : {}),
                ...updateData.serviceInfo
            };
        }

        if (updateData.taxInfo) {
            settings.taxInfo = {
                ...settings.taxInfo,
                ...updateData.taxInfo
            };
        }

        if (updateData.legalContracts) {
            settings.legalContracts = {
                ...settings.legalContracts,
                ...updateData.legalContracts
            };
        }

        // Images kategorisini şimdilik atla (sonra upload ekleyeceğiz)

        await settings.save();

        res.json({
            success: true,
            message: 'Ayarlar başarıyla güncellendi',
            data: settings
        });

    } catch (error) {
        console.error('Ayarlar güncelleme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Ayarlar güncellenirken hata oluştu',
            error: error.message
        });
    }
});

module.exports = router;