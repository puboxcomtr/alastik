const express = require('express');
const router = express.Router();
const FrondSearchTerm = require('../../../models/web/catalog/FrondSearchTerm');
const WebProduct = require('../../../models/web/catalog/WebProduct');
const WebCategory = require('../../../models/web/catalog/WebCategory');
const WebBrand = require('../../../models/web/catalog/WebBrand');
const WebTag = require('../../../models/web/catalog/WebTag');
const Setting = require('../../../models/admin/settings/Setting');


// POST /api/search/autocomplete
router.post('/autocomplete', async (req, res) => {
    try {
        const { query, limit = 10 } = req.body;

        if (!query || query.length < 2) {
            return res.json({ success: true, data: [] });
        }

        // Lastik ebatı mı yoksa genel arama mı?
        const isTireSize = /\d{3}/.test(query) && /\d{2}/.test(query);

        // Lastik ebatı parser
        const parseTireSize = (input) => {
            const cleaned = input.replace(/\s+/g, '').toLowerCase();
            const match = cleaned.match(/(\d{3})[\/\s]*(\d{2})[\/\s]*r?(\d{2})/i);

            if (match) {
                const [, width, aspect, diameter] = match;
                return {
                    found: true,
                    variations: [
                        `${width}/${aspect}R${diameter}`,
                        `${width}/${aspect}/${diameter}`,
                        `${width} ${aspect} ${diameter}`,
                        `${width} ${aspect} R${diameter}`,
                        `${width}${aspect}${diameter}`,
                        `${width}${aspect}R${diameter}`,
                    ]
                };
            }
            return { found: false, variations: [input] };
        };

        const tireSize = parseTireSize(query);
        const searchPatterns = tireSize.variations.map(v =>
            new RegExp(v.replace(/[\/\s]/g, '[/\\s]*'), 'i')
        );

        const results = { tags: [], products: [], categories: [], brands: [] };

        if (isTireSize) {
            // Lastik ebatı araması - sadece etiket ve ürün
            const tags = await WebTag.find({
                $and: [
                    { isActive: true },
                    { $or: searchPatterns.map(p => ({ title: p })) }
                ]
            }).limit(10);

            results.tags = tags.map(t => ({
                type: 'tag',
                title: t.title,
                url: `/etiket/${t.seoUrl}`
            }));

            const products = await WebProduct.find({
                $and: [
                    { 'syncInfo.diaStatus': 'synced' },
                    { 'customData.webVisible': true },
                    { $or: searchPatterns.map(p => ({ 'diaData.aciklama': p })) }
                ]
            }).limit(20);

            results.products = products.map(p => ({
                type: 'product',
                title: p.diaData.aciklama,
                url: `/urun/${p.customData.seoUrl || p._key}`
            }));

        } else {
            // Genel arama - Öncelik: Marka > Kategori > Etiket > Ürün
            const regex = new RegExp(query, 'i');

            const brands = await WebBrand.find({
                webVisible: true,
                diaMarkaAck: regex
            }).limit(5);

            results.brands = brands.map(b => ({
                type: 'brand',
                title: b.diaMarkaAck,
                url: `/marka/${b.seoUrl}`
            }));

            const categories = await WebCategory.find({
                isActive: true,
                name: regex
            }).limit(5);

            results.categories = categories.map(c => ({
                type: 'category',
                title: c.name,
                url: `/kategori/${c.slug}`
            }));

            const tags = await WebTag.find({
                isActive: true,
                title: regex
            }).limit(10);

            results.tags = tags.map(t => ({
                type: 'tag',
                title: t.title,
                url: `/etiket/${t.seoUrl}`
            }));

            const products = await WebProduct.find({
                $and: [
                    { 'syncInfo.diaStatus': 'synced' },
                    { 'customData.webVisible': true },
                    {
                        $or: [
                            { 'diaData.aciklama': regex },
                            { 'diaData.anabarkod': regex },
                            { 'diaData.stokkartkodu': regex }
                        ]
                    }
                ]
            }).limit(20);

            results.products = products.map(p => ({
                type: 'product',
                title: p.diaData.aciklama,
                url: `/urun/${p.customData.seoUrl || p._key}`
            }));
        }

        // Dağılım
        const mixed = [];

        if (isTireSize) {
            mixed.push(...results.tags);
            const remaining = limit - mixed.length;
            mixed.push(...results.products.slice(0, remaining));
        } else {
            mixed.push(...results.brands);
            mixed.push(...results.categories);
            mixed.push(...results.tags);
            const remaining = limit - mixed.length;
            mixed.push(...results.products.slice(0, remaining));
        }

        res.json({
            success: true,
            data: mixed.slice(0, limit)
        });
    } catch (error) {
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
        const filter = getProductListFilters();
        /* Fiyatsızları Göster - Gizle */
        const hidePricelessSetting = await Setting.findOne({ key: 'hidePricelessProducts', group: 'showcase' }).lean();
        if (hidePricelessSetting?.value === true) {
            filter['diaData.m_birimler.0.fiyat4'] = { $gt: 0 };
        }
        
        const isStockCode = /^\d{5,}-\d+/.test(q.trim());
        const cleaned = q.replace(/[\s\-]+/g, '').toLowerCase();
        const tireMatch = isStockCode ? null : cleaned.match(/(\d{3})\/?(\d{2})r?(\d{2})/i);

        if (tireMatch) {
            const [, width, aspect, diameter] = tireMatch;
            const sizeVariations = [
                `${width}/${aspect}R${diameter}`,
                `${width}/${aspect}/${diameter}`,
                `${width} ${aspect} ${diameter}`,
                `${width}${aspect}R${diameter}`
            ];
            const sizeRegexes = sizeVariations.map(v =>
                new RegExp(v.replace(/[\/\s]/g, '[/\\s]*'), 'i')
            );
            filter.$or = sizeRegexes.map(r => ({ 'diaData.aciklama': r }));

            // Ebat dışında kalan metni çıkar (marka veya model olabilir)
            const extraText = q
                .replace(/[\d]{3}[\s\/\-]*[\d]{2}[\s\/\-]*r?[\d]{2}/i, '')
                .trim();

            if (extraText.length >= 2) {
                // Önce WebBrand koleksiyonunda ara
                const brandMatch = await WebBrand.findOne({
                    $or: [
                        { diaMarkaAck: { $regex: new RegExp(`^${extraText}$`, 'i') } },
                        { diaBrand: { $regex: new RegExp(`^${extraText}$`, 'i') } },
                        { name: { $regex: new RegExp(`^${extraText}$`, 'i') } }
                    ],
                    webVisible: true
                }).select('diaMarkaAck').lean();

                if (brandMatch) {
                    // Marka bulundu, diaData.marka alanında filtrele
                    filter['diaData.marka'] = brandMatch.diaMarkaAck;
                } else {
                    // Marka bulunamadı, aciklama alanında ek arama yap
                    filter.$or = filter.$or.map(condition => {
                        const field = Object.keys(condition)[0];
                        return {
                            $and: [
                                condition,
                                { [field]: { $regex: new RegExp(extraText, 'i') } }
                            ]
                        };
                    });
                }
            }
        } else {
            const regex = new RegExp(q, 'i');
            filter.$or = [
                { 'diaData.aciklama': regex },
                { 'diaData.marka': regex },
                { 'diaData.stokkartkodu': regex },
                { 'diaData.anabarkod': regex }
            ];
        }
        const andConditions = [];

        if (marka) {
            const markaList = marka.split(',').map(m => m.trim()).filter(Boolean);
            if (markaList.length > 0) andConditions.push({ 'diaData.marka': { $in: markaList } });
        }
        if (mevsim) {
            const mevsimList = mevsim.split(',').map(m => m.trim().toUpperCase()).filter(Boolean);
            if (mevsimList.length > 0) andConditions.push({ 'diaData.ozelkod1kodu': { $in: mevsimList } });
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
        let sortQuery = {};
        if (sortBy === 'price') {
            sortQuery = { 'diaData.m_birimler.0.fiyat4': sortOrder === 'asc' ? 1 : -1 };
        } else {
            sortQuery = { 'diaData.gercek_stok': -1, 'createdAt': -1 };
        }

        const skip = (pageNum - 1) * limitNum;
        const totalProducts = await WebProduct.countDocuments(filter);
        const totalPages = Math.ceil(totalProducts / limitNum);

        const products = await WebProduct.find(filter)
            .select('_key customData diaData')
            .sort(sortQuery)
            .skip(skip)
            .limit(limitNum)
            .lean();

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
        console.error('Search results error:', error);
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