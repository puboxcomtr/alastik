const express = require('express');
const router = express.Router();
const WebProduct = require('../../../models/web/catalog/WebProduct');
const WebCategory = require('../../../models/web/catalog/WebCategory');
const WebTag = require('../../../models/web/catalog/WebTag');
const WebBrand = require('../../../models/web/catalog/WebBrand');
const { MAIN_DIA_FILTERS, getSiteVisibilityFilter, getVehicleTypeLabel } = require('../../../config/diaFilters');

function buildBaseMatch(site) {
    const baseMatch = {
        'syncInfo.diaStatus': 'synced',
        ...(site ? { sites: site } : {})
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
 * Aktif filtrelerden match objesi oluştur (cascading için)
 * exclude: bu alana ait filtreyi atla (kendi seçeneğini daraltmamak için)
 */
function buildActiveFilters(query, exclude = null) {
    const filters = {};

    // m_urunOzellikleri bazlı filtreler (her biri ayrı $elemMatch gerekir)
    const ozellikFilters = [];

    if (query.genislik && exclude !== 'genislik') {
        ozellikFilters.push({ ozellikadi: 'Genişlik', detayaciklama: query.genislik });
    }
    if (query.yanak && exclude !== 'yanak') {
        ozellikFilters.push({ ozellikadi: 'Yanak', detayaciklama: query.yanak });
    }
    if (query.jant && exclude !== 'jant') {
        ozellikFilters.push({ ozellikadi: 'Jant Çapı', detayaciklama: new RegExp(`^R?${query.jant}C?$`, 'i') });
    }
    if (query.yukEndeksi && exclude !== 'yukEndeksi') {
        ozellikFilters.push({ ozellikadi: 'Yük Endeksi', detayaciklama: query.yukEndeksi });
    }
    if (query.hizEndeksi && exclude !== 'hizEndeksi') {
        ozellikFilters.push({ ozellikadi: 'Hız Endeksi', detayaciklama: query.hizEndeksi });
    }
    if (query.oem && exclude !== 'oem') {
        ozellikFilters.push({ ozellikadi: 'OEM', detayaciklama: new RegExp(query.oem.replace(/-/g, '[\\s-]*'), 'i') });
    }
    if (query.ozellik && exclude !== 'ozellik') {
        const ozellikler = query.ozellik.split(',');
        ozellikler.forEach(o => {
            ozellikFilters.push({ ozellikadi: o, detayaciklama: 'Evet' });
        });
    }

    if (ozellikFilters.length > 0) {
        filters['diaData.m_urunOzellikleri'] = { $all: ozellikFilters.map(f => ({ $elemMatch: f })) };
    }

    // Doğrudan diaData alanları
    if (query.arac && exclude !== 'arac') {
        filters['diaData.ozelkod2kodu'] = query.arac;
    }
    if (query.marka && exclude !== 'marka') {
        const markalar = query.marka.split(',');
        if (markalar.length > 1) {
            filters['diaData.marka'] = { $in: markalar };
        } else {
            filters['diaData.marka'] = query.marka;
        }
    }
    if (query.mevsim && exclude !== 'mevsim') {
        const mevsimRegexList = query.mevsim.split(',').map(m => new RegExp(`^${m}$`, 'i'));
        filters['diaData.ozelkod1kodu'] = { $in: mevsimRegexList };
    }
    if (query.uretim && exclude !== 'uretim') {
        const yillar = query.uretim.split(',');
        if (yillar.length > 1) {
            filters['diaData.ekalan5'] = { $in: yillar };
        } else {
            filters['diaData.ekalan5'] = query.uretim;
        }
    }

    return filters;
}
router.get('/tire-options', async (req, res) => {
    try {
        const { category, tag, brand, q } = req.query;

        const baseMatch = buildBaseMatch(req.site);
        let productType = 'LASTİK';

        // Arama (q) filtresi - search.js'deki mantığın aynısı
        if (q && q.length >= 2) {
            const isStockCode = /^\d{5,}-\d+/.test(q.trim());
            const cleaned = q.replace(/[\s\-]+/g, '').toLowerCase();
            const tireMatch = isStockCode ? null : cleaned.match(/(\d{3})\/?(\d{2})r?(\d{2})/i);

            if (tireMatch) {
                const [, queryWidth, queryAspect, queryDiameter] = tireMatch;
                const finalWidth = req.query.genislik || queryWidth;
                const finalAspect = req.query.yanak || req.query.yukseklik || queryAspect;
                const finalDiameter = req.query.jant || req.query.cap || queryDiameter;

                // m_urunOzellikleri üzerinden ebat eşleştir
                if (!baseMatch['$and']) baseMatch['$and'] = [];
                baseMatch['$and'].push(
                    { 'diaData.m_urunOzellikleri': { $elemMatch: { ozellikadi: 'Genişlik', detayaciklama: finalWidth } } },
                    { 'diaData.m_urunOzellikleri': { $elemMatch: { ozellikadi: 'Yanak', detayaciklama: finalAspect } } },
                    {
                        'diaData.m_urunOzellikleri': {
                            $elemMatch: {
                                ozellikadi: 'Jant Çapı',
                                detayaciklama: { $regex: new RegExp(`^R?${finalDiameter}C?$|^${finalDiameter}\\s*İnç$`, 'i') }
                            }
                        }
                    }
                );

                const extraText = q.replace(/[\d]{3}[\s\/\-]*[\d]{2}[\s\/\-]*r?[\d]{2}/i, '').trim();
                if (extraText.length >= 2) {
                    const WebBrand = require('../../../models/web/catalog/WebBrand');
                    const brandMatch = await WebBrand.findOne({
                        $or: [
                            { diaMarkaAck: { $regex: new RegExp(`^${extraText}$`, 'i') } },
                            { diaBrand: { $regex: new RegExp(`^${extraText}$`, 'i') } },
                            { name: { $regex: new RegExp(`^${extraText}$`, 'i') } }
                        ],
                        [`siteSettings.${req.site}.webVisible`]: true
                    }).select('diaMarkaAck').lean();

                    if (brandMatch) {
                        baseMatch['diaData.marka'] = brandMatch.diaMarkaAck;
                    } else {
                        baseMatch['$and'].push({ 'diaData.aciklama': { $regex: new RegExp(extraText, 'i') } });
                    }
                }
            } else {
                const regex = new RegExp(q, 'i');
                if (!baseMatch['$and']) baseMatch['$and'] = [];
                baseMatch['$and'].push({
                    $or: [
                        { 'diaData.aciklama': regex },
                        { 'diaData.marka': regex },
                        { 'diaData.stokkartkodu': regex },
                        { 'diaData.anabarkod': regex }
                    ]
                });
            }
        }

        // Kategori filtresi
        // Virtual mevsim kategori map'i (products.js ile uyumlu)
        const seasonSlugMap = {
            'yaz-lastikleri': 'Yaz',
            'kis-lastikleri': 'Kış',
            '4-mevsim-lastikler': '4 Mevsim'
        };
        const vehicleCategorySlugs = [
            'otomobil-lastikleri',
            'elektrikli-arac-lastikleri',
            'suv-lastikleri',
            'ticari-arac-lastikleri',
            'agir-vasita-lastikleri'
        ];
        let virtualSeasonFilter = null;

        // Kategori filtresi
        if (category) {
            // Virtual mevsim kategorisi mi?
            if (seasonSlugMap[category]) {
                virtualSeasonFilter = seasonSlugMap[category];
                const webCategories = await WebCategory.find({
                    slug: { $in: vehicleCategorySlugs },
                    [`siteSettings.${req.site}.webVisible`]: true
                }).lean();

                const orClauses = webCategories
                    .filter(c => c.diaCategory)
                    .map(c => ({
                        'diaData.m_kategoriler': {
                            $elemMatch: { [c.diaLevel || 'kategori_aciklama_2']: c.diaCategory }
                        }
                    }));
                if (orClauses.length > 0) {
                    baseMatch['$or'] = orClauses;
                }
                baseMatch['diaData.ozelkod1kodu'] = virtualSeasonFilter;
                productType = 'LASTİK';
            } else {
                // Normal kategori
                const webCategory = await WebCategory.findOne({
                    slug: category,
                    [`siteSettings.${req.site}.webVisible`]: true
                }).lean();

                if (webCategory && webCategory.diaCategory) {
                    const diaLevel = webCategory.diaLevel || 'kategori_aciklama_2';
                    baseMatch['diaData.m_kategoriler'] = {
                        $elemMatch: { [diaLevel]: webCategory.diaCategory }
                    };

                    const sampleProduct = await WebProduct.findOne({
                        'diaData.m_kategoriler': {
                            $elemMatch: { [diaLevel]: webCategory.diaCategory }
                        },
                        'diaData.ozelkod7kodu': { $exists: true, $ne: '' }
                    }).select('diaData.ozelkod7kodu').lean();

                    if (sampleProduct?.diaData?.ozelkod7kodu) {
                        productType = sampleProduct.diaData.ozelkod7kodu;
                    }
                }
            }
        }

        // Etiket filtresi
        if (tag) {
            const webTag = await WebTag.findOne({
                site: req.site,
                seoUrl: tag,
                isActive: true
            }).lean();

            if (webTag && webTag.products && webTag.products.length > 0) {
                baseMatch['_key'] = { $in: webTag.products };
            }
        }

        // Marka filtresi
        if (brand) {
            const webBrand = await WebBrand.findOne({
                $or: [
                    { seoUrl: brand },
                    { slug: brand }
                ],
                [`siteSettings.${req.site}.webVisible`]: true
            }).select('diaBrand diaMarkaAck').lean();

            if (webBrand) {
                const markaValue = webBrand.diaMarkaAck || webBrand.diaBrand;
                if (markaValue) {
                    baseMatch['diaData.marka'] = markaValue;
                }
            }
        }

        baseMatch['diaData.ozelkod7kodu'] = productType;

        // Her filtre için kendi alanı hariç diğer filtreleri uygulayan match builder
        const matchFor = (excludeField) => ({
            ...baseMatch,
            ...buildActiveFilters(req.query, excludeField)
        });

        const brandPipeline = [
            { $match: matchFor('marka') },
            { $group: { _id: '$diaData.marka', count: { $sum: 1 } } },
            { $match: { _id: { $ne: null, $ne: '' } } },
            { $sort: { count: -1, _id: 1 } }
        ];

        const pricePipeline = [
            { $match: matchFor(null) },
            { $unwind: '$diaData.m_birimler' },
            { $match: { 'diaData.m_birimler.fiyat4': { $gt: 0 } } },
            { $group: { _id: null, minPrice: { $min: '$diaData.m_birimler.fiyat4' }, maxPrice: { $max: '$diaData.m_birimler.fiyat4' } } }
        ];

        const vehicleTypePipeline = [
            { $match: matchFor('arac') },
            { $group: { _id: '$diaData.ozelkod2kodu', label: { $first: '$diaData.ozelkod2' }, count: { $sum: 1 } } },
            { $match: { _id: { $ne: null, $ne: '' } } },
            { $sort: { count: -1 } }
        ];

        // JANT
        if (productType === 'JANT') {
            // Jant özellikleri m_urunOzellikleri üzerinden dinamik olarak çekilir
            const buildRimFeaturePipeline = (featureName) => ([
                { $match: baseMatch },
                { $unwind: '$diaData.m_urunOzellikleri' },
                {
                    $match: {
                        'diaData.m_urunOzellikleri.ozellikadi': featureName,
                        'diaData.m_urunOzellikleri.detayaciklama': { $nin: [null, '', '-'] }
                    }
                },
                { $group: { _id: '$diaData.m_urunOzellikleri.detayaciklama', count: { $sum: 1 } } },
                { $sort: { _id: 1 } }
            ]);

            const [
                brands, priceRange,
                jantGenislikleri, jantCaplari, bijonSayilari, bijonAraliklari, gobekCaplari, etler, renkler
            ] = await Promise.all([
                WebProduct.aggregate(brandPipeline),
                WebProduct.aggregate(pricePipeline),
                WebProduct.aggregate(buildRimFeaturePipeline('Jant Genişliği')),
                WebProduct.aggregate(buildRimFeaturePipeline('Jant Çapı')),
                WebProduct.aggregate(buildRimFeaturePipeline('Bijon Sayısı')),
                WebProduct.aggregate(buildRimFeaturePipeline('Bijon Aralığı')),
                WebProduct.aggregate(buildRimFeaturePipeline('Göbek Çapı')),
                WebProduct.aggregate(buildRimFeaturePipeline('ET')),
                WebProduct.aggregate(buildRimFeaturePipeline('Renk'))
            ]);

            const sortNumeric = (arr) => arr.sort((a, b) => {
                const na = parseFloat(String(a.value).replace(/[^\d.]/g, ''));
                const nb = parseFloat(String(b.value).replace(/[^\d.]/g, ''));
                return (isNaN(na) ? 0 : na) - (isNaN(nb) ? 0 : nb);
            });

            return res.json({
                success: true,
                data: {
                    productType: 'JANT',
                    brands: await Promise.all(brands.map(async b => {
                        const webBrand = await WebBrand.findOne({ diaBrand: { $regex: new RegExp(`^${b._id}$`, 'i') } }).select('customName name').lean();
                        const displayName = webBrand?.customName || webBrand?.name || b._id;
                        return { value: b._id, label: displayName, count: b.count };
                    })),
                    // Hesaplanamıyorsa uydurma aralık döndürülmez; vitrin filtreyi gizler
                    priceRange: priceRange[0] ? {
                        min: Math.floor(priceRange[0].minPrice),
                        max: Math.ceil(priceRange[0].maxPrice)
                    } : null,
                    jantGenislikleri: sortNumeric(jantGenislikleri.map(j => ({ value: j._id, label: j._id, count: j.count }))),
                    jantCaplari: sortNumeric(jantCaplari.map(j => ({ value: String(j._id).replace(/[^\d]/g, ''), label: j._id, count: j.count }))),
                    bijonSayilari: sortNumeric(bijonSayilari.map(b => ({ value: b._id, label: b._id, count: b.count }))),
                    bijonAraliklari: sortNumeric(bijonAraliklari.map(b => ({ value: b._id, label: b._id, count: b.count }))),
                    gobekCaplari: sortNumeric(gobekCaplari.map(g => ({ value: g._id, label: g._id, count: g.count }))),
                    etler: etler.map(e => ({ value: e._id, label: e._id, count: e.count }))
                        .sort((a, b) => parseInt(a.value.replace(/[^\d]/g, '')) - parseInt(b.value.replace(/[^\d]/g, ''))),
                    renkler: renkler.map(r => ({ value: r._id, label: r._id, count: r.count }))
                        .sort((a, b) => b.count - a.count)
                }
            });
        }

        // LASTİK
        // LASTİK
        const widthPipeline = [
            { $match: matchFor('genislik') },
            { $unwind: '$diaData.m_urunOzellikleri' },
            { $match: { 'diaData.m_urunOzellikleri.ozellikadi': 'Genişlik' } },
            { $group: { _id: '$diaData.m_urunOzellikleri.detayaciklama', count: { $sum: 1 } } },
            { $match: { _id: { $ne: null, $ne: '' } } },
            { $sort: { _id: 1 } }
        ];

        const aspectPipeline = [
            { $match: matchFor('yanak') },
            { $unwind: '$diaData.m_urunOzellikleri' },
            { $match: { 'diaData.m_urunOzellikleri.ozellikadi': 'Yanak' } },
            { $group: { _id: '$diaData.m_urunOzellikleri.detayaciklama', count: { $sum: 1 } } },
            { $match: { _id: { $ne: null, $ne: '' } } },
            { $sort: { _id: 1 } }
        ];

        const rimPipeline = [
            { $match: matchFor('jant') },
            { $unwind: '$diaData.m_urunOzellikleri' },
            { $match: { 'diaData.m_urunOzellikleri.ozellikadi': 'Jant Çapı' } },
            { $group: { _id: '$diaData.m_urunOzellikleri.detayaciklama', count: { $sum: 1 } } },
            { $match: { _id: { $ne: null, $ne: '' } } },
            { $sort: { _id: 1 } }
        ];

        const oemPipeline = [
            { $match: matchFor('oem') },
            { $unwind: '$diaData.m_urunOzellikleri' },
            { $match: { 'diaData.m_urunOzellikleri.ozellikadi': 'OEM', 'diaData.m_urunOzellikleri.detayaciklama': { $ne: '', $ne: null } } },
            { $group: { _id: '$diaData.m_urunOzellikleri.detayaciklama', count: { $sum: 1 } } },
            { $match: { _id: { $ne: null, $ne: '' } } },
            { $sort: { count: -1, _id: 1 } }
        ];

        const seasonPipeline = [
            { $match: matchFor('mevsim') },
            { $group: { _id: '$diaData.ozelkod1kodu', count: { $sum: 1 } } },
            { $match: { _id: { $ne: null, $ne: '' } } },
            { $sort: { count: -1 } }
        ];

        const propertiesPipeline = [
            { $match: matchFor('ozellik') },
            { $unwind: '$diaData.m_urunOzellikleri' },
            { $match: { 'diaData.m_urunOzellikleri.ozellikadi': { $in: ['XL', 'Seal', 'Run Flat'] }, 'diaData.m_urunOzellikleri.detayaciklama': 'Evet' } },
            { $group: { _id: '$diaData.m_urunOzellikleri.ozellikadi', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ];

        const loadIndexPipeline = [
            { $match: matchFor('yukEndeksi') },
            { $unwind: '$diaData.m_urunOzellikleri' },
            { $match: { 'diaData.m_urunOzellikleri.ozellikadi': 'Yük Endeksi', 'diaData.m_urunOzellikleri.detayaciklama': { $ne: '', $ne: null, $ne: '-' } } },
            { $group: { _id: '$diaData.m_urunOzellikleri.detayaciklama', count: { $sum: 1 } } },
            { $match: { _id: { $ne: null, $ne: '' } } },
            { $sort: { _id: 1 } }
        ];

        const speedIndexPipeline = [
            { $match: matchFor('hizEndeksi') },
            { $unwind: '$diaData.m_urunOzellikleri' },
            { $match: { 'diaData.m_urunOzellikleri.ozellikadi': 'Hız Endeksi', 'diaData.m_urunOzellikleri.detayaciklama': { $ne: '', $ne: null, $ne: '-' } } },
            { $group: { _id: '$diaData.m_urunOzellikleri.detayaciklama', count: { $sum: 1 } } },
            { $match: { _id: { $ne: null, $ne: '' } } },
            { $sort: { _id: 1 } }
        ];

        const productionYearPipeline = [
            { $match: matchFor('uretim') },
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
            const turkishLower = value.replace(/I/g, 'ı').replace(/İ/g, 'i').toLowerCase();
            return turkishLower.split(' ').map(word =>
                word.charAt(0).toLocaleUpperCase('tr-TR') + word.slice(1)
            ).join(' ');
        };

        res.json({
            success: true,
            data: {
                productType: 'LASTİK',
                widths: widths.map(w => ({ value: w._id, label: w._id, count: w.count })),
                aspects: aspects.map(a => ({ value: a._id, label: a._id, count: a.count })),
                rims: rims.map(r => ({ value: formatRim(r._id), label: r._id, count: r.count }))
                    .filter((r, i, arr) => arr.findIndex(x => x.value === r.value) === i)
                    .sort((a, b) => parseInt(a.value) - parseInt(b.value)),
                vehicleTypes: vehicleTypes.map(v => ({ value: v._id, label: getVehicleTypeLabel(v._id), count: v.count })),
                brands: await Promise.all(brands.map(async b => {
                    const webBrand = await WebBrand.findOne({ diaBrand: { $regex: new RegExp(`^${b._id}$`, 'i') } }).select('customName name').lean();
                    const displayName = webBrand?.customName || webBrand?.name || b._id;
                    return { value: b._id, label: displayName, count: b.count };
                })), oem: oem.map(o => {
                    const slug = o._id.split('(')[0].trim().toLowerCase().replace(/\s+/g, '-');
                    return { value: slug, label: o._id, count: o.count };
                }),
                // Hesaplanamıyorsa uydurma aralık döndürülmez; vitrin filtreyi gizler
                priceRange: priceRange[0] ? {
                    min: Math.floor(priceRange[0].minPrice),
                    max: Math.ceil(priceRange[0].maxPrice)
                } : null,
                seasons: (() => {
                    const merged = {};
                    seasons.forEach(s => {
                        const normalized = formatSeasonLabel(s._id);
                        if (merged[normalized]) {
                            merged[normalized].count += s.count;
                        } else {
                            merged[normalized] = { value: normalized, label: normalized, count: s.count };
                        }
                    });
                    return Object.values(merged).sort((a, b) => b.count - a.count);
                })(),
                properties: properties.map(p => ({ value: p._id, label: p._id, count: p.count })),
                loadIndex: loadIndex.map(l => ({ value: l._id, label: l._id, count: l.count })),
                speedIndex: speedIndex.map(s => ({ value: s._id, label: s._id, count: s.count })),
                productionYears: productionYears.map(p => ({ value: p._id, label: p._id, count: p.count }))
            }
        });

    } catch (error) {
        console.error('Filtre seçenekleri hatası:', error);
        res.status(500).json({ success: false, message: 'Filtre seçenekleri alınamadı' });
    }
});

router.get('/chain-options', async (req, res) => {
    try {
        const { genislik, yanak } = req.query;

        const baseMatch = {
            'syncInfo.diaStatus': 'synced',
            'diaData.durum': 'A',
            'diaData.ozelkod7kodu': 'ZİNCİR',
            ...(req.site ? { sites: req.site } : {}),
            // Görünürlük: site ayarı > ortak değer
            $and: [getSiteVisibilityFilter(req.site)]
        };

        MAIN_DIA_FILTERS.forEach(filter => {
            const fieldPath = `diaData.${filter.field}`;
            if (filter.operator === '=') {
                baseMatch[fieldPath] = filter.value;
            }
        });

        if (genislik && yanak) {
            const rims = await WebProduct.distinct('diaData.m_urunOzellikleri', {
                ...baseMatch,
                'diaData.m_urunOzellikleri': {
                    $all: [
                        { $elemMatch: { ozellikadi: 'Genişlik', detayaciklama: genislik } },
                        { $elemMatch: { ozellikadi: 'Yanak', detayaciklama: yanak } }
                    ]
                }
            });

            const rimValues = rims.flat()
                .filter(oz => oz.ozellikadi === 'Jant Çapı')
                .map(oz => oz.detayaciklama)
                .filter((v, i, a) => v && a.indexOf(v) === i)
                .sort((a, b) => parseInt(a.replace(/\D/g, '')) - parseInt(b.replace(/\D/g, '')))
                .map(value => ({ value, label: value }));

            return res.json({ success: true, rims: rimValues });
        }

        if (genislik) {
            const aspects = await WebProduct.distinct('diaData.m_urunOzellikleri', {
                ...baseMatch,
                'diaData.m_urunOzellikleri': {
                    $elemMatch: { ozellikadi: 'Genişlik', detayaciklama: genislik }
                }
            });

            const aspectValues = aspects.flat()
                .filter(oz => oz.ozellikadi === 'Yanak')
                .map(oz => oz.detayaciklama)
                .filter((v, i, a) => v && a.indexOf(v) === i)
                .sort((a, b) => parseInt(a) - parseInt(b))
                .map(value => ({ value, label: value }));

            return res.json({ success: true, aspects: aspectValues });
        }

        const widths = await WebProduct.distinct('diaData.m_urunOzellikleri', baseMatch);

        const widthValues = widths.flat()
            .filter(oz => oz.ozellikadi === 'Genişlik')
            .map(oz => oz.detayaciklama)
            .filter((v, i, a) => v && a.indexOf(v) === i)
            .sort((a, b) => parseInt(a) - parseInt(b))
            .map(value => ({ value, label: value }));

        res.json({ success: true, widths: widthValues });

    } catch (error) {
        console.error('Kar paleti seçenekleri hatası:', error);
        res.status(500).json({ success: false, message: 'Seçenekler yüklenirken hata oluştu' });
    }
});

module.exports = router;