const express = require('express');
const { applySitePricingMany, salePriceExpr, sortPriceExpr, pricedCondition, priceRangeCondition } = require('../../../utils/sitePricing');
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

// Akıllı arama (alastik): "205 55 16 pirelli yaz" gibi yazımlarda mevsim kelimesi
// ürün adında metin olarak aranmaz; diaData.ozelkod1kodu (Yaz / Kış / 4 Mevsim)
// filtresine çevrilir. Kelime metinden çıkarılır, kalan kelimeler marka/model olarak aranır.
const SMART_SEASON_SITES = new Set(['alastik']);
const SEASON_WORD_RE = /(?:4|d[öo]rt)\s*mevsim|all\s*season|yazl[ıi]k|k[ıi][şs]l[ıi]k|(?<![\p{L}\d])yaz(?![\p{L}\d])|(?<![\p{L}\d])k[ıi][şs](?![\p{L}\d])/iu;
const detectSeasonWord = (site, text) => {
    if (!SMART_SEASON_SITES.has(site) || !text) return null;
    const lowered = String(text).toLocaleLowerCase('tr');
    const m = lowered.match(SEASON_WORD_RE);
    if (!m) return null;
    const w = m[0];
    const code = /mevsim|season/.test(w) ? '4 Mevsim' : w.startsWith('y') ? 'Yaz' : 'Kış';
    const rest = (lowered.slice(0, m.index) + ' ' + lowered.slice(m.index + w.length)).replace(/\s+/g, ' ').trim();
    return { code, word: w, rest };
};

