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

        // Seçili sitede yayınlanmış ürünü olmayan özellik/değer listelenmez
        const siteCountField = `siteSettings.${req.site}.productCount`;
        const filter = { [siteCountField]: { $gt: 0 } };

        // Arama
        if (search) {
            filter.$or = [
                { featureName: { $regex: search, $options: 'i' } },
                { featureValue: { $regex: search, $options: 'i' } }
            ];
        }

        // Etkin değerler: site ayarı varsa o, yoksa ortak (kök) değer
        const sitePrefix = `$siteSettings.${req.site}`;
        const effectiveFields = {
            effIsActive: { $ifNull: [`${sitePrefix}.isActive`, '$isActive'] },
            effDisplayLocation: { $ifNull: [`${sitePrefix}.displayLocation`, '$displayLocation'] },
            effGroupOrder: { $ifNull: [`${sitePrefix}.featureGroupOrder`, '$featureGroupOrder'] }
        };

        const effectiveMatch = {};
        if (isActive !== undefined) {
            effectiveMatch.effIsActive = isActive === 'true';
        }
        if (displayLocation) {
            effectiveMatch.effDisplayLocation = displayLocation;
        }

        // Aggregate ile group by featureName
        const features = await WebFeature.aggregate([
            { $match: filter },
            { $addFields: effectiveFields },
            ...(Object.keys(effectiveMatch).length ? [{ $match: effectiveMatch }] : []),
            {
                $group: {
                    _id: '$featureName',
                    values: { $push: '$$ROOT' },
                    valueCount: { $sum: 1 },
                    totalProductCount: { $sum: `$${siteCountField}` },
                    isActive: { $first: '$effIsActive' },
                    displayLocation: { $first: '$effDisplayLocation' },
                    featureGroupOrder: { $first: '$effGroupOrder' }
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

        const features = await WebFeature.find({
            featureName,
            [`siteSettings.${req.site}.productCount`]: { $gt: 0 }
        }).lean();

        if (!features || features.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Özellik bulunamadı'
            });
        }

        // Site ayarı varsa etkin değer olarak yansıt, yoksa ortak değer
        const values = features
            .map(f => {
                const siteConf = f.siteSettings?.[req.site] || {};
                return {
                    ...f,
                    isActive: siteConf.isActive ?? f.isActive,
                    displayLocation: siteConf.displayLocation ?? f.displayLocation,
                    featureGroupOrder: siteConf.featureGroupOrder ?? f.featureGroupOrder,
                    featureValueOrder: siteConf.featureValueOrder ?? f.featureValueOrder
                };
            })
            .sort((a, b) => a.featureValueOrder - b.featureValueOrder);

        res.json({
            success: true,
            data: {
                name: featureName,
                values,
                valueCount: values.length
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

        // Ayarlar seçili siteye yazılır; ortak (kök) değerler diğer site için korunur
        const updateData = {};
        if (displayLocation !== undefined) updateData[`siteSettings.${req.site}.displayLocation`] = displayLocation;
        if (featureGroupOrder !== undefined) updateData[`siteSettings.${req.site}.featureGroupOrder`] = featureGroupOrder;
        if (isActive !== undefined) updateData[`siteSettings.${req.site}.isActive`] = isActive;

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
            { $set: { [`siteSettings.${req.site}.featureValueOrder`]: featureValueOrder } },
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