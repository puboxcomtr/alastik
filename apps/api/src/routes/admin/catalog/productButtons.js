const router = require('express').Router();
const WebProduct = require('../../../models/web/catalog/WebProduct');
const WebProductButton = require('../../../models/web/catalog/WebProductButton');
const { invalidateProductButtons } = require('../../../utils/productButtons');

const MAX_BULK_PRODUCTS = 500;
const escapeRegex = (v) => String(v).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const buttonsPath = (site) => `customData.siteData.${site}.buttons`;

const loadButtonKeys = async (site) => {
    const defs = await WebProductButton.find({ site, isActive: true }, { key: 1 }).lean();
    return new Set(defs.map(d => d.key));
};

router.get('/', async (req, res) => {
    try {
        const buttons = await WebProductButton.find({ site: req.site })
            .sort({ order: 1, label: 1 })
            .select('key label content colorFrom colorTo textColor icon order isActive')
            .lean();
        res.json({ success: true, data: buttons });
    } catch (error) {
        console.error('Ürün butonları listelenemedi:', error);
        res.status(500).json({ success: false, message: 'Ürün butonları yüklenemedi' });
    }
});

router.get('/products', async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 20), 200);
        const match = { sites: req.site };
        const text = (name) => String(req.query[name] || '').trim();

        if (text('search')) {
            match.$and = text('search').split(/\s+/).filter(Boolean).map(word => {
                const regex = new RegExp(escapeRegex(word), 'i');
                return { $or: [{ 'diaData.aciklama': regex }, { 'diaData.stokkartkodu': regex }, { 'diaData.marka': regex }] };
            });
        }
        if (text('brand')) match['diaData.marka'] = text('brand');
        if (text('season')) match['diaData.ozelkod1kodu'] = text('season');
        if (text('main_category')) match['diaData.m_kategoriler.kategori_aciklama_1'] = text('main_category');
        if (text('sub_category')) match['diaData.m_kategoriler.kategori_aciklama_2'] = text('sub_category');
        if (text('stock_source') === 'xml') match['syncInfo.syncSource'] = 'xml_integration';
        else if (text('stock_source') === 'own') match['syncInfo.syncSource'] = { $ne: 'xml_integration' };
        const stockMin = parseFloat(req.query.stock_min);
        const stockMax = parseFloat(req.query.stock_max);
        if (Number.isFinite(stockMin) || Number.isFinite(stockMax)) {
            match['diaData.gercek_stok'] = {
                ...(Number.isFinite(stockMin) ? { $gte: stockMin } : {}),
                ...(Number.isFinite(stockMax) ? { $lte: stockMax } : {})
            };
        }

        const [products, total, validKeys] = await Promise.all([
            WebProduct.find(match)
                .sort({ 'diaData.aciklama': 1, _key: 1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .select({
                    _key: 1,
                    'diaData.aciklama': 1,
                    'diaData.stokkartkodu': 1,
                    'diaData.marka': 1,
                    'diaData.gercek_stok': 1,
                    'diaData.m_resimler.aws_url': 1,
                    'customData.featuredImage': 1,
                    [buttonsPath(req.site)]: 1
                })
                .lean(),
            WebProduct.countDocuments(match),
            loadButtonKeys(req.site)
        ]);

        const data = products.map(p => ({
            key: p._key,
            name: p.diaData?.aciklama || p.diaData?.stokkartkodu || p._key,
            stockCode: p.diaData?.stokkartkodu || '',
            brand: p.diaData?.marka || '',
            stock: Number(p.diaData?.gercek_stok) || 0,
            image: p.customData?.featuredImage || p.diaData?.m_resimler?.[0]?.aws_url || '',
            buttons: (p.customData?.siteData?.[req.site]?.buttons || []).filter(k => validKeys.has(k))
        }));

        res.json({ success: true, data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
    } catch (error) {
        console.error('Ürün butonları ürün listesi hatası:', error);
        res.status(500).json({ success: false, message: 'Ürünler yüklenemedi' });
    }
});

const toggleUpdate = (site, button, active) => (
    active ? { $addToSet: { [buttonsPath(site)]: button } } : { $pull: { [buttonsPath(site)]: button } }
);

router.put('/products/:key', async (req, res) => {
    try {
        const button = String(req.body?.button || '').trim();
        const active = req.body?.active === true;
        if (!(await loadButtonKeys(req.site)).has(button)) {
            return res.status(400).json({ success: false, message: 'Geçersiz buton' });
        }

        const result = await WebProduct.updateOne({ _key: String(req.params.key), sites: req.site }, toggleUpdate(req.site, button, active));
        if (!result.matchedCount) return res.status(404).json({ success: false, message: 'Ürün bulunamadı' });
        invalidateProductButtons();

        res.json({ success: true, data: { key: String(req.params.key), button, active } });
    } catch (error) {
        console.error('Ürün butonu güncellenemedi:', error);
        res.status(500).json({ success: false, message: 'Buton güncellenemedi' });
    }
});

router.put('/products', async (req, res) => {
    try {
        const button = String(req.body?.button || '').trim();
        const active = req.body?.active === true;
        const keys = Array.isArray(req.body?.keys) ? [...new Set(req.body.keys.map(String))] : [];

        if (!keys.length) return res.status(400).json({ success: false, message: 'Ürün seçilmedi' });
        if (keys.length > MAX_BULK_PRODUCTS) {
            return res.status(400).json({ success: false, message: `Tek seferde en fazla ${MAX_BULK_PRODUCTS} ürün güncellenebilir` });
        }
        if (!(await loadButtonKeys(req.site)).has(button)) {
            return res.status(400).json({ success: false, message: 'Geçersiz buton' });
        }

        const result = await WebProduct.updateMany({ _key: { $in: keys }, sites: req.site }, toggleUpdate(req.site, button, active));
        invalidateProductButtons();
        res.json({ success: true, data: { button, active, matched: result.matchedCount, modified: result.modifiedCount } });
    } catch (error) {
        console.error('Ürün butonu toplu güncellenemedi:', error);
        res.status(500).json({ success: false, message: 'Butonlar güncellenemedi' });
    }
});

module.exports = router;
