// apps/api/src/routes/web/catalog/products.js
const express = require('express');
const router = express.Router();
const WebProduct = require('../../../models/web/catalog/WebProduct');
const WebCategory = require('../../../models/web/catalog/WebCategory');
const WebBrand = require('../../../models/web/catalog/WebBrand');
const { applySitePricing, applySitePricingMany, resolveSitePrice, PRICE_HIDDEN, salePriceExpr, sortPriceExpr, pricedCondition, priceRangeCondition } = require('../../../utils/sitePricing');
const WebWheelSize = require('../../../models/web/catalog/WebWheelSize');
const WebOrder = require('../../../models/web/order/WebOrder');
const ChampionshipTire = require('../../../models/admin/catalog/ChampionshipTire');
const { getProductListFilters, getSiteVisibilityFilter, MAIN_DIA_FILTERS } = require('../../../config/diaFilters');
const Setting = require('../../../models/admin/settings/Setting');
/**
 * GET /api/products/similar-by-order/:orderNumber
 * Sipariş edilen lastiklerin: Aynı ebat + Farklı mevsim + Stokta olan benzer ürünleri
 */

// Kategori fiyat gösterim ayarı (KDV dahil/hariç) — ortak yardımcı, sepet de aynısını kullanır
const { getFiyatAyarlari, fiyatAyariUygula } = require('../../../utils/categoryPriceDisplay');
// Depo bazlı stok filtresi (b2b) — canlı DIA depo stoğuyla süzer
const { filterCodesByDepot, getDepotList } = require('../../../services/plugins/dia/depotStockFilter');

