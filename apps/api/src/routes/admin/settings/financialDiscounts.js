const router = require('express').Router();
const FinancialDiscount = require('../../../models/admin/settings/FinancialDiscount');
const { CUSTOMER_TIERS, STOCK_SOURCES, buildScopeKey } = FinancialDiscount;
const { PAYMENT_METHODS } = require('../../../services/plugins/dia/diaCampaignPricing');
const WebProduct = require('../../../models/web/catalog/WebProduct');
const { invalidateFinancialDiscounts } = require('../../../services/web/b2b/financialDiscounts');

const escapeRegex = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const TIER_IDS = CUSTOMER_TIERS.map(t => t.id);
const METHOD_IDS = PAYMENT_METHODS.map(m => m.id);
const SOURCE_IDS = STOCK_SOURCES.map(x => x.id);

/**
 * İstek gövdesini doğrular ve kayıt alanlarına çevirir.
 * @returns {{ data: object } | { error: string }}
 */
function parseBody(body) {
    const name = String(body.name || '').trim();
    const customerTier = String(body.customerTier || '');
    const paymentMethod = String(body.paymentMethod || '');
    const categories = cleanList(body.categories);
    const brands = cleanList(body.brands);
    // Alt kategori yalnız seçili bir ana kategoriye aitse kabul edilir
    const seenSub = new Set();
    const subCategories = (Array.isArray(body.subCategories) ? body.subCategories : [])
        .map(item => ({ main: String(item?.main || '').trim(), name: String(item?.name || '').trim() }))
        .filter(item => item.main && item.name && categories.includes(item.main))
        .filter(item => { const key = `${item.main}>${item.name}`; if (seenSub.has(key)) return false; seenSub.add(key); return true; });
    const productionYear = String(body.productionYear || '').trim();
    // "ve öncesi" yalnız yıl seçiliyken anlamlıdır
    const productionYearAndOlder = !!productionYear && body.productionYearAndOlder === true;
    const stockSource = String(body.stockSource || '');
    const rate = Number(body.rate);
    if (!name) return { error: 'İskonto adı zorunludur' };
    if (!TIER_IDS.includes(customerTier)) return { error: 'Geçerli bir cari tipi seçiniz' };
    if (!METHOD_IDS.includes(paymentMethod)) return { error: 'Geçerli bir ödeme yöntemi seçiniz' };
    if (body.rate === '' || body.rate === null || body.rate === undefined || !Number.isFinite(rate) || rate < 0 || rate > 100) {
        return { error: 'İskonto oranı 0 ile 100 arasında olmalıdır' };
    }
    if (productionYear && !PRODUCTION_YEAR_PATTERN.test(productionYear)) return { error: 'Üretim yılı dört haneli olmalıdır' };
    if (stockSource && !SOURCE_IDS.includes(stockSource)) return { error: 'Geçerli bir stok kaynağı seçiniz' };
    const scope = { customerTier, paymentMethod, productionYear, productionYearAndOlder, categories, subCategories, brands, stockSource };
    return { data: { name, ...scope, rate, isActive: body.isActive !== false, scopeKey: buildScopeKey(scope) } };
}

// Liste sıralaması: istemcinin gönderebileceği sütun → veritabanı alanı
const SORT_FIELDS = {
    name: 'name',
    stockSource: 'stockSource',
    categories: 'categories',
    brands: 'brands',
    productionYear: 'productionYear',
    paymentMethod: 'paymentMethod',
    rate: 'rate',
    isActive: 'isActive'
};
const DEFAULT_SORT = { customerTier: -1, paymentMethod: 1, productionYear: -1, name: 1 };

const DUPLICATE_MESSAGE = 'Aynı cari tipi, stok kaynağı, kategori, marka, üretim yılı ve ödeme yöntemiyle zaten bir iskonto tanımı var';

/** Metin listesini temizler: boşlukları kırpar, boşları ve tekrarları atar */
function cleanList(input) {
    return [...new Set((Array.isArray(input) ? input : []).map(v => String(v || '').trim()).filter(Boolean))];
}
const PRODUCTION_YEAR_PATTERN = /^\d{4}$/;

// GET /options — form/filtre seçenekleri: cari tipleri, ödeme yöntemleri ve sitedeki ürünlerden
// kategori / marka / üretim yılı listeleri
router.get('/options', async (req, res) => {
    try {
        const base = { sites: req.site, 'diaData.durum': 'A' };
        const [categoryRows, brands, years] = await Promise.all([
            WebProduct.aggregate([
                { $match: base },
                { $unwind: '$diaData.m_kategoriler' },
                { $group: { _id: { main: '$diaData.m_kategoriler.kategori_aciklama_1', sub: '$diaData.m_kategoriler.kategori_aciklama_2' } } }
            ]),
            WebProduct.distinct('diaData.marka', base),
            WebProduct.distinct('diaData.ekalan5', base)
        ]);
        const clean = list => [...new Set(list.map(v => String(v || '').trim()).filter(Boolean))];
        const byName = (a, b) => a.localeCompare(b, 'tr');
        // Ana kategori → alt kategorileri
        const tree = new Map();
        for (const row of categoryRows) {
            const main = String(row._id?.main || '').trim();
            const sub = String(row._id?.sub || '').trim();
            if (!main) continue;
            if (!tree.has(main)) tree.set(main, new Set());
            if (sub) tree.get(main).add(sub);
        }
        res.json({
            success: true,
            data: {
                customerTiers: CUSTOMER_TIERS,
                paymentMethods: PAYMENT_METHODS,
                stockSources: STOCK_SOURCES.map(({ id, title }) => ({ id, title })),
                categories: [...tree.keys()].sort(byName).map(name => ({ name, subCategories: [...tree.get(name)].sort(byName) })),
                brands: clean(brands).sort(byName),
                productionYears: clean(years).filter(y => PRODUCTION_YEAR_PATTERN.test(y)).sort((a, b) => b.localeCompare(a))
            }
        });
    } catch (error) {
        console.error('Financial discount options error:', error);
        res.status(500).json({ success: false, message: 'Seçenekler yüklenemedi' });
    }
});

