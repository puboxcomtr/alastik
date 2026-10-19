const express = require('express');
const router = express.Router();
const SiteSetting = require('../../../models/admin/settings/SiteSetting');
const MediaService = require('../../../services/web/MediaService');
const { invalidatePricingConfig } = require('../../../utils/sitePricing');

const uploadThemeImage = MediaService.createUploader('theme', 'image');

router.get('/:key', async (req, res) => {
    try {
        const { key } = req.params;
        const setting = await SiteSetting.findOne({ key, site: req.site });

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

        const setting = await SiteSetting.findOneAndUpdate(
            { key, site: req.site },
            {
                key,
                site: req.site,
                value,
                category: 'theme',
                updatedAt: new Date()
            },
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true
            }
        );

        if (key === 'theme') invalidatePricingConfig();

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

router.post('/theme/upload', uploadThemeImage, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Dosya yüklenmedi'
            });
        }

        const { type } = req.body;

        const fieldMap = {
            'logo': 'logo',
            'footer-logo': 'footerLogo',
            'ssl': 'footerSslImage',
            'default-catalog': 'defaultCatalogImage',
            'login-popup': 'loginPopupImage'
        };
        const fieldName = fieldMap[type] || type;

        const setting = await SiteSetting.findOne({ key: 'theme', site: req.site });
        const currentValue = setting?.value || {};

        const oldImageUrl = currentValue[fieldName];

        const newImageUrl = MediaService.getFileUrl('theme', req.file.filename);

        currentValue[fieldName] = newImageUrl;

        await SiteSetting.findOneAndUpdate(
            { key: 'theme', site: req.site },
            {
                key: 'theme',
                site: req.site,
                value: currentValue,
                category: 'theme',
                updatedAt: new Date()
            },
            {
                upsert: true,
                new: true
            }
        );
        res.json({
            success: true,
            message: 'Görsel başarıyla yüklendi',
            data: {
                url: newImageUrl,
                type: type,
                fieldName: fieldName
            }
        });
    } catch (error) {
        console.error('Upload hatası:', error);

        if (req.file) {
            MediaService.deleteFile(`/theme/${req.file.filename}`);
        }

        res.status(500).json({
            success: false,
            message: 'Görsel yüklenemedi',
            error: error.message
        });
    }
});

router.delete('/theme/image/:type', async (req, res) => {
    try {
        const { type } = req.params;

        const fieldMap = {
            'logo': 'logo',
            'footer-logo': 'footerLogo',
            'ssl': 'footerSslImage',
            'default-catalog': 'defaultCatalogImage',
            'login-popup': 'loginPopupImage'
        };
        const fieldName = fieldMap[type] || type;

        const setting = await SiteSetting.findOne({ key: 'theme', site: req.site });
        if (!setting || !setting.value[fieldName]) {
            return res.status(404).json({
                success: false,
                message: 'Silinecek görsel bulunamadı'
            });
        }

        const imageUrl = setting.value[fieldName];

        const currentValue = setting.value;
        currentValue[fieldName] = null;

        await SiteSetting.findOneAndUpdate(
            { key: 'theme', site: req.site },
            {
                value: currentValue,
                updatedAt: new Date()
            }
        );

        MediaService.deleteFile(imageUrl);

        res.json({
            success: true,
            message: 'Görsel başarıyla silindi'
        });
    } catch (error) {
        console.error('Silme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Görsel silinemedi',
            error: error.message
        });
    }
});

module.exports = router;