router.get('/similar-by-order/:orderNumber', async (req, res) => {
    try {
        const { orderNumber } = req.params;
        const limit = parseInt(req.query.limit) || 8;

        // Siparişi bul
        const order = await WebOrder.findOne({ orderNumber }).lean();
        if (!order || !order.items || order.items.length === 0) {
            return res.json({ success: true, data: [] });
        }

        // Sipariş edilen ürünlerin keylerini al
        const orderedKeys = order.items.map(i => String(i.productKey)).filter(Boolean);

        // Sipariş ürünlerinin DIA verilerini çek (ebat + mevsim bilgisi için)
        const orderedProducts = await WebProduct.find(
            { _key: { $in: orderedKeys } },
            { _key: 1, 'diaData.m_urunOzellikleri': 1, 'diaData.ozelkod1kodu': 1 }
        ).lean();

        // Her ürün için ebat + mevsim çıkar
        const orConditions = [];
        for (const p of orderedProducts) {
            const ozellikler = p.diaData?.m_urunOzellikleri || [];
            const genislik = ozellikler.find(o => o.ozellikadi === 'Genişlik')?.detayaciklama;
            const yanak = ozellikler.find(o => o.ozellikadi === 'Yanak')?.detayaciklama;
            const jant = ozellikler.find(o => o.ozellikadi === 'Jant Çapı')?.detayaciklama;
            const mevsim = p.diaData?.ozelkod1kodu;

            if (!genislik || !yanak || !jant) continue;

            orConditions.push({
                $and: [
                    { 'diaData.m_urunOzellikleri': { $elemMatch: { ozellikadi: 'Genişlik', detayaciklama: genislik } } },
                    { 'diaData.m_urunOzellikleri': { $elemMatch: { ozellikadi: 'Yanak', detayaciklama: yanak } } },
                    { 'diaData.m_urunOzellikleri': { $elemMatch: { ozellikadi: 'Jant Çapı', detayaciklama: jant } } },
                    // Farklı mevsim: sipariş mevsimi hariç (case-insensitive)
                    ...(mevsim ? [{ 'diaData.ozelkod1kodu': { $not: new RegExp(`^${mevsim}$`, 'i') } }] : [])
                ]
            });
        }

        if (orConditions.length === 0) {
            return res.json({ success: true, data: [] });
        }

        // Base filter
        const filter = {
            'syncInfo.diaStatus': 'synced',
            'diaData.durum': 'A',
            'diaData.gercek_stok': { $gt: 0 },
            _key: { $nin: orderedKeys },
            $or: orConditions,
            // Görünürlük: site ayarı > ortak değer
            $and: [getSiteVisibilityFilter(req.site)]
        };

        // Merkezi DIA filtrelerini uygula
        MAIN_DIA_FILTERS.forEach(f => {
            if (f.operator === '=') {
                filter[`diaData.${f.field}`] = f.value;
            }
        });

        const products = await WebProduct.aggregate([
            { $match: filter },
            { $sample: { size: limit } },
            { $project: { _key: 1, customData: 1, diaData: 1, syncInfo: 1 } }
        ]);

        applySitePricingMany(products, req.site);

        res.json({ success: true, data: products });
    } catch (error) {
        console.error('[Similar API] error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
// Katalog "vitrin" filtresi: tema ayarındaki (Tema > Vitrin 1) vitrinin ürünleri listede ayrı bir seçenek olarak süzülebilir.
// Seçeneğin adı Vitrin 1 Üst Başlık'tan, ürünleri Vitrin 1 Ürün Seçimi'nden gelir (ör. b2b "Kampanyalı Ürünler").
const CATALOG_SHOWCASE_SLOT = 'First';
const CATALOG_SHOWCASE_TTL_MS = 60 * 1000;
const catalogShowcaseCache = new Map(); // site -> { at, data }

/** @returns {Promise<{ key: string, title: string, productKeys: string[] } | null>} */
async function getCatalogShowcase(site) {
    const cached = catalogShowcaseCache.get(site);
    if (cached && Date.now() - cached.at < CATALOG_SHOWCASE_TTL_MS) return cached.data;
    let data = null;
    const SiteSetting = require('../../../models/admin/settings/SiteSetting');
    const WebShowcase = require('../../../models/web/settings/WebShowcase');
    const theme = (await SiteSetting.findOne({ key: 'theme', site }).lean())?.value || {};
    const showcaseId = theme[`showcase${CATALOG_SHOWCASE_SLOT}`];
    const title = String(theme[`showcasename${CATALOG_SHOWCASE_SLOT}`] || '').trim();
    if (showcaseId && title) {
        const showcase = await WebShowcase.findOne({ _id: showcaseId, site, isActive: true }).lean().catch(() => null);
        const productKeys = (showcase?.products || []).map(p => String(p.productId || '')).filter(Boolean);
        if (productKeys.length) data = { key: CATALOG_SHOWCASE_SLOT.toLowerCase(), title, productKeys };
    }
    catalogShowcaseCache.set(site, { at: Date.now(), data });
    return data;
}

// Kategorideki ürün türleri (ozelkod7kodu) — site + kategori başına kısa süreli önbellek (her listeleme isteğinde sorulur)
const CATEGORY_TYPES_TTL_MS = 60 * 1000;
const categoryTypesCache = new Map(); // `${site}:${categoryId}` -> { at, types }

async function getCategoryProductTypes(site, webCategory) {
    const cacheKey = `${site}:${webCategory._id}`;
    const cached = categoryTypesCache.get(cacheKey);
    if (cached && Date.now() - cached.at < CATEGORY_TYPES_TTL_MS) return cached.types;
    const diaLevel = webCategory.diaLevel || 'kategori_aciklama_2';
    const types = (await WebProduct.distinct('diaData.ozelkod7kodu', {
        ...getProductListFilters(site),
        'diaData.m_kategoriler': { $elemMatch: { [diaLevel]: webCategory.diaCategory } }
    })).filter(Boolean);
    categoryTypesCache.set(cacheKey, { at: Date.now(), types });
    return types;
}

router.get('/filter', async (req, res) => {
    try {
        const {
            category,
            // Lastik parametreleri
            genislik,
            yukseklik,
            yanak,
            cap,
            jant,
            oem,
            mevsim,
            ozellik,
            yukEndeksi,
            hizEndeksi,
            uretim,
            ozelkod5,
            // Jant parametreleri
            jantCap,
            jantGenisligi,
            bijon,
            bijonSayisi,
            gobekCapi,
            et,
            renk,
            // Ortak parametreler
            arac,
            marka,
            depo,
            fiyatMin,
            fiyatMax,
            // Özellik çipleri (ürün adından türetilir): RFT / C Serisi / XL / EV
            rft,
            cserisi,
            xl,
            ev,
            // Vitrin filtresi (tema Vitrin 1 ürünleri) — değer: getCatalogShowcase().key
            vitrin,
            limit,
            // Sıralama parametreleri
            sortBy,
            sortOrder
        } = req.query;

        const pageNum = parseInt(req.query.page) || 1;
        const limitNum = parseInt(limit) || 25;
        const filter = getProductListFilters(req.site);
        // Belirli ürünleri (ör. montaj hizmetleri) bu sitenin vitrin listelemesinden
        // gizle. Montaj noktaları/sepet _key ile çektiği için etkilenmez. Bu bayrak
        // customData.siteData altında olduğundan DIA güncellemesinde de korunur.
        // (Not: kategori koşulları $and'i ezdiği için doğrudan alan olarak eklenir.)
        filter[`customData.siteData.${req.site}.hideFromListing`] = { $ne: true };

        console.log('=== SORTING DEBUG ===');
        console.log('sortBy:', sortBy);
        console.log('sortOrder:', sortOrder);
        console.log('====================');

        // ==========================================
        // ÜRÜN TİPİ TESPİTİ (kategorideki ürünlerden ozelkod7kodu)
        // ==========================================
        let productType = null;
        let webCategory = null;
        let webCategories = [];
        let isMultiCategory = false;
        let virtualSeasonFilter = null; // yaz-lastikleri / kis-lastikleri / 4-mevsim-lastikler için

        // Mevsim slug → ozelkod1kodu eşlemesi (virtual kategoriler)
        const seasonSlugMap = {
            'yaz-lastikleri': 'Yaz',
            'kis-lastikleri': 'Kış',
            '4-mevsim-lastikler': '4 Mevsim'
        };
        // 5 araç tipi ana kategorisi (virtual multi-category için)
        const vehicleCategorySlugs = [
            'otomobil-lastikleri',
            'elektrikli-arac-lastikleri',
            'suv-lastikleri',
            'ticari-arac-lastikleri',
            'agir-vasita-lastikleri'
        ];

        if (category) {
            const categorySlugs = category.split(',').map(s => s.trim()).filter(Boolean);

            // Tek slug mevsim kategorisi ise → 5 araç tipini multi-category olarak aç + mevsim filtresi uygula
            if (categorySlugs.length === 1 && seasonSlugMap[categorySlugs[0]]) {
                virtualSeasonFilter = seasonSlugMap[categorySlugs[0]];
                isMultiCategory = true;
                webCategories = await WebCategory.find({
                    slug: { $in: vehicleCategorySlugs },
                    [`siteSettings.${req.site}.webVisible`]: true
                }).lean();
            } else if (categorySlugs.length > 1) {
                isMultiCategory = true;
                webCategories = await WebCategory.find({
                    slug: { $in: categorySlugs },
                    [`siteSettings.${req.site}.webVisible`]: true
                }).lean();
                // Multi-category: productType tespiti yapılmaz, her kategorinin ozelkod7kodu farklı olabilir
            } else {
                webCategory = await WebCategory.findOne({
                    slug: categorySlugs[0],
                    [`siteSettings.${req.site}.webVisible`]: true
                }).lean();

                if (webCategory && webCategory.diaCategory) {
                    // Kategoride (bu sitede listelenen ürünlerde) TEK ürün türü varsa jant / lastik listeleme davranışı
                    // o türe göre seçilir. Birden fazla tür varsa (ör. "İkinci El": lastik + jant) varsayılan davranış kullanılır.
                    const typesInCategory = await getCategoryProductTypes(req.site, webCategory);
                    if (typesInCategory.length === 1) productType = typesInCategory[0];
                }
            }
        }

        // Jant parametresi geldiğinde tip janta zorlanır; ancak kategori zaten
        // jant türevindeyse ("2.El Jant" gibi) kendi tipi korunur
        if ((jantCap || bijon) && !isMultiCategory && !/jant/i.test(productType || '')) {
            productType = 'JANT';
            // Jant araması (kategori jant değilken): liste jant türüyle sınırlanır
            filter['diaData.ozelkod7kodu'] = productType;
        }
        // Kategori listesinde tür kısıtı YOK: ürünler yalnız kategori eşleşmesine göre gelir (türü boş ürünler de dahil).
        // productType burada yalnız listeleme davranışını (jant / lastik filtreleri) belirler.

        // "JANT" ve "2.El Jant" gibi jant türevleri jant listeleme davranışını kullanır
        const isJantCategory = /jant/i.test(productType || '');

        const hidePricelessSetting = await Setting.findOne({ key: 'hidePricelessProducts', group: 'showcase', site: req.site }).lean();
        if (hidePricelessSetting?.value === true) {
            Object.assign(filter, pricedCondition(req.site));
        }

        const andConditions = [];
        // Kategori düzeyi koşullar (kategori eşleşmesi + hariç tutulanlar). Kullanıcı
        // filtrelerinden (marka/mevsim/DOT…) ayrı tutulur ki facet listesi (tüm
        // markalar/mevsimler/DOT'lar) seçili filtreden bağımsız, eksiksiz üretilebilsin.
        const categoryConditions = [];

        // Hariç tutulacak kategori (örn. marka sayfasında Sıfır sekmesi için ikinci-el dışlanır)
        if (req.query.haricKategori) {
            const excludeSlugs = String(req.query.haricKategori).split(',').map(s => s.trim()).filter(Boolean);
            const excludeCategories = await WebCategory.find({ slug: { $in: excludeSlugs } }).lean();
            for (const exCat of excludeCategories) {
                if (!exCat.diaCategory) continue;
                categoryConditions.push({
                    'diaData.m_kategoriler': {
                        $not: {
                            $elemMatch: {
                                [exCat.diaLevel || 'kategori_aciklama_2']: exCat.diaCategory
                            }
                        }
                    }
                });
            }
        }

        if (webCategory?.diaCategory) {
            const diaLevel = webCategory.diaLevel || 'kategori_aciklama_2';
            categoryConditions.push({
                'diaData.m_kategoriler': {
                    $elemMatch: {
                        [diaLevel]: webCategory.diaCategory
                    }
                }
            });
        } else if (webCategories.length > 0) {
            const orClauses = webCategories
                .filter(c => c.diaCategory)
                .map(c => ({
                    'diaData.m_kategoriler': {
                        $elemMatch: {
                            [c.diaLevel || 'kategori_aciklama_2']: c.diaCategory
                        }
                    }
                }));
            if (orClauses.length > 0) {
                categoryConditions.push({ $or: orClauses });
            }
        }
        // ==========================================
        // LASTİK FİLTRELERİ
        // ==========================================
        if (!isJantCategory) {
            // Genişlik filtresi
            if (genislik) {
                andConditions.push({
                    'diaData.m_urunOzellikleri': {
                        $elemMatch: {
                            ozellikadi: 'Genişlik',
                            detayaciklama: genislik
                        }
                    }
                });
            }

            // Yanak filtresi
            const yanakValue = yanak || yukseklik;
            if (yanakValue) {
                andConditions.push({
                    'diaData.m_urunOzellikleri': {
                        $elemMatch: {
                            ozellikadi: 'Yanak',
                            detayaciklama: yanakValue
                        }
                    }
                });
            }

            // Jant çapı filtresi
            const jantValue = jant || cap;
            if (jantValue) {
                andConditions.push({
                    'diaData.m_urunOzellikleri': {
                        $elemMatch: {
                            ozellikadi: 'Jant Çapı',
                            detayaciklama: { $regex: new RegExp(`^R?${jantValue}C?$|^${jantValue}\\s*İnç$`, 'i') }
                        }
                    }
                });
            }
            if (oem) {
                const oemList = oem.split(',').map(o => o.trim()).filter(Boolean);
                if (oemList.length > 0) {
                    const oemRegexList = oemList.map(slug =>
                        new RegExp(`^${slug.replace(/-/g, '[\\s-]*')}(?:\\s*\\(|$)`, 'i')
                    );
                    andConditions.push({
                        'diaData.m_urunOzellikleri': {
                            $elemMatch: {
                                'ozellikadi': 'OEM',
                                'detayaciklama': { $in: oemRegexList }
                            }
                        }
                    });
                }
            }
            // Mevsim filtresi (kullanıcı seçimi virtualSeasonFilter'ı override eder)
            if (mevsim) {
                const mevsimList = mevsim.split(',').map(m => m.trim()).filter(Boolean);
                if (mevsimList.length > 0) {
                    andConditions.push({
                        'diaData.ozelkod1kodu': {
                            $in: mevsimList.map(m => new RegExp(`^${m}$`, 'i'))
                        }
                    });
                }
            } else if (virtualSeasonFilter) {
                andConditions.push({
                    'diaData.ozelkod1kodu': virtualSeasonFilter
                });
            }
            if (ozellik) {
                const ozellikList = ozellik.split(',').map(o => o.trim()).filter(Boolean);
                ozellikList.forEach(oz => {
                    andConditions.push({
                        'diaData.m_urunOzellikleri': {
                            $elemMatch: {
                                'ozellikadi': oz,
                                'detayaciklama': 'Evet'
                            }
                        }
                    });
                });
            }

            // Yük Endeksi filtresi
            if (yukEndeksi) {
                andConditions.push({
                    'diaData.m_urunOzellikleri': {
                        $elemMatch: {
                            'ozellikadi': 'Yük Endeksi',
                            'detayaciklama': yukEndeksi
                        }
                    }
                });
            }

            // Hız Endeksi filtresi
            if (hizEndeksi) {
                andConditions.push({
                    'diaData.m_urunOzellikleri': {
                        $elemMatch: {
                            'ozellikadi': 'Hız Endeksi',
                            'detayaciklama': hizEndeksi
                        }
                    }
                });
            }

            // Üretim tarihi filtresi
            if (uretim) {
                const uretimList = uretim.split(',').map(u => u.trim()).filter(Boolean);
                if (uretimList.length > 0) {
                    andConditions.push({ 'diaData.ekalan5': { $in: uretimList } });
                }
            }
        }

        // ==========================================
        // JANT FİLTRELERİ (m_urunOzellikleri üzerinden)
        // ==========================================
        if (isJantCategory) {
            const pushRimFilter = (ozellikadi, value) => {
                if (!value) return;
                andConditions.push({
                    'diaData.m_urunOzellikleri': {
                        $elemMatch: {
                            ozellikadi,
                            detayaciklama: value
                        }
                    }
                });
            };

            const jantCapValue = jantCap || jant || cap;
            if (jantCapValue) {
                const jantCapNumeric = String(jantCapValue).replace(/[^\d]/g, '');
                andConditions.push({
                    'diaData.m_urunOzellikleri': {
                        $elemMatch: {
                            ozellikadi: 'Jant Çapı',
                            detayaciklama: { $regex: new RegExp(`^${jantCapNumeric}\\s*İnç$`, 'i') }
                        }
                    }
                });
            }

            pushRimFilter('Jant Genişliği', jantGenisligi);
            pushRimFilter('Bijon Sayısı', bijonSayisi);
            pushRimFilter('Bijon Aralığı', bijon);
            pushRimFilter('Göbek Çapı', gobekCapi);
            pushRimFilter('ET', et);
            pushRimFilter('Renk', renk);
        }

        // ==========================================
        // ORTAK FİLTRELER
        // ==========================================
        // Araç tipi filtresi
        if (arac && arac !== 'all') {
            andConditions.push({
                'diaData.ozelkod2kodu': arac
            });
        }

        // Marka filtresi
        if (marka) {
            const markaList = marka.split(',').map(m => m.trim()).filter(Boolean);
            if (markaList.length > 0) {
                andConditions.push({
                    'diaData.marka': { $in: markaList }
                });
            }
        }

        // Özellik çipleri (RFT / C Serisi / XL / EV): ürün adından (diaData.aciklama)
        // türetilir. Regexler ön yüzdeki matches() ile birebir aynıdır; kategorinin
        // TÜM ürünlerinde arar (yalnız görünen sayfada değil). C Serisi büyük "C"
        // olduğundan yalnız o koşul büyük/küçük harf duyarlıdır.
        const isActive = (v) => v === '1' || v === 'true';
        if (isActive(rft)) {
            andConditions.push({ 'diaData.aciklama': { $regex: '\\bRFT\\b', $options: 'i' } });
        }
        if (isActive(cserisi)) {
            andConditions.push({ 'diaData.aciklama': { $regex: '\\bC\\b' } });
        }
        if (isActive(xl)) {
            andConditions.push({ 'diaData.aciklama': { $regex: '\\bXL\\b', $options: 'i' } });
        }
        if (isActive(ev)) {
            andConditions.push({ 'diaData.aciklama': { $regex: '\\bEV\\b', $options: 'i' } });
        }

        // Vitrin filtresi: yalnız tema Vitrin 1'de seçili vitrinin ürünleri
        const catalogShowcase = await getCatalogShowcase(req.site);
        if (vitrin && catalogShowcase && vitrin === catalogShowcase.key) {
            andConditions.push({ _key: { $in: catalogShowcase.productKeys } });
        }

        // Akıllı serbest metin arama (q): sorgu kelimelere ayrılır.
        //  - Tüm rakamlar (ebat/ürün kodu) tek esnek eşleşmeye toplanır:
        //    "2055516", "205 55 16", "205/55R16" hepsi aynı kabul edilir.
        //  - Saf harf kelimeleri (marka/model, ör. "Pirelli") ayrı ayrı aranır.
        //  - TÜM parçalar BİRLİKTE (AND) sağlanmalıdır → "205 55 16 Pirelli"
        //    hem 205/55R16 ebadını hem Pirelli markasını arar, başka marka çıkmaz.
        // Kategorinin TÜM ürünlerinde arar (yalnız görünen sayfada değil).
        if (req.query.q && String(req.query.q).trim()) {
            const q = String(req.query.q).trim();
            const tokens = q.split(/\s+/).filter(Boolean);
            // Saf harf kelimeler (rakam içermeyen, en az 2 harf) → marka/model
            const kelimeler = tokens.filter(t => t.length >= 2 && /[a-zşğüöçıİ]/i.test(t) && !/\d/.test(t));
            const rakam = q.replace(/[^0-9]/g, '');

            if (rakam.length >= 3) {
                const esnek = new RegExp(rakam.split('').join('\\D*'), 'i');
                andConditions.push({ $or: [
                    { 'diaData.ozelkod3kodu': esnek },
                    { 'diaData.stokkartkodu': esnek },
                    { 'diaData.aciklama': esnek }
                ] });
            }
            for (const kelime of kelimeler) {
                const esc = kelime.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const rx = new RegExp(esc, 'i');
                andConditions.push({ $or: [
                    { 'diaData.aciklama': rx },
                    { 'diaData.marka': rx },
                    { 'diaData.ozelkod5kodu': rx }
                ] });
            }
            // Ne yeterli rakam ne de harf kelimesi çıktıysa (ör. tek karakter),
            // ham sorguyu geniş ara — kullanıcı hiç sonuçsuz kalmasın.
            if (rakam.length < 3 && kelimeler.length === 0) {
                const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const rx = new RegExp(esc, 'i');
                andConditions.push({ $or: [
                    { 'diaData.aciklama': rx },
                    { 'diaData.marka': rx },
                    { 'diaData.stokkartkodu': rx },
                    { 'diaData.ozelkod3kodu': rx }
                ] });
            }
        }
        if (ozelkod5) {
            andConditions.push({
                'diaData.ozelkod5kodu': ozelkod5
            });
        }

        // Fiyat filtresi
        if (fiyatMin || fiyatMax) {
            const priceCondition = priceRangeCondition(req.site, fiyatMin, fiyatMax);
            andConditions.push(priceCondition);
        }

        // Facet için baz (kategori koşulları var, kullanıcı filtreleri YOK)
        const baseFilterForFacets = { ...filter };
        const allConditions = [...categoryConditions, ...andConditions];
        if (allConditions.length > 0) {
            filter['$and'] = allConditions;
        }
        if (categoryConditions.length > 0) {
            baseFilterForFacets['$and'] = categoryConditions;
        }

        // Depo filtresi (b2b): seçilen depoda stoğu olan ürünlere daralt. Depo stoğu
        // yalnız kendi stok (DIA) ürünlerinde vardır; XML ürünler dışlanır. Aday
        // kodlar (kategori + marka/mevsim/DOT + kendi stok) toplanır, canlı depo
        // stoğuna göre süzülür ve nihai sorgu bu kodlara kilitlenir. Böylece depo
        // filtresi TÜM sayfalara işler (yalnız görünen sayfaya değil).
        if (depo) {
            try {
                const adayFilter = {
                    ...filter,
                    'syncInfo.syncSource': { $in: ['dia_api', 'dia_missing_sync'] },
                    'diaData.gercek_stok': { $gt: 0 }
                };
                const adaylar = await WebProduct.find(adayFilter)
                    .select('diaData.stokkartkodu')
                    .limit(3000)
                    .lean();
                const kodlar = adaylar.map(p => p.diaData?.stokkartkodu).filter(Boolean);
                const izinli = await filterCodesByDepot(req.site, depo, kodlar);
                // izinli null ise depo bulunamadı → filtre yok sayılır
                if (izinli) {
                    filter['$and'] = [...(filter['$and'] || []), { 'diaData.stokkartkodu': { $in: [...izinli] } }];
                }
            } catch (depoErr) {
                console.error('Depo filtresi hatası:', depoErr.message);
            }
        }

        const skip = (pageNum - 1) * limitNum;
        const totalProducts = await WebProduct.countDocuments(filter);
        const totalPages = Math.ceil(totalProducts / limitNum);

        // Sıralama mantığı:
        // - Default (sortBy yok): 4 katmanlı (Bizim Stoklu > XML Stoklu > Bizim Stoksuz > XML Stoksuz)
        // - sortBy belirtildiyse: 4 katman tamamen iptal, sadece kullanıcı seçimine göre sırala
        // - Fiyat sıralamasında frontend ile aynı mantık: shippingIncludedPrice > webPrice > fiyat4
        const aggregatePipeline = [{ $match: filter }];

        // b2b tablo sütun başlığı sıralaması (tüm ürünlerde, sayfa bazlı değil)
        const COLUMN_SORT = {
            stokKodu: 'diaData.stokkartkodu',
            ebat: 'diaData.ozelkod3kodu',
            marka: 'diaData.marka',
            mevsim: 'diaData.ozelkod1kodu',
            dot: 'diaData.ekalan5',
            stok: 'diaData.gercek_stok',
            sevkiyat: 'syncInfo.syncSource'
        };

        if (sortBy === 'price' || sortBy === 'fiyat') {
            // Fiyata göre — 2 katman: önce stoklular, sonra stoksuzlar
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
        } else if (COLUMN_SORT[sortBy]) {
            const yon = sortOrder === 'desc' ? -1 : 1;
            if (sortBy === 'stok') {
                // Stok sıralamasında ÖNCE kendi stoğumuz (dia), SONRA XML ürünleri;
                // her grup kendi içinde stok adedine göre sıralanır.
                aggregatePipeline.push({
                    $addFields: { _isXml: { $cond: [{ $eq: ['$syncInfo.syncSource', 'xml_integration'] }, 1, 0] } }
                });
                aggregatePipeline.push({
                    $sort: { _isXml: 1, 'diaData.gercek_stok': yon, 'diaData.stokkartkodu': 1 }
                });
            } else {
                aggregatePipeline.push({ $sort: { [COLUMN_SORT[sortBy]]: yon, 'diaData.stokkartkodu': 1 } });
            }
        } else if (sortBy === 'sales') {
            aggregatePipeline.push({ $sort: { 'customData.salesCount': -1, 'diaData.gercek_stok': -1 } });
        } else if (sortBy === 'rating') {
            aggregatePipeline.push({ $sort: { 'customData.reviewStats.averageRating': -1, 'customData.reviewStats.reviewCount': -1 } });
        } else if (sortBy === 'reviews') {
            aggregatePipeline.push({ $sort: { 'customData.reviewStats.reviewCount': -1, 'customData.reviewStats.averageRating': -1 } });
        } else {
            // Default 4 katmanlı sıralama
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

        // Facet listeleri (yalnız ?facets=1 ile) — kategorinin TÜM marka/mevsim/DOT
        // değerleri, seçili filtreden bağımsız. Filtre panelindeki select'leri eksiksiz
        // doldurmak için kullanılır (o anki sayfanın ürünlerine bağlı kalmaz).
        let facets = null;
        if (req.query.facets === '1') {
            // Ürün özelliğinin (m_urunOzellikleri) değerini veren aggregation ifadesi
            const featureValueExpr = (featureName) => ({
                $let: {
                    vars: {
                        matched: {
                            $filter: {
                                input: { $ifNull: ['$diaData.m_urunOzellikleri', []] },
                                as: 'o',
                                cond: { $eq: ['$$o.ozellikadi', featureName] }
                            }
                        }
                    },
                    in: { $arrayElemAt: ['$$matched.detayaciklama', 0] }
                }
            });
            const facetRes = await WebProduct.aggregate([
                { $match: baseFilterForFacets },
                {
                    $group: {
                        _id: null,
                        brands: { $addToSet: '$diaData.marka' },
                        seasons: { $addToSet: '$diaData.ozelkod1kodu' },
                        dots: { $addToSet: '$diaData.ekalan5' },
                        // Kategorideki ürün türleri (ozelkod7kodu) — ön yüz filtre alanlarını türe göre seçer
                        productTypes: { $addToSet: '$diaData.ozelkod7kodu' },
                        // Jant filtreleri: ürün özelliklerindeki ham değerler ("17 İnç", "114.3")
                        rimDiameterRaw: { $addToSet: featureValueExpr('Jant Çapı') },
                        boltPatternRaw: { $addToSet: featureValueExpr('Bijon Aralığı') },
                        // OEM özelliğinin ham değeri (ör. "Mercedes (MO)", "Audi(AO),Volkswagen(+)")
                        oemRaw: {
                            $addToSet: {
                                $let: {
                                    vars: {
                                        oemArr: {
                                            $filter: {
                                                input: { $ifNull: ['$diaData.m_urunOzellikleri', []] },
                                                as: 'o',
                                                cond: { $eq: ['$$o.ozellikadi', 'OEM'] }
                                            }
                                        }
                                    },
                                    in: { $arrayElemAt: ['$$oemArr.detayaciklama', 0] }
                                }
                            }
                        }
                    }
                }
            ]);
            const g = facetRes[0] || {};
            // b2b depoları (vitrinDepolari) — depo select'ini doldurmak için
            let depots = [];
            try {
                depots = (await getDepotList(req.site)).map(d => d.ad).filter(Boolean);
            } catch { /* depo ayarı yoksa boş */ }
            // OEM ham değerlerinden marka bazlı liste çıkar: "Mercedes (MO)" → "Mercedes",
            // "Audi(AO),Volkswagen(+)" → "Audi","Volkswagen". "Yok"/boş dışlanır.
            const oemBrandSet = new Set();
            for (const raw of (g.oemRaw || [])) {
                if (!raw) continue;
                for (const part of String(raw).split(',')) {
                    const brand = part.split('(')[0].trim();
                    if (!brand || /^yok$/i.test(brand)) continue;
                    oemBrandSet.add(brand);
                }
            }
            const oems = [...oemBrandSet].sort((a, b) => String(a).localeCompare(String(b), 'tr'));

            // Sayıyla başlayan değerleri küçükten büyüğe sıralar (boşlar atılır)
            const sortNumeric = (values) => (values || [])
                .map(v => String(v || '').trim())
                .filter(Boolean)
                .sort((a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0) || a.localeCompare(b, 'tr'));

            facets = {
                brands: (g.brands || []).filter(Boolean).sort((a, b) => String(a).localeCompare(String(b), 'tr')),
                seasons: (g.seasons || []).filter(Boolean),
                dots: (g.dots || []).filter(d => /^(19|20)\d{2}$/.test(String(d))).sort((a, b) => Number(b) - Number(a)),
                oems,
                depots,
                productTypes: (g.productTypes || []).filter(Boolean),
                // Vitrin filtresi seçeneği: ad tema ayarından, adet bu kategorideki vitrin ürünü sayısı (0 ise ön yüz göstermez)
                showcaseFilter: catalogShowcase
                    ? { key: catalogShowcase.key, title: catalogShowcase.title, count: await WebProduct.countDocuments({ ...baseFilterForFacets, _key: { $in: catalogShowcase.productKeys } }) }
                    : null,
                // Panelde kategori için seçilen "Gizlenecek Filtreler" (siteContent.<site>.hiddenFilters)
                hiddenFilters: webCategory?.siteContent?.[req.site]?.hiddenFilters || [],
                rimDiameters: sortNumeric(g.rimDiameterRaw),
                boltPatterns: sortNumeric(g.boltPatternRaw)
            };
        }

        // Kategori bazlı fiyat gösterim ayarı (tek sorgu, önbellekli)
        const fiyatAyarlari = await getFiyatAyarlari(req.site);

        // Plasiyer karşılaştırması: LJA perakende fiyatını ekle (?perakende=1).
        // b2b fiyatlaması fiyat4'ü ezebileceği için site fiyatlamasından ÖNCE hesapla.
        if (req.query.perakende === '1') {
            for (const p of products) {
                const lp = resolveSitePrice(p, 'lastikjantavm');
                p.perakendeKurus = (typeof lp === 'number' && lp > 0 && lp !== PRICE_HIDDEN) ? Math.round(lp * 100) : null;
            }
        }

        applySitePricingMany(products, req.site);
        products.forEach(p => fiyatAyariUygula(p, fiyatAyarlari));

        // Sitenin kendi açıklaması etkin değer olarak yansıtılır (ürün detayındaki çözümün liste karşılığı)
        for (const product of products) {
            const siteDescription = product.customData?.siteDescriptions?.[req.site];
            if (siteDescription) product.customData.customDescription = siteDescription;
        }

        res.json({
            success: true,
            data: {
                products,
                pagination: {
                    currentPage: pageNum,
                    totalPages,
                    totalProducts,
                    productsPerPage: limitNum,
                    hasNextPage: pageNum < totalPages,
                    hasPrevPage: pageNum > 1
                },
                ...(facets ? { facets } : {})
            }
        });
    } catch (error) {
        console.error('Product filter error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
router.get('/championships/:productKey', async (req, res) => {
    try {
        const championships = await ChampionshipTire.find({
            productKey: req.params.productKey,
            site: req.site
        }).select('name rank').lean();

        res.json({ success: true, data: championships });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Şampiyonluk bilgisi alınamadı' });
    }
});
router.get('/:slug/wheelsize', async (req, res) => {
    try {
        const product = await WebProduct.findOne({
            $or: [
                { 'customData.seoUrl': req.params.slug },
                { '_key': req.params.slug }
            ]
        }).select('_key');

        if (!product) {
            return res.status(404).json({ success: false, message: 'Ürün bulunamadı' });
        }

        const wheelSizeDoc = await WebWheelSize.findOne({
            productKeys: product._key
        }).lean();

        if (!wheelSizeDoc) {
            return res.json({ success: true, data: null });
        }

        const wheelSize = {
            patternSlug: wheelSizeDoc.patternSlug,
            patternName: wheelSizeDoc.patternName,
            brandSlug: wheelSizeDoc.brandSlug,
            weThink: wheelSizeDoc.wheelsizeData?.ratings?.weThink || [],
            ratings: {
                score: wheelSizeDoc.wheelsizeData?.ratings?.score || null,
                popularity: wheelSizeDoc.wheelsizeData?.ratings?.popularity || null,
                tags: wheelSizeDoc.wheelsizeData?.ratings?.tags || []
            },
            buyNotBuy: wheelSizeDoc.wheelsizeData?.buyNotBuy || null,
            materials: wheelSizeDoc.wheelsizeData?.materials || [] // EKLE
        };

        res.json({ success: true, data: wheelSize });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/:slug', async (req, res) => {
    try {
        const { slug } = req.params;

        const product = await WebProduct.findOne({
            $or: [
                { 'customData.seoUrl': slug },
                { '_key': slug }
            ],
            ...getProductListFilters(req.site)
        }).lean();

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Ürün bulunamadı'
            });
        }

        // Sitenin kendi SEO/açıklama değerleri etkin değer olarak yansıtılır (yoksa ortak alanlar)
        if (product.customData) {
            const siteData = product.customData.siteData?.[req.site] || {};
            if (siteData.seoTitle !== undefined) product.customData.seoTitle = siteData.seoTitle;
            if (siteData.seoDescription !== undefined) product.customData.seoDescription = siteData.seoDescription;
            if (siteData.shortDescription !== undefined) product.customData.shortDescription = siteData.shortDescription;
            const siteDescription = product.customData.siteDescriptions?.[req.site];
            if (siteDescription) product.customData.customDescription = siteDescription;
        }

        // Kategori bazlı fiyat gösterim ayarı
        applySitePricing(product, req.site);
        fiyatAyariUygula(product, await getFiyatAyarlari(req.site));

        // Marka görünen adı: site bazlı displayName > ortak customName
        const marka = product.diaData?.marka;
        if (marka) {
            const webBrand = await WebBrand.findOne({
                diaBrand: { $regex: new RegExp(`^${marka}$`, 'i') }
            }).select('customName name siteContent').lean();

            const brandDisplay = webBrand?.siteContent?.[req.site]?.displayName || webBrand?.customName;
            if (webBrand && brandDisplay) {
                product.customData = product.customData || {};
                product.customData.brandDisplayName = brandDisplay;
                if (product.diaData?.aciklama) {
                    product.diaData.aciklama = product.diaData.aciklama.replace(
                        new RegExp(marka, 'gi'),
                        brandDisplay
                    );
                }
            }
        }

        res.json({
            success: true,
            data: product
        });

    } catch (error) {
        console.error('Ürün detay hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Ürün yüklenirken hata oluştu'
        });
    }
});
module.exports = router;