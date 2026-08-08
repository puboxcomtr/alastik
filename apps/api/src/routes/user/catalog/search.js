const express = require('express');
const router = express.Router();
const FrondSearchTerm = require('../../../models/web/catalog/FrondSearchTerm');
const WebProduct = require('../../../models/web/catalog/WebProduct');
const WebCategory = require('../../../models/web/catalog/WebCategory');
const WebBrand = require('../../../models/web/catalog/WebBrand');
const WebTag = require('../../../models/web/catalog/WebTag');
const Setting = require('../../../models/admin/settings/Setting');
const { getSiteVisibilityFilter } = require('../../../config/diaFilters');


// POST /api/search/autocomplete
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const detectTireSize = (input) => {
    const cleaned = input.replace(/\s+/g, '').toLowerCase();
    const match = cleaned.match(/(\d{3})[\/\s]*(\d{2})[\/\s]*r?(\d{2})/i);
    if (!match) return null;
    const [fullMatch, width, aspect, diameter] = match;

    // Geçerli lastik ebat aralıklarını doğrula
    const widthNum = parseInt(width);
    const aspectNum = parseInt(aspect);
    const diameterNum = parseInt(diameter);

    if (widthNum < 125 || widthNum > 355) return null;
    if (aspectNum < 25 || aspectNum > 85) return null;
    if (diameterNum < 12 || diameterNum > 24) return null;

    return {
        width,
        aspect,
        diameter,
        variations: [
            `${width}/${aspect}R${diameter}`,
            `${width}/${aspect}/${diameter}`,
            `${width} ${aspect} ${diameter}`,
            `${width} ${aspect} R${diameter}`,
            `${width}${aspect}${diameter}`,
            `${width}${aspect}R${diameter}`,
        ],
        remainder: input.replace(/(\d{3})[\s\/\-]*(\d{2})[\s\/\-]*r?(\d{2})/i, '').trim()
    };
};


