// apps/api/src/routes/web/catalog/filters.js
const express = require('express');
const router = express.Router();
const WebProduct = require('../../../models/web/catalog/WebProduct');
const WebCategory = require('../../../models/web/catalog/WebCategory');
const WebTag = require('../../../models/web/catalog/WebTag');
const { MAIN_DIA_FILTERS, getVehicleTypeLabel } = require('../../../config/diaFilters');

/**
 * DIA filtrelerini MongoDB match formatına çevir
 */
function buildBaseMatch() {
    const baseMatch = {
        'syncInfo.diaStatus': 'synced'
    };

    MAIN_DIA_FILTERS.forEach(filter => {
        const fieldPath = `diaData.${filter.field}`;
        if (filter.operator === '=') {
            baseMatch[fieldPath] = filter.value;
        }
    });

    return baseMatch;
}

/**
 * GET /api/filters/tire-options
 */
router.get('/tire-options', async (req, res) => {
    try {
        const { category, tag } = req.query;

        const baseMatch = buildBaseMatch();

        // Kategori filtresi
        if (category) {
            const webCategory = await WebCategory.findOne({
                slug: category,
                webVisible: true
            }).lean();

            if (webCategory && webCategory.diaCategory) {
                const diaLevel = webCategory.diaLevel || 'kategori_aciklama_2';
                baseMatch['diaData.m_kategoriler'] = {
                    $elemMatch: {
                        [diaLevel]: webCategory.diaCategory
                    }
                };
            }
        }

        // Tag filtresi (ebat bazlı)
        if (tag) {
            const webTag = await WebTag.findOne({
                seoUrl: tag,
                isActive: true
            }).lean();

            if (webTag && webTag.products && webTag.products.length > 0) {
                baseMatch['_key'] = { $in: webTag.products };
            }
        }

        // Genişlik değerleri
        const widthPipeline = [
            { $match: baseMatch },
            { $unwind: '$diaData.m_urunOzellikleri' },
            { $match: { 'diaData.m_urunOzellikleri.ozellikadi': 'Genişlik' } },
            {
                $group: {
                    _id: '$diaData.m_urunOzellikleri.detayaciklama',
                    count: { $sum: 1 }
                }
            },
            { $match: { _id: { $ne: null, $ne: '' } } },
            { $sort: { _id: 1 } }
        ];

        // Yanak değerleri
        const aspectPipeline = [
            { $match: baseMatch },
            { $unwind: '$diaData.m_urunOzellikleri' },
            { $match: { 'diaData.m_urunOzellikleri.ozellikadi': 'Yanak' } },
            {
                $group: {
                    _id: '$diaData.m_urunOzellikleri.detayaciklama',
                    count: { $sum: 1 }
                }
            },
            { $match: { _id: { $ne: null, $ne: '' } } },
            { $sort: { _id: 1 } }
        ];

        // Jant Çapı değerleri
        const rimPipeline = [
            { $match: baseMatch },
            { $unwind: '$diaData.m_urunOzellikleri' },
            { $match: { 'diaData.m_urunOzellikleri.ozellikadi': 'Jant Çapı' } },
            {
                $group: {
                    _id: '$diaData.m_urunOzellikleri.detayaciklama',
                    count: { $sum: 1 }
                }
            },
            { $match: { _id: { $ne: null, $ne: '' } } },
            { $sort: { _id: 1 } }
        ];

        // Araç Tipi değerleri
        const vehicleTypePipeline = [
            { $match: baseMatch },
            {
                $group: {
                    _id: '$diaData.ozelkod2kodu',
                    label: { $first: '$diaData.ozelkod2' },
                    count: { $sum: 1 }
                }
            },
            { $match: { _id: { $ne: null, $ne: '' } } },
            { $sort: { count: -1 } }
        ];

        // Marka değerleri
        const brandPipeline = [
            { $match: baseMatch },
            {
                $group: {
                    _id: '$diaData.marka',
                    count: { $sum: 1 }
                }
            },
            { $match: { _id: { $ne: null, $ne: '' } } },
            { $sort: { count: -1, _id: 1 } }
        ];
        // OEM
        const oemPipeline = [
            { $match: baseMatch },
            { $unwind: '$diaData.m_urunOzellikleri' },
            {
                $match: {
                    'diaData.m_urunOzellikleri.ozellikadi': 'OEM',
                    'diaData.m_urunOzellikleri.detayaciklama': { $ne: '', $ne: null }
                }
            },
            {
                $group: {
                    _id: '$diaData.m_urunOzellikleri.detayaciklama',
                    count: { $sum: 1 }
                }
            },
            { $match: { _id: { $ne: null, $ne: '' } } },
            { $sort: { count: -1, _id: 1 } }
        ];

        // Paralel çalıştır
        const [widths, aspects, rims, vehicleTypes, brands, oem] = await Promise.all([
            WebProduct.aggregate(widthPipeline),
            WebProduct.aggregate(aspectPipeline),
            WebProduct.aggregate(rimPipeline),
            WebProduct.aggregate(vehicleTypePipeline),
            WebProduct.aggregate(brandPipeline),
            WebProduct.aggregate(oemPipeline)
        ]);

        // Jant çapını düzenle
        const formatRim = (value) => {
            if (!value) return null;
            const match = value.match(/R?(\d+)C?/i);
            return match ? match[1] : value;
        };

        res.json({
            success: true,
            data: {
                widths: widths.map(w => ({
                    value: w._id,
                    label: w._id,
                    count: w.count
                })),
                aspects: aspects.map(a => ({
                    value: a._id,
                    label: a._id,
                    count: a.count
                })),
                rims: rims.map(r => ({
                    value: formatRim(r._id),
                    label: r._id,
                    count: r.count
                })).filter((r, i, arr) =>
                    arr.findIndex(x => x.value === r.value) === i
                ).sort((a, b) => parseInt(a.value) - parseInt(b.value)),
                vehicleTypes: vehicleTypes.map(v => ({
                    value: v._id,
                    label: getVehicleTypeLabel(v._id),
                    count: v.count
                })),
                brands: brands.map(b => ({
                    value: b._id,
                    label: b._id,
                    count: b.count
                })),
                oem: oem.map(o => {
                    const slug = o._id.split('(')[0].trim().toLowerCase().replace(/\s+/g, '-');
                    return {
                        value: slug,
                        label: o._id,
                        count: o.count
                    };
                })
            }
        });

    } catch (error) {
        console.error('Filtre seçenekleri hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Filtre seçenekleri alınamadı'
        });
    }
});

module.exports = router;