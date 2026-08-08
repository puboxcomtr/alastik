const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const Slider = require('../../../models/admin/design/Slider');
const MediaService = require('../../../services/web/MediaService');

// Multer upload
const uploadSlider = MediaService.createUploader('slider', 'images', 10);

/**
 * GET /api/design/slider/key/:key
 */
router.get('/key/:key', async (req, res) => {
    try {
        const { key } = req.params;
        const slider = await Slider.findOne({
            key: key,
            site: req.site
        }).lean();

        if (!slider) {
            return res.json({
                success: false,
                data: null,
                message: 'Slider bulunamadi'
            });
        }
        if (slider.sliders && slider.sliders.length > 0) {
            slider.sliders = slider.sliders
                .filter(s => s.isActive !== false)
                .sort((a, b) => (a.order || 0) - (b.order || 0));
        }

        res.json({
            success: true,
            data: slider
        });

    } catch (error) {
        console.error('Slider key fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Slider getirilemedi',
            error: error.message
        });
    }
});

/**
 * GET /api/design/slider/:id
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const slider = await Slider.findOne({ _id: id, site: req.site }).lean();

        if (!slider) {
            return res.status(404).json({
                success: false,
                message: 'Slider bulunamadı'
            });
        }
        if (slider.sliders && slider.sliders.length > 0) {
            slider.sliders = slider.sliders
                .sort((a, b) => (a.order || 0) - (b.order || 0));
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

/**
 * GET /api/design/slider
 */
router.get('/', async (req, res) => {
    try {
        const sliders = await Slider.find({ site: req.site })
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

/**
 * POST /api/design/slider
 */
router.post('/', uploadSlider, async (req, res) => {
    try {
        const { name, key, sliders, settings } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Slider adı zorunludur'
            });
        }

        if (key) {
            const existingKey = await Slider.findOne({ key: key, site: req.site });
            if (existingKey) {
                return res.status(400).json({
                    success: false,
                    message: 'Bu key zaten kullanılıyor'
                });
            }
        }

        const parsedSliders = typeof sliders === 'string' ? JSON.parse(sliders) : sliders;
        const parsedSettings = typeof settings === 'string' ? JSON.parse(settings) : settings || {};

        if (!parsedSliders || parsedSliders.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'En az bir slider eklemelisiniz'
            });
        }

        if (req.files && req.files.length > 0) {
            req.files.forEach((file, index) => {
                if (parsedSliders[index]) {
                    parsedSliders[index].image = MediaService.getFileUrl('slider', file.filename);
                }
            });
        }

        for (let i = 0; i < parsedSliders.length; i++) {
            const slider = parsedSliders[i];
            if (!slider.image) {
                return res.status(400).json({
                    success: false,
                    message: `${i + 1}. slider için görsel zorunludur`
                });
            }
        }

        const newSlider = new Slider({
            site: req.site,
            name: name.trim(),
            key: key || undefined,
            sliders: parsedSliders,
            settings: parsedSettings
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

/**
 * PUT /api/design/slider/:id
 * Slider güncelle
 */
router.put('/:id', uploadSlider, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, sliders, settings } = req.body;
        const slider = await Slider.findOne({ _id: id, site: req.site });
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
                sliderItem.image = MediaService.getFileUrl('slider', req.files[imageIndex].filename);
                imageIndex++;
            } else if (sliderItem.existingImage) {
                sliderItem.image = sliderItem.existingImage;
            }
            delete sliderItem.existingImage;
        });

        slider.name = name;
        // slider.key = DOKUNMA, değiştirme
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

/**
 * DELETE /api/design/slider/:id
 * Slider sil
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const slider = await Slider.findOneAndDelete({ _id: id, site: req.site });

        if (!slider) {
            return res.status(404).json({
                success: false,
                message: 'Slider bulunamadı'
            });
        }

        for (const item of slider.sliders) {
            if (item.image) {
                MediaService.deleteFile(item.image);
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