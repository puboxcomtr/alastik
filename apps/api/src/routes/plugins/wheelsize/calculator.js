const express = require('express');
const router = express.Router();
const WheelSizeService = require('../../../services/plugins/wheelsize/WheelSizeService');

/**
 * GET /plugins/wheelsize/calculator/sizes
 * Lastik hesaplama için gerekli 3 ebat listesini döner:
 * - widths: Lastik tabanı (mm)
 * - aspectRatios: Yanak oranı (%)
 * - rimDiameters: Jant çapı (inch)
 */
router.get('/sizes', async (req, res) => {
    try {
        const [widths, aspectRatios, rimDiameters] = await Promise.all([
            WheelSizeService.getTireSectionWidths(),
            WheelSizeService.getTireAspectRatios(),
            WheelSizeService.getTireRimDiameters()
        ]);

        res.json({
            success: true,
            data: {
                widths: widths.map(w => w.value).sort((a, b) => a - b),
                aspectRatios: aspectRatios.map(r => r.value).sort((a, b) => a - b),
                rimDiameters: rimDiameters.map(d => d.value).sort((a, b) => a - b)
            }
        });
    } catch (error) {
        console.error('Calculator sizes hatası:', error.message);
        res.status(500).json({
            success: false,
            message: 'Lastik ebat listeleri alınamadı'
        });
    }
});

module.exports = router;