const express = require('express');
const router = express.Router();
const WebSlider = require('../../../models/web/design/WebSlider');
const mongoose = require('mongoose');

// GET /api/design/slider/:id
router.get('/:id', async (req, res) => {
    try {
        // Slider aktif/pasif değişikliği anında yansısın: tarayıcı/ara katman
        // bu yanıtı önbelleğe almasın (aksi halde pasiflenen slayt görünmeye devam eder).
        res.set('Cache-Control', 'no-store');

        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Geçersiz slider ID'
            });
        }

        // Yalnızca isteğin geldiği sitenin slider'ı
        const slider = await WebSlider.findOne({ _id: id, site: req.site });

        if (!slider) {
            return res.status(404).json({
                success: false,
                message: 'Slider bulunamadı'
            });
        }
        if (slider.settings?.isActive === false) {
            return res.status(200).json({
                success: false,
                message: 'Slider aktif değil',
                data: null
            });
        }
        const activeSliders = [...slider.sliders]
            .filter(s => s.isActive)
            .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

        res.json({
            success: true,
            data: {
                _id: slider._id,
                name: slider.name,
                sliders: activeSliders,
                settings: slider.settings
            }
        });

    } catch (error) {
        console.error('Slider fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Slider getirilirken hata oluştu',
            error: error.message
        });
    }
});

module.exports = router;