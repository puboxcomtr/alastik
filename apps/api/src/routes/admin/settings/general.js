const express = require('express');
const router = express.Router();
const WebSettings = require('../../../models/web/settings/WebSettings');
const MediaService = require('../../../services/web/MediaService');

// Görsel alanları (Tanımlar > Görseller) — yalnızca bu anahtarlar yüklenebilir
const IMAGE_FIELDS = ['mailLogo', 'favicon'];
const uploadGeneralImage = MediaService.createUploader('general', 'image');

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

        // Görseller: yalnızca tanımlı alanlar, dosya yükleme ayrı uçta (/upload)
        if (updateData.images) {
            const current = settings.images?.toObject?.() || settings.images || {};
            const incoming = {};
            IMAGE_FIELDS.forEach((f) => {
                if (typeof updateData.images[f] === 'string') incoming[f] = updateData.images[f];
            });
            settings.images = { ...current, ...incoming };
        }

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

// POST /api/admin/settings/general/upload - Görsel yükle (body.type: mailLogo | favicon)
router.post('/upload', uploadGeneralImage, async (req, res) => {
    try {
        const { type } = req.body;

        if (!IMAGE_FIELDS.includes(type)) {
            return res.status(400).json({ success: false, message: 'Geçersiz görsel alanı' });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Dosya yüklenmedi' });
        }

        const settings = await WebSettings.getSettings(req.site);
        const oldUrl = settings.images?.[type];
        const newUrl = MediaService.getFileUrl('general', req.file.filename);

        settings.images = { ...(settings.images?.toObject?.() || settings.images || {}), [type]: newUrl };
        await settings.save();

        // Eski dosyayı temizle (başka kayıt kullanmıyorsa — site başına ayrı dosya yüklenir)
        if (oldUrl && oldUrl !== newUrl && oldUrl.startsWith('/general/')) {
            MediaService.deleteFile(oldUrl);
        }

        res.json({ success: true, message: 'Görsel yüklendi', data: { type, url: newUrl, images: settings.images } });
    } catch (error) {
        console.error('Görsel yükleme hatası:', error);
        res.status(500).json({ success: false, message: 'Görsel yüklenirken hata oluştu', error: error.message });
    }
});

// DELETE /api/admin/settings/general/image/:type - Görseli kaldır
router.delete('/image/:type', async (req, res) => {
    try {
        const { type } = req.params;

        if (!IMAGE_FIELDS.includes(type)) {
            return res.status(400).json({ success: false, message: 'Geçersiz görsel alanı' });
        }

        const settings = await WebSettings.getSettings(req.site);
        const oldUrl = settings.images?.[type];

        settings.images = { ...(settings.images?.toObject?.() || settings.images || {}), [type]: '' };
        await settings.save();

        if (oldUrl && oldUrl.startsWith('/general/')) {
            MediaService.deleteFile(oldUrl);
        }

        res.json({ success: true, message: 'Görsel kaldırıldı', data: { type, images: settings.images } });
    } catch (error) {
        console.error('Görsel silme hatası:', error);
        res.status(500).json({ success: false, message: 'Görsel silinirken hata oluştu', error: error.message });
    }
});

module.exports = router;