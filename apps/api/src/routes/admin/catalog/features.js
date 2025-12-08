const express = require('express');
const router = express.Router();
const WebFeature = require('../../../models/web/catalog/WebFeature');

/**
 * Özellik Listeleme
 * GET /api/features
 */
router.get('/', async (req, res) => {
    try {
        const {
            search,
            isActive,
            displayLocation
        } = req.query;

        const filter = {};

        // Arama
        if (search) {
            filter.$or = [
                { featureName: { $regex: search, $options: 'i' } },
                { featureValue: { $regex: search, $options: 'i' } }
            ];
        }

        // Durum filtresi
        if (isActive !== undefined) {
            filter.isActive = isActive === 'true';
        }

        // Görünüm yeri filtresi
        if (displayLocation) {
            filter.displayLocation = displayLocation;
        }

        // Aggregate ile group by featureName
        const features = await WebFeature.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: '$featureName',
                    values: { $push: '$$ROOT' },
                    valueCount: { $sum: 1 },
                    totalProductCount: { $sum: '$productCount' },
                    isActive: { $first: '$isActive' },
                    displayLocation: { $first: '$displayLocation' },
                    featureGroupOrder: { $first: '$featureGroupOrder' }
                }
            },
            {
                $sort: {
                    featureGroupOrder: 1,  // Önce önceliğe göre
                    _id: 1                  // Sonra alfabetik
                }
            }
        ]);

        res.json({
            success: true,
            data: features.map(f => ({
                _id: f._id,
                name: f._id,
                valueCount: f.valueCount,
                productCount: f.totalProductCount,
                isActive: f.isActive,
                displayLocation: f.displayLocation,
                order: f.featureGroupOrder
            })),
            pagination: {
                total: features.length,
                page: 1,
                pages: 1
            }
        });

    } catch (error) {
        console.error('Özellik listesi hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Özellikler yüklenirken hata oluştu',
            error: error.message
        });
    }
});

/**
 * Özellik Detayı (tüm değerleri ile)
 * GET /api/features/:name
 */
router.get('/:name', async (req, res) => {
    try {
        const featureName = decodeURIComponent(req.params.name);

        const features = await WebFeature.find({ featureName })
            .sort({ featureValueOrder: 1 });

        if (!features || features.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Özellik bulunamadı'
            });
        }

        res.json({
            success: true,
            data: {
                name: featureName,
                values: features,
                valueCount: features.length
            }
        });

    } catch (error) {
        console.error('Özellik detay hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Özellik yüklenirken hata oluştu',
            error: error.message
        });
    }
});

/**
 * Özellik Grubu Güncelleme (tüm değerleri için ortak ayarlar)
 * PUT /api/features/:name
 */
router.put('/:name', async (req, res) => {
    try {
        const featureName = decodeURIComponent(req.params.name);
        const { displayLocation, featureGroupOrder, isActive } = req.body;

        const updateData = {};
        if (displayLocation !== undefined) updateData.displayLocation = displayLocation;
        if (featureGroupOrder !== undefined) updateData.featureGroupOrder = featureGroupOrder;
        if (isActive !== undefined) updateData.isActive = isActive;

        // Tüm değerleri güncelle
        const result = await WebFeature.updateMany(
            { featureName },
            { $set: updateData }
        )

        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Özellik bulunamadı'
            });
        }

        res.json({
            success: true,
            message: 'Özellik başarıyla güncellendi',
            updatedCount: result.modifiedCount
        });

    } catch (error) {
        console.error('Özellik güncelleme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Özellik güncellenirken hata oluştu',
            error: error.message
        });
    }
});

/**
 * Tek Değer Güncelleme
 * PUT /api/features/:name/value/:valueId
 */
router.put('/:name/value/:valueId', async (req, res) => {
    try {
        const { featureValueOrder } = req.body;

        const feature = await WebFeature.findByIdAndUpdate(
            req.params.valueId,
            { $set: { featureValueOrder } },
            { new: true }
        );

        if (!feature) {
            return res.status(404).json({
                success: false,
                message: 'Özellik değeri bulunamadı'
            });
        }

        res.json({
            success: true,
            message: 'Özellik değeri güncellendi',
            data: feature
        });

    } catch (error) {
        console.error('Özellik değeri güncelleme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Özellik değeri güncellenirken hata oluştu',
            error: error.message
        });
    }
});

module.exports = router;