// GET / — liste (arama + filtre + sayfalama)
router.get('/', async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(parseInt(req.query.limit) || 50, 500);
        const query = { site: req.site };

        if (req.query.search?.trim()) query.name = new RegExp(escapeRegex(req.query.search.trim()), 'i');
        if (TIER_IDS.includes(req.query.customerTier)) query.customerTier = req.query.customerTier;
        if (METHOD_IDS.includes(req.query.paymentMethod)) query.paymentMethod = req.query.paymentMethod;
        // Dizi alanlarında "içeriyor" eşleşmesi
        if (req.query.brand?.trim()) query.brands = req.query.brand.trim();
        if (req.query.category?.trim()) query.categories = req.query.category.trim();
        // Yıl filtresi: o yılı kapsayan kurallar (tam yıl ya da "ve öncesi" aralığı)
        if (req.query.productionYear?.trim()) {
            const year = req.query.productionYear.trim();
            query.$or = [{ productionYear: year }, { productionYearAndOlder: true, productionYear: { $gte: year } }];
        }
        if (SOURCE_IDS.includes(req.query.stockSource)) query.stockSource = req.query.stockSource;
        if (req.query.status === 'active') query.isActive = true;
        else if (req.query.status === 'passive') query.isActive = false;

        // Sütun başlığına tıklanınca gelen sıralama (tüm kayıtlarda, sayfadan bağımsız); ikincil anahtar ad
        const sortField = SORT_FIELDS[req.query.sort];
        const sort = sortField
            ? { [sortField]: req.query.order === 'desc' ? -1 : 1, ...(sortField === 'name' ? {} : { name: 1 }), _id: 1 }
            : DEFAULT_SORT;

        const [items, total] = await Promise.all([
            FinancialDiscount.find(query)
                .sort(sort)
                .collation({ locale: 'tr' })
                .skip((page - 1) * limit).limit(limit).lean(),
            FinancialDiscount.countDocuments(query)
        ]);

        res.json({ success: true, data: items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
    } catch (error) {
        console.error('Financial discounts list error:', error);
        res.status(500).json({ success: false, message: 'Finansal iskontolar yüklenemedi' });
    }
});

// POST / — yeni iskonto
router.post('/', async (req, res) => {
    try {
        const parsed = parseBody(req.body || {});
        if (parsed.error) return res.status(400).json({ success: false, message: parsed.error });
        const doc = await FinancialDiscount.create({ site: req.site, ...parsed.data });
        invalidateFinancialDiscounts(req.site);
        res.json({ success: true, data: doc, message: 'İskonto eklendi' });
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ success: false, message: DUPLICATE_MESSAGE });
        console.error('Financial discount create error:', error);
        res.status(500).json({ success: false, message: 'İskonto eklenemedi' });
    }
});

// PUT /:id — güncelle
router.put('/:id', async (req, res) => {
    try {
        const parsed = parseBody(req.body || {});
        if (parsed.error) return res.status(400).json({ success: false, message: parsed.error });
        const doc = await FinancialDiscount.findOneAndUpdate(
            { _id: req.params.id, site: req.site },
            { $set: parsed.data },
            { new: true, runValidators: true }
        );
        if (!doc) return res.status(404).json({ success: false, message: 'İskonto bulunamadı' });
        invalidateFinancialDiscounts(req.site);
        res.json({ success: true, data: doc, message: 'İskonto güncellendi' });
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ success: false, message: DUPLICATE_MESSAGE });
        console.error('Financial discount update error:', error);
        res.status(500).json({ success: false, message: 'İskonto güncellenemedi' });
    }
});

// PATCH /:id/status — aktif/pasif
router.patch('/:id/status', async (req, res) => {
    try {
        const doc = await FinancialDiscount.findOne({ _id: req.params.id, site: req.site });
        if (!doc) return res.status(404).json({ success: false, message: 'İskonto bulunamadı' });
        doc.isActive = !doc.isActive;
        await doc.save();
        invalidateFinancialDiscounts(req.site);
        res.json({ success: true, data: doc, message: doc.isActive ? 'İskonto aktif edildi' : 'İskonto pasif edildi' });
    } catch (error) {
        console.error('Financial discount status error:', error);
        res.status(500).json({ success: false, message: 'Durum güncellenemedi' });
    }
});

// DELETE /:id — sil
router.delete('/:id', async (req, res) => {
    try {
        const doc = await FinancialDiscount.findOneAndDelete({ _id: req.params.id, site: req.site });
        if (!doc) return res.status(404).json({ success: false, message: 'İskonto bulunamadı' });
        invalidateFinancialDiscounts(req.site);
        res.json({ success: true, message: 'İskonto silindi' });
    } catch (error) {
        console.error('Financial discount delete error:', error);
        res.status(500).json({ success: false, message: 'İskonto silinemedi' });
    }
});

module.exports = router;
