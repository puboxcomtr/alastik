// apps/api/src/routes/web/integration/wheelsize.js
const express = require('express');
const router = express.Router();
const WheelSizeService = require('../../../services/WheelSizeService');

// Markaları getir
router.get('/makes', async (req, res) => {
    try {
        const { region } = req.query;
        const makes = await WheelSizeService.getMakes({ region });

        res.json({
            success: true,
            data: makes
        });
    } catch (error) {
        console.error('Marka listesi hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Markalar getirilirken hata oluştu',
            error: error.message
        });
    }
});

// Modelleri getir
router.get('/models', async (req, res) => {
    try {
        const { make, region } = req.query;

        if (!make) {
            return res.status(400).json({
                success: false,
                message: 'Marka parametresi gerekli'
            });
        }

        const models = await WheelSizeService.getModels(make, { region });

        res.json({
            success: true,
            data: models
        });
    } catch (error) {
        console.error('Model listesi hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Modeller getirilirken hata oluştu',
            error: error.message
        });
    }
});

// Yılları getir
router.get('/years', async (req, res) => {
    try {
        const { make, model } = req.query;

        if (!make || !model) {
            return res.status(400).json({
                success: false,
                message: 'Marka ve model parametreleri gerekli'
            });
        }

        const years = await WheelSizeService.getYears(make, model);

        res.json({
            success: true,
            data: years
        });
    } catch (error) {
        console.error('Yıl listesi hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Yıllar getirilirken hata oluştu',
            error: error.message
        });
    }
});

// Jenerasyonları getir
router.get('/generations', async (req, res) => {
    try {
        const { make, model, year } = req.query;

        if (!make || !model || !year) {
            return res.status(400).json({
                success: false,
                message: 'Marka, model ve yıl parametreleri gerekli'
            });
        }

        const generations = await WheelSizeService.getGenerations(make, model, parseInt(year));

        res.json({
            success: true,
            data: generations
        });
    } catch (error) {
        console.error('Jenerasyon listesi hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Jenerasyonlar getirilirken hata oluştu',
            error: error.message
        });
    }
});

// Modifikasyonları getir
router.get('/modifications', async (req, res) => {
    try {
        const { make, model, year, generation } = req.query;

        if (!make || !model || !year) {
            return res.status(400).json({
                success: false,
                message: 'Marka, model ve yıl parametreleri gerekli'
            });
        }

        const modifications = await WheelSizeService.getModifications(
            make,
            model,
            parseInt(year),
            generation
        );

        res.json({
            success: true,
            data: modifications
        });
    } catch (error) {
        console.error('Modifikasyon listesi hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Modifikasyonlar getirilirken hata oluştu',
            error: error.message
        });
    }
});

// Araç detaylarını getir
router.get('/vehicle-details', async (req, res) => {
    try {
        const { make, model, year, modification } = req.query;

        if (!make || !model || !year || !modification) {
            return res.status(400).json({
                success: false,
                message: 'Tüm parametreler gerekli'
            });
        }

        const details = await WheelSizeService.getVehicleDetails(
            make,
            model,
            parseInt(year),
            modification
        );

        res.json({
            success: true,
            data: details
        });
    } catch (error) {
        console.error('Araç detay hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Araç detayları getirilirken hata oluştu',
            error: error.message
        });
    }
});

module.exports = router;