// POST /api/search/autocomplete
router.post('/autocomplete', async (req, res) => {
    try {
        const { query, limit = 10 } = req.body;

        if (!query || query.length < 2) {
            return res.json({ success: true, data: [] });
        }

        const results = { tags: [], products: [], categories: [], brands: [] };

        const trimmedQuery = query.trim();
        const hasHyphen = trimmedQuery.includes('-');

        // Tire içeren stok kodu (4433500-24-XML gibi) - kesin stok kodu
        const definiteStockCode = hasHyphen && /^\d{5,}(-[\w]+)*$/.test(trimmedQuery) ? trimmedQuery : null;

        // 1) STOK KODU (kesin, tire içerenler önce)
        if (definiteStockCode) {
            const stockRegex = new RegExp(escapeRegex(definiteStockCode), 'i');
            const products = await WebProduct.find({
                'syncInfo.diaStatus': 'synced',
                $and: [getSiteVisibilityFilter(req.site)],
                $or: [
                    { 'diaData.stokkartkodu': stockRegex },
                    { 'diaData.anabarkod': stockRegex }
                ]
            }).limit(20).lean();

            results.products = products.map(p => ({
                type: 'product',
                title: p.diaData.aciklama,
                url: `/urun/${p.customData.seoUrl || p._key}`
            }));

            return res.json({
                success: true,
                data: results.products.slice(0, limit)
            });
        }

        // 2) EBAT TESPİTİ
        const tireSize = detectTireSize(query);

        // 3) Ebat değilse ve sadece sayıysa stok kodu olarak değerlendir
        const stockCode = !tireSize && /^\d{5,}$/.test(trimmedQuery) ? trimmedQuery : null;
        if (stockCode) {
            const stockRegex = new RegExp(escapeRegex(stockCode), 'i');
            const products = await WebProduct.find({
                'syncInfo.diaStatus': 'synced',
                $and: [getSiteVisibilityFilter(req.site)],
                $or: [
                    { 'diaData.stokkartkodu': stockRegex },
                    { 'diaData.anabarkod': stockRegex }
                ]
            }).limit(20).lean();

            results.products = products.map(p => ({
                type: 'product',
                title: p.diaData.aciklama,
                url: `/urun/${p.customData.seoUrl || p._key}`
            }));

            return res.json({
                success: true,
                data: results.products.slice(0, limit)
            });
        }

        if (tireSize) {
            // Ebat regex'leri
            const sizePatterns = tireSize.variations.map(v =>
                new RegExp(escapeRegex(v).replace(/[\/\s]/g, '[/\\s]*'), 'i')
            );

            const productAndConditions = [
                { 'syncInfo.diaStatus': 'synced' },
                getSiteVisibilityFilter(req.site),
                { $or: sizePatterns.map(p => ({ 'diaData.aciklama': p })) }
            ];

            // Ebat dışında ekstra metin varsa (marka/model adı), AND mantığıyla aciklama'da ara
            if (tireSize.remainder && tireSize.remainder.length >= 2) {
                const remainderWords = tireSize.remainder.split(/\s+/).filter(w => w.length >= 2);
                remainderWords.forEach(word => {
                    productAndConditions.push({
                        'diaData.aciklama': new RegExp(escapeRegex(word), 'i')
                    });
                });
            }

            // Etiketleri ebat ile bul
            // Etiketleri ebat ile bul (ebat dışı kelime varsa onu da etikette ara)
            const tagAndConditions = [
                { site: req.site },
                { isActive: true },
                { $or: sizePatterns.map(p => ({ title: p })) }
            ];

            if (tireSize.remainder && tireSize.remainder.length >= 2) {
                const remainderWords = tireSize.remainder.split(/\s+/).filter(w => w.length >= 2);
                remainderWords.forEach(word => {
                    tagAndConditions.push({
                        title: new RegExp(escapeRegex(word), 'i')
                    });
                });
            }

            const tags = await WebTag.find({
                $and: tagAndConditions
            }).limit(10).lean();

            results.tags = tags.map(t => ({
                type: 'tag',
                title: t.title,
                url: `/etiket/${t.seoUrl}`
            }));

            const products = await WebProduct.find({
                $and: productAndConditions
            }).limit(20).lean();

            results.products = products.map(p => ({
                type: 'product',
                title: p.diaData.aciklama,
                url: `/urun/${p.customData.seoUrl || p._key}`
            }));

            const mixed = [];
            mixed.push(...results.tags);
            const remaining = limit - mixed.length;
            mixed.push(...results.products.slice(0, remaining));

            return res.json({
                success: true,
                data: mixed.slice(0, limit)
            });
        }

        // 3) GENEL ARAMA (Marka, kategori, etiket, ürün) - AND mantığı
        const words = query.trim().split(/\s+/).filter(w => w.length >= 2);

        if (words.length === 0) {
            return res.json({ success: true, data: [] });
        }

        const wordRegexes = words.map(w => new RegExp(escapeRegex(w), 'i'));

        // Marka: tek kelimeyle eşleşme (marka adı genelde tek kelimedir)
        const fullQueryRegex = new RegExp(escapeRegex(query.trim()), 'i');
        const brands = await WebBrand.find({
            [`siteSettings.${req.site}.webVisible`]: true,
            [`siteSettings.${req.site}.productCount`]: { $gt: 0 },
            diaMarkaAck: fullQueryRegex
        }).limit(5).lean();

        results.brands = brands.map(b => ({
            type: 'brand',
            title: b.diaMarkaAck,
            url: `/marka/${b.seoUrl}`
        }));

        const categories = await WebCategory.find({
            isActive: true,
            name: fullQueryRegex
        }).limit(5).lean();

        results.categories = categories.map(c => ({
            type: 'category',
            title: c.name,
            url: `/kategori/${c.slug}`
        }));

        const tags = await WebTag.find({
            site: req.site,
            isActive: true,
            title: fullQueryRegex
        }).limit(10).lean();

        results.tags = tags.map(t => ({
            type: 'tag',
            title: t.title,
            url: `/etiket/${t.seoUrl}`
        }));

        // Ürün: Tüm kelimeler aciklama veya stokkartkodu/anabarkod'da AND mantığıyla geçmeli
        const productConditions = [
            { 'syncInfo.diaStatus': 'synced' },
            getSiteVisibilityFilter(req.site)
        ];

        wordRegexes.forEach(rgx => {
            productConditions.push({
                $or: [
                    { 'diaData.aciklama': rgx },
                    { 'diaData.marka': rgx },
                    { 'diaData.stokkartkodu': rgx },
                    { 'diaData.anabarkod': rgx }
                ]
            });
        });

        const products = await WebProduct.find({
            $and: productConditions
        }).limit(20).lean();

        results.products = products.map(p => ({
            type: 'product',
            title: p.diaData.aciklama,
            url: `/urun/${p.customData.seoUrl || p._key}`
        }));

        // Dağılım: Marka > Kategori > Etiket > Ürün
        const mixed = [];
        mixed.push(...results.brands);
        mixed.push(...results.categories);
        mixed.push(...results.tags);
        const remaining = limit - mixed.length;
        if (remaining > 0) {
            mixed.push(...results.products.slice(0, remaining));
        }

        res.json({
            success: true,
            data: mixed.slice(0, limit)
        });
    } catch (error) {
        console.error('Autocomplete hatası:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/search/results
router.get('/results', async (req, res) => {
    try {
        const { q, page = 1, limit = 24, sortBy, sortOrder, marka, mevsim, ozellik, yukEndeksi, hizEndeksi, uretim, fiyatMin, fiyatMax, arac, oem } = req.query;

        if (!q || q.length < 2) {
            return res.json({ success: true, data: { products: [], pagination: { currentPage: 1, totalPages: 0, totalProducts: 0 } } });
        }

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const { getProductListFilters } = require('../../../config/diaFilters');

        const cleaned = q.replace(/[\s\-]+/g, '').toLowerCase();
        const rawTireMatch = cleaned.match(/(\d{3})\/?(\d{2})r?(\d{2})/i);

        let tireMatch = null;
        if (rawTireMatch) {
            const w = parseInt(rawTireMatch[1]);
            const a = parseInt(rawTireMatch[2]);
            const d = parseInt(rawTireMatch[3]);
            if (w >= 125 && w <= 355 && a >= 25 && a <= 85 && d >= 12 && d <= 24) {
                tireMatch = rawTireMatch;
            }
        }

        const isStockCode = !tireMatch && /^\d{5,}(-[\w]+)*$/.test(q.trim());

        // Stok kodu aramasında katı filtre uygulamayalım, sadece görünür ürünler
        const filter = isStockCode
            ? {
                'syncInfo.diaStatus': 'synced',
                ...(req.site ? { sites: req.site } : {}),
                $and: [getSiteVisibilityFilter(req.site)]
            }
            : getProductListFilters(req.site);

        const hidePricelessSetting = await Setting.findOne({ key: 'hidePricelessProducts', group: 'showcase', site: req.site }).lean();
        if (hidePricelessSetting?.value === true && !isStockCode) {
            filter['diaData.m_birimler.0.fiyat4'] = { $gt: 0 };
        }

        const andConditions = [];

        if (isStockCode) {
            const stockRegex = new RegExp(escapeRegex(q.trim()), 'i');
            andConditions.push({
                $or: [
                    { 'diaData.stokkartkodu': stockRegex },
                    { 'diaData.anabarkod': stockRegex }
                ]
            });
        } else if (tireMatch) {
            const [, queryWidth, queryAspect, queryDiameter] = tireMatch;
            const { genislik, yanak, yukseklik, jant, cap } = req.query;
            const finalWidth = genislik || queryWidth;
            const finalAspect = yanak || yukseklik || queryAspect;
            const finalDiameter = jant || cap || queryDiameter;
            andConditions.push({
                'diaData.m_urunOzellikleri': {
                    $elemMatch: { ozellikadi: 'Genişlik', detayaciklama: finalWidth }
                }
            });
            andConditions.push({
                'diaData.m_urunOzellikleri': {
                    $elemMatch: { ozellikadi: 'Yanak', detayaciklama: finalAspect }
                }
            });
            andConditions.push({
                'diaData.m_urunOzellikleri': {
                    $elemMatch: {
                        ozellikadi: 'Jant Çapı',
                        detayaciklama: { $regex: new RegExp(`^R?${finalDiameter}C?$|^${finalDiameter}\\s*İnç$`, 'i') }
                    }
                }
            });
            const extraText = q
                .replace(/[\d]{3}[\s\/\-]*[\d]{2}[\s\/\-]*r?[\d]{2}/i, '')
                .trim();

            if (extraText.length >= 2) {
                const words = extraText.split(/\s+/).filter(w => w.length >= 2);

                for (const word of words) {
                    const wordRegex = new RegExp(escapeRegex(word), 'i');
                    andConditions.push({
                        $or: [
                            { 'diaData.aciklama': wordRegex },
                            { 'diaData.marka': wordRegex }
                        ]
                    });
                }
            }
        } else {
            const words = q.trim().split(/\s+/).filter(w => w.length >= 2);

            if (words.length > 0) {
                for (const word of words) {
                    const wordRegex = new RegExp(escapeRegex(word), 'i');
                    andConditions.push({
                        $or: [
                            { 'diaData.aciklama': wordRegex },
                            { 'diaData.marka': wordRegex },
                            { 'diaData.stokkartkodu': wordRegex },
                            { 'diaData.anabarkod': wordRegex }
                        ]
                    });
                }
            }
        }
        if (marka) {
            const markaList = marka.split(',').map(m => m.trim()).filter(Boolean);
            if (markaList.length > 0) andConditions.push({ 'diaData.marka': { $in: markaList } });
        }
        if (mevsim) {
            const mevsimList = mevsim.split(',').map(m => m.trim()).filter(Boolean);
            if (mevsimList.length > 0) {
                const mevsimRegexList = mevsimList.map(m => new RegExp(`^${m}$`, 'i'));
                andConditions.push({ 'diaData.ozelkod1kodu': { $in: mevsimRegexList } });
            }
        }
        if (arac && arac !== 'all') {
            andConditions.push({ 'diaData.ozelkod2kodu': arac });
        }
        if (ozellik) {
            ozellik.split(',').map(o => o.trim()).filter(Boolean).forEach(oz => {
                andConditions.push({ 'diaData.m_urunOzellikleri': { $elemMatch: { ozellikadi: oz, detayaciklama: 'Evet' } } });
            });
        }
        if (yukEndeksi) {
            andConditions.push({ 'diaData.m_urunOzellikleri': { $elemMatch: { ozellikadi: 'Yük Endeksi', detayaciklama: yukEndeksi } } });
        }
        if (hizEndeksi) {
            andConditions.push({ 'diaData.m_urunOzellikleri': { $elemMatch: { ozellikadi: 'Hız Endeksi', detayaciklama: hizEndeksi } } });
        }
        if (uretim) {
            const uretimList = uretim.split(',').map(u => u.trim()).filter(Boolean);
            if (uretimList.length > 0) andConditions.push({ 'diaData.ekalan5': { $in: uretimList } });
        }
        if (oem) {
            const oemList = oem.split(',').map(o => o.trim()).filter(Boolean);
            const oemRegexList = oemList.map(slug => new RegExp(`^${slug.replace(/-/g, '[\\s-]*')}(?:\\s*\\(|$)`, 'i'));
            andConditions.push({ 'diaData.m_urunOzellikleri': { $elemMatch: { ozellikadi: 'OEM', detayaciklama: { $in: oemRegexList } } } });
        }
        if (fiyatMin || fiyatMax) {
            const priceMatch = {};
            if (fiyatMin) priceMatch.$gte = parseFloat(fiyatMin);
            if (fiyatMax) priceMatch.$lte = parseFloat(fiyatMax);
            andConditions.push({ 'diaData.m_birimler': { $elemMatch: { fiyat4: priceMatch } } });
        }

        if (andConditions.length > 0) {
            if (filter.$or) {
                filter.$and = [{ $or: filter.$or }, ...andConditions];
                delete filter.$or;
            } else {
                filter.$and = andConditions;
            }
        }

        // İkincil sıralama (katman içi)
        const skip = (pageNum - 1) * limitNum;
        const totalProducts = await WebProduct.countDocuments(filter);
        const totalPages = Math.ceil(totalProducts / limitNum);

        // Sıralama mantığı:
        // - Default (sortBy yok): 4 katmanlı (Bizim Stoklu > XML Stoklu > Bizim Stoksuz > XML Stoksuz) + içinde stok adetine göre azalan
        // - sortBy=price: 2 katman (Stoklular > Stoksuzlar), fiyat mantığı frontend ile aynı (shippingIncludedPrice > webPrice > fiyat4)
        const aggregatePipeline = [{ $match: filter }];

        if (sortBy === 'price') {
            aggregatePipeline.push({
                $addFields: {
                    _hasStock: { $gt: [{ $ifNull: ['$diaData.gercek_stok', 0] }, 0] },
                    _sortPrice: {
                        $let: {
                            vars: {
                                shipPrice: { $ifNull: ['$customData.shippingIncludedPrice', 0] },
                                webPrice: { $ifNull: ['$customData.webPrice', 0] },
                                fiyat4: { $ifNull: [{ $arrayElemAt: ['$diaData.m_birimler.fiyat4', 0] }, 0] }
                            },
                            in: {
                                $cond: [
                                    { $gt: ['$$shipPrice', 0] },
                                    '$$shipPrice',
                                    { $cond: [{ $gt: ['$$webPrice', 0] }, '$$webPrice', '$$fiyat4'] }
                                ]
                            }
                        }
                    }
                }
            });
            aggregatePipeline.push({
                $addFields: {
                    sortPriority: { $cond: ['$_hasStock', 1, 2] }
                }
            });
            aggregatePipeline.push({
                $sort: { sortPriority: 1, _sortPrice: sortOrder === 'asc' ? 1 : -1 }
            });
        } else {
            // Default 4 katmanlı sıralama + her katmanda stok adetine göre azalan
            aggregatePipeline.push({
                $addFields: {
                    _isXml: { $eq: ['$syncInfo.syncSource', 'xml_integration'] },
                    _hasStock: { $gt: [{ $ifNull: ['$diaData.gercek_stok', 0] }, 0] }
                }
            });
            aggregatePipeline.push({
                $addFields: {
                    sortPriority: {
                        $switch: {
                            branches: [
                                { case: { $and: ['$_hasStock', { $not: '$_isXml' }] }, then: 1 },
                                { case: { $and: ['$_hasStock', '$_isXml'] }, then: 2 },
                                { case: { $and: [{ $not: '$_hasStock' }, { $not: '$_isXml' }] }, then: 3 }
                            ],
                            default: 4
                        }
                    }
                }
            });
            aggregatePipeline.push({
                $sort: { sortPriority: 1, 'diaData.gercek_stok': -1, 'createdAt': -1 }
            });
        }

        aggregatePipeline.push(
            { $skip: skip },
            { $limit: limitNum },
            { $project: { _key: 1, customData: 1, diaData: 1 } }
        );

        const products = await WebProduct.aggregate(aggregatePipeline);

        res.json({
            success: true,
            data: {
                products,
                query: q,
                pagination: {
                    currentPage: pageNum,
                    totalPages,
                    totalProducts,
                    productsPerPage: limitNum,
                    hasNextPage: pageNum < totalPages,
                    hasPrevPage: pageNum > 1
                }
            }
        });
    } catch (error) {
        console.error('Search results hatası:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/search/track
router.post('/track', async (req, res) => {
    try {
        const { term } = req.body;

        if (!term) {
            return res.json({ success: false, message: 'Term gerekli' });
        }

        const normalized = term.toLowerCase().replace(/\s+/g, '');

        await FrondSearchTerm.findOneAndUpdate(
            { normalizedTerm: normalized },
            {
                $set: { term, lastSearched: new Date() },
                $inc: { searchCount: 1 }
            },
            { upsert: true, new: true }
        );

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;