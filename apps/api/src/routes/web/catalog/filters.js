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
        let productType = 'LASTİK'; // varsayılan

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

                // Kategorideki bir üründen productType al
                const sampleProduct = await WebProduct.findOne({
                    'diaData.m_kategoriler': {
                        $elemMatch: {
                            [diaLevel]: webCategory.diaCategory
                        }
                    },
                    'diaData.ozelkod7kodu': { $exists: true, $ne: '' }
                }).select('diaData.ozelkod7kodu').lean();

                if (sampleProduct?.diaData?.ozelkod7kodu) {
                    productType = sampleProduct.diaData.ozelkod7kodu;
                }
            }
        }

        if (tag) {
            const webTag = await WebTag.findOne({
                seoUrl: tag,
                isActive: true
            }).lean();

            if (webTag && webTag.products && webTag.products.length > 0) {
                baseMatch['_key'] = { $in: webTag.products };
            }
        }

        // productType'a göre filtre uygula
        baseMatch['diaData.ozelkod7kodu'] = productType;

        // ==========================================
        // ORTAK PİPELINE'LAR
        // ==========================================
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

        const pricePipeline = [
            { $match: baseMatch },
            { $unwind: '$diaData.m_birimler' },
            {
                $match: {
                    'diaData.m_birimler.fiyat4': { $gt: 0 }
                }
            },
            {
                $group: {
                    _id: null,
                    minPrice: { $min: '$diaData.m_birimler.fiyat4' },
                    maxPrice: { $max: '$diaData.m_birimler.fiyat4' }
                }
            }
        ];

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

        // ==========================================
        // JANT FİLTRELERİ
        // ==========================================
        if (productType === 'JANT') {
            const jantCapPipeline = [
                { $match: baseMatch },
                {
                    $group: {
                        _id: '$diaData.ozelkod4kodu',
                        count: { $sum: 1 }
                    }
                },
                { $match: { _id: { $ne: null, $ne: '' } } },
                { $sort: { _id: 1 } }
            ];

            const bijonPipeline = [
                { $match: baseMatch },
                {
                    $group: {
                        _id: '$diaData.ozelkod3kodu',
                        count: { $sum: 1 }
                    }
                },
                { $match: { _id: { $ne: null, $ne: '' } } },
                { $sort: { _id: 1 } }
            ];

            const [brands, priceRange, vehicleTypes, jantCaplar, bijonlar] = await Promise.all([
                WebProduct.aggregate(brandPipeline),
                WebProduct.aggregate(pricePipeline),
                WebProduct.aggregate(vehicleTypePipeline),
                WebProduct.aggregate(jantCapPipeline),
                WebProduct.aggregate(bijonPipeline)
            ]);

            return res.json({
                success: true,
                data: {
                    productType: 'JANT',
                    brands: brands.map(b => ({
                        value: b._id,
                        label: b._id,
                        count: b.count
                    })),
                    priceRange: priceRange[0] ? {
                        min: Math.floor(priceRange[0].minPrice),
                        max: Math.ceil(priceRange[0].maxPrice)
                    } : { min: 0, max: 10000 },
                    vehicleTypes: vehicleTypes.map(v => ({
                        value: v._id,
                        label: getVehicleTypeLabel(v._id),
                        count: v.count
                    })),
                    jantCaplar: jantCaplar.map(j => ({
                        value: j._id,
                        label: j._id + '"',
                        count: j.count
                    })).sort((a, b) => parseInt(a.value) - parseInt(b.value)),
                    bijonlar: bijonlar.map(b => ({
                        value: b._id,
                        label: b._id,
                        count: b.count
                    }))
                }
            });
        }

        // ==========================================
        // LASTİK FİLTRELERİ
        // ==========================================
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

        const seasonPipeline = [
            { $match: baseMatch },
            {
                $group: {
                    _id: '$diaData.ozelkod1kodu',
                    count: { $sum: 1 }
                }
            },
            { $match: { _id: { $ne: null, $ne: '' } } },
            { $sort: { count: -1 } }
        ];

        const propertiesPipeline = [
            { $match: baseMatch },
            { $unwind: '$diaData.m_urunOzellikleri' },
            {
                $match: {
                    'diaData.m_urunOzellikleri.ozellikadi': { $in: ['XL', 'Seal', 'Run Flat'] },
                    'diaData.m_urunOzellikleri.detayaciklama': 'Evet'
                }
            },
            {
                $group: {
                    _id: '$diaData.m_urunOzellikleri.ozellikadi',
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ];

        const loadIndexPipeline = [
            { $match: baseMatch },
            { $unwind: '$diaData.m_urunOzellikleri' },
            {
                $match: {
                    'diaData.m_urunOzellikleri.ozellikadi': 'Yük Endeksi',
                    'diaData.m_urunOzellikleri.detayaciklama': { $ne: '', $ne: null, $ne: '-' }
                }
            },
            {
                $group: {
                    _id: '$diaData.m_urunOzellikleri.detayaciklama',
                    count: { $sum: 1 }
                }
            },
            { $match: { _id: { $ne: null, $ne: '' } } },
            { $sort: { _id: 1 } }
        ];

        const speedIndexPipeline = [
            { $match: baseMatch },
            { $unwind: '$diaData.m_urunOzellikleri' },
            {
                $match: {
                    'diaData.m_urunOzellikleri.ozellikadi': 'Hız Endeksi',
                    'diaData.m_urunOzellikleri.detayaciklama': { $ne: '', $ne: null, $ne: '-' }
                }
            },
            {
                $group: {
                    _id: '$diaData.m_urunOzellikleri.detayaciklama',
                    count: { $sum: 1 }
                }
            },
            { $match: { _id: { $ne: null, $ne: '' } } },
            { $sort: { _id: 1 } }
        ];

        const productionYearPipeline = [
            { $match: baseMatch },
            { $match: { 'diaData.ekalan5': { $ne: null, $ne: '' } } },
            { $group: { _id: '$diaData.ekalan5', count: { $sum: 1 } } },
            { $match: { _id: { $regex: /^\d{4}$/ } } },
            { $sort: { _id: -1 } }
        ];

        const [widths, aspects, rims, brands, oem, priceRange, seasons, properties, loadIndex, speedIndex, productionYears, vehicleTypes] = await Promise.all([
            WebProduct.aggregate(widthPipeline),
            WebProduct.aggregate(aspectPipeline),
            WebProduct.aggregate(rimPipeline),
            WebProduct.aggregate(brandPipeline),
            WebProduct.aggregate(oemPipeline),
            WebProduct.aggregate(pricePipeline),
            WebProduct.aggregate(seasonPipeline),
            WebProduct.aggregate(propertiesPipeline),
            WebProduct.aggregate(loadIndexPipeline),
            WebProduct.aggregate(speedIndexPipeline),
            WebProduct.aggregate(productionYearPipeline),
            WebProduct.aggregate(vehicleTypePipeline)
        ]);

        const formatRim = (value) => {
            if (!value) return null;
            const match = value.match(/R?(\d+)C?/i);
            return match ? match[1] : value;
        };

        const formatSeasonLabel = (value) => {
            if (!value) return value;
            const turkishLower = value
                .replace(/I/g, 'ı')
                .replace(/İ/g, 'i')
                .toLowerCase();

            return turkishLower.split(' ').map(word =>
                word.charAt(0).toLocaleUpperCase('tr-TR') + word.slice(1)
            ).join(' ');
        };

        res.json({
            success: true,
            data: {
                productType: 'LASTİK',
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
                }),
                priceRange: priceRange[0] ? {
                    min: Math.floor(priceRange[0].minPrice),
                    max: Math.ceil(priceRange[0].maxPrice)
                } : { min: 0, max: 10000 },
                seasons: seasons.map(s => ({
                    value: s._id,
                    label: formatSeasonLabel(s._id),
                    count: s.count
                })),
                properties: properties.map(p => ({
                    value: p._id,
                    label: p._id,
                    count: p.count
                })),
                loadIndex: loadIndex.map(l => ({
                    value: l._id,
                    label: l._id,
                    count: l.count
                })),
                speedIndex: speedIndex.map(s => ({
                    value: s._id,
                    label: s._id,
                    count: s.count
                })),
                productionYears: productionYears.map(p => ({
                    value: p._id,
                    label: p._id,
                    count: p.count
                }))
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