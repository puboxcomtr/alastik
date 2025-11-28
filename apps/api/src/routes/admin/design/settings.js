// apps/api/src/routes/admin/design/settings.js
const express = require('express');
const router = express.Router();
const SiteSetting = require('../../../models/admin/settings/SiteSetting');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../../../public/theme');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Sadece resim dosyaları yüklenebilir'));
    }
});

// GET ayar
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

// PUT ayar
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
            { key },
            {
                key,
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

// POST - Görsel upload
router.post('/theme/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Dosya yüklenmedi'
            });
        }

        const { type } = req.body;
        const imageUrl = `/uploads/theme/${req.file.filename}`;

        const setting = await SiteSetting.findOne({ key: 'theme' });
        const currentValue = setting?.value || {};

        const fieldMap = {
            'logo': 'logo',
            'footer-logo': 'footerLogo',
            'ssl': 'footerSslImage',
            'default-catalog': 'defaultCatalogImage'
        };

        const fieldName = fieldMap[type] || type;
        currentValue[fieldName] = imageUrl;

        await SiteSetting.findOneAndUpdate(
            { key: 'theme' },
            {
                key: 'theme',
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
            message: 'Görsel yüklendi',
            data: {
                url: imageUrl,
                type: type
            }
        });
    } catch (error) {
        console.error('Upload hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Görsel yüklenemedi',
            error: error.message
        });
    }
});

module.exports = router;