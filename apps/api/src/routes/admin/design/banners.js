const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const Banner = require('../../../models/admin/design/Banner');

const uploadsDir = path.join(__dirname, '../../../../public/banners');

const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        try {
            await fs.mkdir(uploadsDir, { recursive: true });
            cb(null, uploadsDir);
        } catch (error) {
            cb(error, null);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'banner-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Sadece resim dosyaları yüklenebilir'));
        }
    }
});

router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const banner = await Banner.findOne({ _id: id, site: req.site });
        if (!banner) {
            return res.status(404).json({
                success: false,
                message: 'Banner bulunamadı'
            });
        }

        res.json({
            success: true,
            data: banner
        });
    } catch (error) {
        console.error('Banner getirme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Banner getirilemedi',
            error: error.message
        });
    }
});

router.get('/', async (req, res) => {
    try {
        const { status } = req.query;
        const filter = { site: req.site };
        if (status) filter.status = status;

        const banners = await Banner.find(filter)
            .sort({ order: 1, createdAt: -1 })
            .lean();

        res.json({
            success: true,
            data: banners
        });
    } catch (error) {
        console.error('Banner listele hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Bannerlar listelenemedi',
            error: error.message
        });
    }
});

router.post('/', upload.single('image'), async (req, res) => {
    try {
        const { description, redirectUrl, altTag, status, openNewTab, variableKey, order } = req.body;

        if (!description || !description.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Açıklama zorunludur'
            });
        }

        if (!variableKey || !variableKey.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Değişken adı zorunludur'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Resim zorunludur'
            });
        }

        const existingBanner = await Banner.findOne({ variableKey: variableKey.trim(), site: req.site });
        if (existingBanner) {
            return res.status(400).json({
                success: false,
                message: 'Bu değişken adı zaten kullanılıyor'
            });
        }

        const newBanner = new Banner({
            site: req.site,
            description: description.trim(),
            redirectUrl: redirectUrl?.trim() || '',
            altTag: altTag?.trim() || '',
            status: status || 'active',
            openNewTab: openNewTab === 'true',
            image: `/uploads/banners/${req.file.filename}`,
            variableKey: variableKey.trim(),
            order: parseInt(order) || 0
        });

        await newBanner.save();

        res.status(201).json({
            success: true,
            message: 'Banner başarıyla oluşturuldu',
            data: newBanner
        });
    } catch (error) {
        console.error('Banner oluşturma hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Banner oluşturulamadı',
            error: error.message
        });
    }
});

router.put('/:id', upload.single('image'), async (req, res) => {
    try {
        const { id } = req.params;
        const { description, redirectUrl, altTag, status, openNewTab, variableKey, order } = req.body;

        const banner = await Banner.findOne({ _id: id, site: req.site });
        if (!banner) {
            return res.status(404).json({
                success: false,
                message: 'Banner bulunamadı'
            });
        }

        if (!description || !description.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Açıklama zorunludur'
            });
        }

        if (!variableKey || !variableKey.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Değişken adı zorunludur'
            });
        }

        if (variableKey.trim() !== banner.variableKey) {
            const existingBanner = await Banner.findOne({
                variableKey: variableKey.trim(),
                site: req.site,
                _id: { $ne: banner._id }
            });
            if (existingBanner) {
                return res.status(400).json({
                    success: false,
                    message: 'Bu değişken adı zaten kullanılıyor'
                });
            }
        }

        if (req.file) {
            if (banner.image) {
                const oldImagePath = path.join(__dirname, '../../../../public', banner.image);
                try {
                    await fs.unlink(oldImagePath);
                } catch (err) {
                    console.error('Eski resim silinemedi:', err);
                }
            }
            banner.image = `/uploads/banners/${req.file.filename}`;
        }

        banner.description = description.trim();
        banner.redirectUrl = redirectUrl?.trim() || '';
        banner.altTag = altTag?.trim() || '';
        banner.status = status || 'active';
        banner.openNewTab = openNewTab === 'true';
        banner.variableKey = variableKey.trim();
        banner.order = parseInt(order) || 0;

        await banner.save();

        res.json({
            success: true,
            message: 'Banner başarıyla güncellendi',
            data: banner
        });
    } catch (error) {
        console.error('Banner güncelleme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Banner güncellenemedi',
            error: error.message
        });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const banner = await Banner.findOne({ _id: id, site: req.site });
        if (!banner) {
            return res.status(404).json({
                success: false,
                message: 'Banner bulunamadı'
            });
        }

        if (banner.image) {
            const imagePath = path.join(__dirname, '../../../../public', banner.image);
            try {
                await fs.unlink(imagePath);
            } catch (err) {
                console.error('Resim silinirken hata:', err);
            }
        }

        await Banner.findOneAndDelete({ _id: id, site: req.site });

        res.json({
            success: true,
            message: 'Banner başarıyla silindi'
        });
    } catch (error) {
        console.error('Banner silme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Banner silinemedi',
            error: error.message
        });
    }
});

module.exports = router;