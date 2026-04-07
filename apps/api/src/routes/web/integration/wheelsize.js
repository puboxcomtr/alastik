const express = require('express');
const router = express.Router();
const WheelSizeService = require('../../../services/plugins/wheelsize/WheelSizeService');

// GET /api/wheelsize/makes - Marka Listesi
router.get('/makes', async (req, res) => {
    try {
        const { region } = req.query;
        const response = await WheelSizeService.getMakes({ region });

        return res.json({
            success: true,
            data: response || [],
            total: response?.length || 0
        });
    } catch (error) {
        console.error('Marka listesi hatası:', error);
        return res.status(500).json({
            success: false,
            message: 'Markalar getirilirken hata oluştu',
            error: error.message
        });
    }
});

router.get('/models', async (req, res) => {
    try {
        const { make, region } = req.query;

        if (!make) {
            return res.status(400).json({
                success: false,
                message: 'Make parametresi gereklidir'
            });
        }
        const response = await WheelSizeService.getModels(make, { region: region || 'eudm' });
        return res.json({
            success: true,
            data: response || [],
            total: response?.length || 0
        });
    } catch (error) {
        console.error('Model listesi hatası:', error);
        return res.status(500).json({
            success: false,
            message: 'Modeller getirilirken hata oluştu',
            error: error.message
        });
    }
});

// GET /api/wheelsize/years - Yıl Listesi
router.get('/years', async (req, res) => {
    try {
        const { make, model, region } = req.query;

        if (!make || !model) {
            return res.status(400).json({
                success: false,
                message: 'Make ve model parametreleri gereklidir'
            });
        }

        const response = await WheelSizeService.getYears(make, model, { region: region || 'eudm' });

        return res.json({
            success: true,
            data: response || [],
            total: response?.length || 0
        });
    } catch (error) {
        console.error('Yıl listesi hatası:', error);
        return res.status(500).json({
            success: false,
            message: 'Yıllar getirilirken hata oluştu',
            error: error.message
        });
    }
});

// GET /api/wheelsize/generations - Nesil Listesi
router.get('/generations', async (req, res) => {
    try {
        const { make, model } = req.query;

        if (!make || !model) {
            return res.status(400).json({
                success: false,
                message: 'Make ve model parametreleri gereklidir'
            });
        }
        const response = await WheelSizeService.getGenerations(make, model);


        return res.json({
            success: true,
            data: response || [],
            total: response?.length || 0
        });
    } catch (error) {
        console.error('Generation listesi hatası:', error);
        return res.status(500).json({
            success: false,
            message: 'Nesiller getirilirken hata oluştu',
            error: error.message
        });
    }
});

// GET /api/wheelsize/modifications - Modifikasyon Listesi (trims yerine)
router.get('/modifications', async (req, res) => {
    try {
        const { make, model, year, generation, region } = req.query;

        if (!make || !model || !year) {
            return res.status(400).json({
                success: false,
                message: 'Make, model ve year parametreleri gereklidir'
            });
        }

        const response = await WheelSizeService.getModifications(make, model, year);

        return res.json({
            success: true,
            data: response || [],
            total: response?.length || 0
        });
    } catch (error) {
        console.error('Modifikasyon listesi hatası:', error);
        return res.status(500).json({
            success: false,
            message: 'Modifikasyonlar getirilirken hata oluştu',
            error: error.message
        });
    }
});

// GET /api/wheelsize/vehicle-details - Araç Detayları
router.get('/vehicle-details', async (req, res) => {
    try {
        const { make, model, year, modification, region } = req.query;

        if (!make || !model || !year) {
            return res.status(400).json({
                success: false,
                message: 'Make, model ve year parametreleri gereklidir'
            });
        }

        const response = await WheelSizeService.getVehicleDetails(make, model, year, modification);

        return res.json({
            success: true,
            data: response || {},
            message: 'Araç detayları başarıyla getirildi'
        });
    } catch (error) {
        console.error('Araç detayları hatası:', error);
        return res.status(500).json({
            success: false,
            message: 'Araç detayları getirilirken hata oluştu',
            error: error.message
        });
    }
});

module.exports = router;