// Akıllı öneri listesi (alastik): sonuç sayfasıyla tutarlı olsun diye yalnızca bu
// sitede yayınlanan ürünler (sites alanı) önerilir — başka sitenin ürünü sızmaz —,
// stoklu ürünler üste alınır, aynı başlık tekrar listelenmez.
const isSmartSite = (req) => SMART_SEASON_SITES.has(req.site);
const findSuggestProducts = async (req, andConditions) => {
    const smart = isSmartSite(req);
    const conditions = smart ? [...andConditions, { sites: req.site }] : andConditions;
    let query = WebProduct.find({ $and: conditions });
    if (smart) query = query.sort({ 'diaData.gercek_stok': -1 }).limit(40);
    else query = query.limit(20);
    const products = await query.lean();
    if (!smart) return products;
    const seen = new Set();
    return products.filter(p => {
        const key = String(p.diaData?.aciklama || '').trim().toLocaleLowerCase('tr');
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    }).slice(0, 20);
};

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
            // Akıllı arama: mevsim kelimesi ürün adında aranmaz, mevsim filtresine çevrilir
            const acSeason = detectSeasonWord(req.site, tireSize.remainder);
            const productRemainder = acSeason ? acSeason.rest : tireSize.remainder;
            if (acSeason) {
                productAndConditions.push({ 'diaData.ozelkod1kodu': acSeason.code });
            }
            if (productRemainder && productRemainder.length >= 2) {
                const remainderWords = productRemainder.split(/\s+/).filter(w => w.length >= 2);
                remainderWords.forEach(word => {
                    productAndConditions.push({
                        $or: [
                            { 'diaData.aciklama': new RegExp(escapeRegex(word), 'i') },
                            { 'diaData.marka': new RegExp(escapeRegex(word), 'i') }
                        ]
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

            const products = await findSuggestProducts(req, productAndConditions);

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
        // Akıllı arama: "pirelli yaz" → mevsim kelimesi filtreye, kalan "pirelli" metne
        const generalSeason = detectSeasonWord(req.site, query.trim());
        const generalText = generalSeason ? generalSeason.rest : query.trim();
        const words = generalText.split(/\s+/).filter(w => w.length >= 2);

        if (words.length === 0 && !generalSeason) {
            return res.json({ success: true, data: [] });
        }

        const wordRegexes = words.map(w => new RegExp(escapeRegex(w), 'i'));

        // Marka: tek kelimeyle eşleşme (marka adı genelde tek kelimedir)
        const fullQueryRegex = new RegExp(escapeRegex(query.trim()), 'i');
        const brandQueryRegex = generalSeason && generalText.length >= 2
            ? new RegExp(escapeRegex(generalText), 'i')
            : fullQueryRegex;
        const brands = await WebBrand.find({
            [`siteSettings.${req.site}.webVisible`]: true,
            [`siteSettings.${req.site}.productCount`]: { $gt: 0 },
            diaMarkaAck: brandQueryRegex
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

        if (generalSeason) {
            productConditions.push({ 'diaData.ozelkod1kodu': generalSeason.code });
        }

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

        const products = await findSuggestProducts(req, productConditions);

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
            Object.assign(filter, pricedCondition(req.site));
        }

        const andConditions = [];

        // İkinci el ürünler genel arama sonuçlarına karışmasın; kullanıcı açıkça
        // "2.el" / "ikinci el" aramadıysa dışlanır (stok kodu aramaları hariç)
        const wantsSecondHand = /2\.?\s*el|ikinci\s*el/i.test(q);
        if (!isStockCode && !wantsSecondHand) {
            const secondHandCategory = await WebCategory.findOne({ slug: 'ikinci-el' }).lean();
            if (secondHandCategory?.diaCategory) {
                andConditions.push({
                    'diaData.m_kategoriler': {
                        $not: {
                            $elemMatch: {
                                [secondHandCategory.diaLevel || 'kategori_aciklama_2']: secondHandCategory.diaCategory
                            }
                        }
                    }
                });
            }
        }

        if (isStockCode) {
            const stockRegex = new RegExp(escapeRegex(q.trim()), 'i');
            andConditions.push({
                $or: [
                    { 'diaData.stokkartkodu': stockRegex },
                    { 'diaData.anabarkod': stockRegex }
                ]
            });
        } else {
            // Akıllı arama (b2b /products/filter ile aynı mantık): mevsim kelimesi →
            // filtre; RAKAMLAR (ebat/kod) esnek eşleşir ("195 50 16" = "1955016" =
            // "195/50R16"); HARF kelimeleri (marka/model) ayrı ayrı; TÜM parçalar
            // birlikte (AND) sağlanır. Ebat ozelkod3kodu üzerinden yakalanır —
            // m_urunOzellikleri (Genişlik/Yanak/Jant) eksik ürünler de gelir.
            const freeSeason = !mevsim ? detectSeasonWord(req.site, q.trim()) : null;
            const freeText = freeSeason ? freeSeason.rest : q.trim();
            if (freeSeason) {
                andConditions.push({ 'diaData.ozelkod1kodu': freeSeason.code });
            }

            // Rakamlar → ebat/ürün kodu esnek eşleşmesi (ayraç/R harfi serbest)
            const rakam = freeText.replace(/[^0-9]/g, '');
            if (rakam.length >= 3) {
                const esnek = new RegExp(rakam.split('').join('\\D*'), 'i');
                // Kısa rakam (3-6, ör. "205" genişlik / "20555") YALNIZ ebat alanında
                // aranır — stok kodu/açıklamada 1..2..3 gibi gevşek eşleşip alakasız
                // ürün getiriyordu. Gerçek stok kodu aramaları zaten isStockCode (>=5
                // hane, tam eşleşme) ile ayrı işlenir. Tam ebat/uzun rakamda (>=7, ör.
                // 2055516 veya 205551691 yük endeksli) stok kodu + açıklama da eklenir.
                const rakamOr = [{ 'diaData.ozelkod3kodu': esnek }];
                if (rakam.length >= 7) {
                    rakamOr.push({ 'diaData.stokkartkodu': esnek });
                    rakamOr.push({ 'diaData.aciklama': esnek });
                }
                andConditions.push({ $or: rakamOr });
            }

            // Harf kelimeleri (rakam içermeyen, en az 2 harf) → marka/model
            const kelimeler = freeText.split(/\s+/).filter(w => w.length >= 2 && /[a-zçğıiöşü]/i.test(w) && !/\d/.test(w));
            for (const word of kelimeler) {
                const wordRegex = new RegExp(escapeRegex(word), 'i');
                andConditions.push({
                    $or: [
                        { 'diaData.aciklama': wordRegex },
                        { 'diaData.marka': wordRegex }
                    ]
                });
            }

            // Ne yeterli rakam ne harf kelimesi çıktıysa ham metni geniş ara
            if (rakam.length < 3 && kelimeler.length === 0) {
                const rgx = new RegExp(escapeRegex(freeText), 'i');
                andConditions.push({
                    $or: [
                        { 'diaData.aciklama': rgx },
                        { 'diaData.marka': rgx },
                        { 'diaData.stokkartkodu': rgx },
                        { 'diaData.anabarkod': rgx }
                    ]
                });
            }
        }

        // Sidebar ebat filtreleri (genislik/yanak/jant query paramları) — q'dan
        // bağımsız; seçiliyse yapısal özellik eşleşmesiyle ayrıca daraltır.
        {
            const { genislik, yanak, yukseklik, jant, cap } = req.query;
            if (genislik) {
                andConditions.push({ 'diaData.m_urunOzellikleri': { $elemMatch: { ozellikadi: 'Genişlik', detayaciklama: genislik } } });
            }
            const yanakVal = yanak || yukseklik;
            if (yanakVal) {
                andConditions.push({ 'diaData.m_urunOzellikleri': { $elemMatch: { ozellikadi: 'Yanak', detayaciklama: yanakVal } } });
            }
            const jantVal = jant || cap;
            if (jantVal) {
                andConditions.push({ 'diaData.m_urunOzellikleri': { $elemMatch: { ozellikadi: 'Jant Çapı', detayaciklama: { $regex: new RegExp(`^R?${jantVal}C?$|^${jantVal}\\s*İnç$`, 'i') } } } });
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
            andConditions.push(priceRangeCondition(req.site, fiyatMin, fiyatMax));
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
                    _sortPrice: sortPriceExpr(req.site) // site bazlı: kargo dahil fiyat > satış fiyatı
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
            { $project: { _key: 1, customData: 1, diaData: 1, syncInfo: 1 } }
        );

        const products = await WebProduct.aggregate(aggregatePipeline);

        applySitePricingMany(products, req.site);

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