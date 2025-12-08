const express = require('express');
const router = express.Router();
const FrondSearchTerm = require('../../../models/web/catalog/FrondSearchTerm');
const WebProduct = require('../../../models/web/catalog/WebProduct');
const WebCategory = require('../../../models/web/catalog/WebCategory');
const WebBrand = require('../../../models/web/catalog/WebBrand');
const WebTag = require('../../../models/web/catalog/WebTag');

// POST /api/search/autocomplete
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