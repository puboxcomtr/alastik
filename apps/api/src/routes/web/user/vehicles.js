// apps/api/src/routes/web/user/vehicles.js
const express = require('express');
const router = express.Router();
const WebVehicle = require('../../../models/web/user/WebVehicle');
const WheelSizeService = require('../../../services/WheelSizeService');
const authMiddleware = require('../../../middleware/authMiddleware');

// Kullanıcının tüm araçlarını getir
router.get('/', authMiddleware, async (req, res) => {
    try {
        const vehicles = await WebVehicle.find({
            memberId: req.user._id,
            isActive: true
        }).sort({ isPrimary: -1, createdAt: -1 });

        res.json({
            success: true,
            data: vehicles
        });
    } catch (error) {
        console.error('Araç listesi hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Araçlar getirilirken hata oluştu'
        });
    }
});

// Tek araç detayı
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const vehicle = await WebVehicle.findOne({
            _id: req.params.id,
            memberId: req.user._id,
            isActive: true
        });

        if (!vehicle) {
            return res.status(404).json({
                success: false,
                message: 'Araç bulunamadı'
            });
        }

        res.json({
            success: true,
            data: vehicle
        });
    } catch (error) {
        console.error('Araç detay hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Araç detayı getirilirken hata oluştu'
        });
    }
});

// Yeni araç ekle
router.post('/', authMiddleware, async (req, res) => {
    try {
        console.log('[POST /vehicles] User:', req.user._id);
        console.log('[Request body]:', JSON.stringify(req.body, null, 2));

        const { wheelSizeData, userInputs, isPrimary } = req.body;

        // Validasyon
        if (!wheelSizeData || !wheelSizeData.make || !wheelSizeData.model || !wheelSizeData.year) {
            return res.status(400).json({
                success: false,
                message: 'Marka, model ve yıl bilgileri gereklidir'
            });
        }

        // Wheel Size API'den araç detaylarını al
        let compatibleSizes = null;
        let vehicleImage = null;

        if (wheelSizeData.modification) {
            try {
                console.log('[Fetching vehicle details from Wheel Size API]');

                const details = await WheelSizeService.getVehicleDetails(
                    wheelSizeData.make,
                    wheelSizeData.model,
                    wheelSizeData.year,
                    wheelSizeData.modification
                );

                console.log('[API Response]:', details);

                // Lastik ve jant ölçülerini formatla
                if (details && details.length > 0) {
                    const vehicleData = details[0];

                    compatibleSizes = {
                        tires: vehicleData.wheels?.map(w => ({
                            width: w.front?.tire_width || 0,
                            aspectRatio: w.front?.tire_aspect_ratio || 0,
                            diameter: w.front?.rim_diameter || 0,
                            display: w.front?.tire || 'N/A'
                        })) || [],
                        wheels: vehicleData.wheels?.map(w => ({
                            diameter: w.front?.rim_diameter || 0,
                            width: w.front?.rim_width || 0,
                            offset: w.front?.rim_offset || 0,
                            boltPattern: w.bolt_pattern || '',
                            centerBore: w.centre_bore || 0,
                            display: w.front?.rim || 'N/A'
                        })) || [],
                        lastUpdated: new Date()
                    };
                }

                // Araç görseli için generation'dan çek
                try {
                    const generationImage = await WheelSizeService.getGenerationImage(
                        wheelSizeData.make,
                        wheelSizeData.model,
                        wheelSizeData.year
                    );

                    if (generationImage) {
                        vehicleImage = {
                            url: generationImage,
                            source: 'wheelsize'
                        };
                        console.log('[Using generation image]:', generationImage);
                    }
                } catch (imgError) {
                    console.error('[Image fetch error]:', imgError.message);
                }

            } catch (apiError) {
                console.error('[Wheel Size API Error]:', apiError.message);
            }
        }

        // Varsayılan görsel
        if (!vehicleImage) {
            vehicleImage = {
                url: 'https://via.placeholder.com/400x200/007bff/ffffff?text=' +
                    encodeURIComponent(wheelSizeData.makeName + ' ' + wheelSizeData.modelName),
                source: 'default'
            };
            console.log('[Using placeholder image]');
        }

        const vehicle = new WebVehicle({
            memberId: req.user._id,
            wheelSizeData,
            userInputs: userInputs || {},
            image: vehicleImage,
            compatibleSizes,
            isPrimary: isPrimary || false
        });

        await vehicle.save();

        console.log('[Vehicle created]:', vehicle._id);

        res.json({
            success: true,
            message: 'Araç başarıyla eklendi',
            data: vehicle
        });
    } catch (error) {
        console.error('[Vehicle creation error]:', error);
        console.error('[Stack trace]:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Araç eklenirken hata oluştu',
            error: error.message
        });
    }
});

// Araç güncelle
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { userInputs, isPrimary } = req.body;

        const vehicle = await WebVehicle.findOne({
            _id: req.params.id,
            memberId: req.user._id,
            isActive: true
        });

        if (!vehicle) {
            return res.status(404).json({
                success: false,
                message: 'Araç bulunamadı'
            });
        }

        if (userInputs) {
            vehicle.userInputs = { ...vehicle.userInputs, ...userInputs };
        }

        if (isPrimary !== undefined) {
            vehicle.isPrimary = isPrimary;
        }

        await vehicle.save();

        res.json({
            success: true,
            message: 'Araç başarıyla güncellendi',
            data: vehicle
        });
    } catch (error) {
        console.error('Araç güncelleme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Araç güncellenirken hata oluştu'
        });
    }
});

// Araç sil
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const vehicle = await WebVehicle.findOne({
            _id: req.params.id,
            memberId: req.user._id,
            isActive: true
        });

        if (!vehicle) {
            return res.status(404).json({
                success: false,
                message: 'Araç bulunamadı'
            });
        }

        vehicle.isActive = false;
        await vehicle.save();

        res.json({
            success: true,
            message: 'Araç başarıyla silindi'
        });
    } catch (error) {
        console.error('Araç silme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Araç silinirken hata oluştu'
        });
    }
});

// Varsayılan araç yap
router.patch('/:id/set-primary', authMiddleware, async (req, res) => {
    try {
        const vehicle = await WebVehicle.findOne({
            _id: req.params.id,
            memberId: req.user._id,
            isActive: true
        });

        if (!vehicle) {
            return res.status(404).json({
                success: false,
                message: 'Araç bulunamadı'
            });
        }

        vehicle.isPrimary = true;
        await vehicle.save();

        res.json({
            success: true,
            message: 'Varsayılan araç güncellendi',
            data: vehicle
        });
    } catch (error) {
        console.error('Varsayılan araç hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Varsayılan araç güncellenirken hata oluştu'
        });
    }
});

module.exports = router;