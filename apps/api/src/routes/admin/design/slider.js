const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const Slider = require('../../../models/Slider');

// Multer config
const uploadsDir = path.join(__dirname, '../../../../public/sliders');

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
        cb(null, 'slider-' + uniqueSuffix + path.extname(file.originalname));
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
        const slider = await Slider.findById(id);
        if (!slider) {
            return res.status(404).json({
                success: false,
                message: 'Slider bulunamadı'
            });
        }

        res.json({
            success: true,
            data: slider
        });
    } catch (error) {
        console.error('Slider getirme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Slider getirilemedi',
            error: error.message
        });
    }
});

// Slider listele
router.get('/', async (req, res) => {
    try {
        const sliders = await Slider.find()
            .sort({ createdAt: -1 })
            .lean();

        res.json({
            success: true,
            data: sliders
        });
    } catch (error) {
        console.error('Slider listele hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Slider listelenemedi',
            error: error.message
        });
    }
});

// Yeni slider oluştur
router.post('/', upload.array('images', 10), async (req, res) => {
    try {
        console.log('Request body:', req.body);
        console.log('Files:', req.files);

        const { name, sliders, settings } = req.body;

        // Validasyon
        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Slider adı zorunludur'
            });
        }

        // Parse et
        const parsedSliders = typeof sliders === 'string' ? JSON.parse(sliders) : sliders;
        const parsedSettings = typeof settings === 'string' ? JSON.parse(settings) : settings || {};

        if (!parsedSliders || parsedSliders.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'En az bir slider eklemelisiniz'
            });
        }

        // Upload edilen görselleri sliders'a ata
        if (req.files && req.files.length > 0) {
            req.files.forEach((file, index) => {
                if (parsedSliders[index]) {
                    parsedSliders[index].image = `/uploads/sliders/${file.filename}`;
                }
            });
        }

        // Her slider için validasyon
        for (let i = 0; i < parsedSliders.length; i++) {
            const slider = parsedSliders[i];
            if (!slider.image) {
                return res.status(400).json({
                    success: false,
                    message: `${i + 1}. slider için görsel zorunludur`
                });
            }
            if (!slider.description || !slider.description.trim()) {
                return res.status(400).json({
                    success: false,
                    message: `${i + 1}. slider için açıklama zorunludur`
                });
            }
        }

        const newSlider = new Slider({
            name: name.trim(),
            sliders: parsedSliders,
            settings: parsedSettings // ← Bu eklendi
        });

        await newSlider.save();

        res.status(201).json({
            success: true,
            message: 'Slider başarıyla oluşturuldu',
            data: newSlider
        });
    } catch (error) {
        console.error('Slider oluşturma hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Slider oluşturulamadı',
            error: error.message
        });
    }
});

// Slider güncelle
router.put('/:id', upload.array('images', 10), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, sliders, settings } = req.body;

        const slider = await Slider.findById(id);
        if (!slider) {
            return res.status(404).json({
                success: false,
                message: 'Slider bulunamadı'
            });
        }

        const parsedSliders = typeof sliders === 'string' ? JSON.parse(sliders) : sliders;
        const parsedSettings = typeof settings === 'string' ? JSON.parse(settings) : settings || {};

        let imageIndex = 0;
        parsedSliders.forEach((sliderItem) => {
            if (!sliderItem.existingImage && req.files && req.files[imageIndex]) {
                sliderItem.image = `/uploads/sliders/${req.files[imageIndex].filename}`;
                imageIndex++;
            } else if (sliderItem.existingImage) {
                sliderItem.image = sliderItem.existingImage;
            }
            delete sliderItem.existingImage;
        });

        slider.name = name;
        slider.sliders = parsedSliders;
        slider.settings = parsedSettings;

        await slider.save();

        res.json({
            success: true,
            message: 'Slider başarıyla güncellendi',
            data: slider
        });
    } catch (error) {
        console.error('Slider güncelleme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Slider güncellenemedi',
            error: error.message
        });
    }
});

// Slider sil
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const slider = await Slider.findByIdAndDelete(id);

        if (!slider) {
            return res.status(404).json({
                success: false,
                message: 'Slider bulunamadı'
            });
        }

        // Görselleri sil
        for (const item of slider.sliders) {
            if (item.image) {
                try {
                    const imagePath = path.join(__dirname, '../../../public', item.image);
                    await fs.unlink(imagePath);
                } catch (err) {
                    console.error('Görsel silinirken hata:', err);
                }
            }
        }

        res.json({
            success: true,
            message: 'Slider başarıyla silindi'
        });
    } catch (error) {
        console.error('Slider silme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Slider silinemedi',
            error: error.message
        });
    }
});

module.exports = router;