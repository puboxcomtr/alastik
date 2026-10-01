// Araç uyumluluk rotaları — /api/vehicles
// Kaynak: vehiclefitments (Wheel-Size senkronu). Stok bilgisi site bazındadır ve sitenin mevcut
// etiket sayfalarından okunur (lastik ebadı / jant PCD etiketleri); böylece araç sayfasında görünen
// ürün sayısı ile bağlantı verilen etiket sayfasındaki liste birebir aynıdır.
const express = require('express');
const router = express.Router();
const WebVehicleFitment = require('../../../models/web/catalog/WebVehicleFitment');
const WebTag = require('../../../models/web/catalog/WebTag');
const WebProduct = require('../../../models/web/catalog/WebProduct');
const { MAIN_DIA_FILTERS, getSiteVisibilityFilter } = require('../../../config/diaFilters');

// Opel'in İngiltere pazarı adı (Opel ile aynı araçlar) — listelenmez
const HIDDEN_MAKES = new Set(['vauxhall']);
// Dizine açılma eşiği: fabrika ebatlarından en az birinde bu kadar ürün olmalı
const MIN_TIRE_STOCK = 3;
const CACHE_MS = 30 * 60 * 1000;

const cache = new Map(); // key → { at, value }
async function cached(key, fn) {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;
    const value = await fn();
    cache.set(key, { at: Date.now(), value });
    return value;
}

// "205/55R16" | "205/55ZR16" | "215/65R16C" → { key: "205-55-r16", c: true/false }
function parseTireSize(size) {
    const m = /^(\d{3})\/(\d{2})Z?R(\d{2}(?:\.\d)?)(C?)$/i.exec(String(size || '').trim());
    if (!m) return null;
    return { key: `${m[1]}-${m[2]}-r${m[3]}`.toLowerCase(), width: m[1], aspect: m[2], diameter: m[3], commercial: !!m[4] };
}

// Site etiketleri: lastik ebadı ve jant PCD → { seoUrl, count }
function tagMaps(site) {
    return cached(`tags:${site}`, async () => {
        const tags = await WebTag.find(
            { site, type: { $in: ['tire_size', 'rim_pcd'] }, isActive: true },
            { seoUrl: 1, type: 1, productCount: 1 }
        ).lean();
        const tires = new Map(), rims = new Map();
        for (const t of tags) {
            if (!t.seoUrl) continue;
            if (t.type === 'tire_size') {
                const m = /^(\d{3}-\d{2}-r\d{2}(?:\.\d)?)/.exec(t.seoUrl);
                if (!m) continue;
                const prev = tires.get(m[1]);
                // Aynı ebadın birden fazla etiketi varsa (ör. "-lastik-fiyatlari" ve varyant) ürün sayısı yüksek olan
                if (!prev || (t.productCount || 0) > prev.count) tires.set(m[1], { seoUrl: t.seoUrl, count: t.productCount || 0 });
            } else {
                const m = /^(\d+-\d+)-jant/.exec(t.seoUrl);
                if (m) rims.set(m[1], { seoUrl: t.seoUrl, count: t.productCount || 0 });
            }
        }
        return { tires, rims };
    });
}

// Kar zinciri stoğu: sitedeki kar zinciri aramasıyla aynı alanlar (Genişlik / Yanak / Jant Çapı)
function chainMap(site) {
    return cached(`chains:${site}`, async () => {
        const match = {
            'syncInfo.diaStatus': 'synced',
            'diaData.durum': 'A',
            'diaData.ozelkod7kodu': 'ZİNCİR',
            sites: site,
            $and: [getSiteVisibilityFilter(site)]
        };
        MAIN_DIA_FILTERS.forEach(f => { if (f.operator === '=') match[`diaData.${f.field}`] = f.value; });
        const rows = await WebProduct.find(match, { 'diaData.m_urunOzellikleri': 1 }).lean();
        const map = new Map();
        for (const p of rows) {
            const oz = p.diaData?.m_urunOzellikleri || [];
            const get = name => oz.find(o => o.ozellikadi === name)?.detayaciklama;
            const w = get('Genişlik'), a = get('Yanak'), d = String(get('Jant Çapı') || '').replace(/[^\d.]/g, '');
            if (!w || !a || !d) continue;
            const key = `${w}-${a}-r${d}`;
            map.set(key, (map.get(key) || 0) + 1);
        }
        return map;
    });
}

// "5x114.3" → "5-1143" (jant PCD etiket anahtarı)
const pcdKey = bp => String(bp || '').toLowerCase().replace('x', '-').replace('.', '');

// Model özeti + site stoğu (liste sayfaları ve sitemap için)
async function modelIndex(site) {
    return cached(`index:${site}`, async () => {
        const [{ tires }, docs] = await Promise.all([
            tagMaps(site),
            WebVehicleFitment.find({}, { makeSlug: 1, makeName: 1, modelSlug: 1, modelName: 1, summary: 1, syncedAt: 1 }).lean()
        ]);
        return docs
            .filter(d => !HIDDEN_MAKES.has(d.makeSlug))
            .map(d => {
                const sizes = (d.summary?.oeTireSizes || []).map(parseTireSize).filter(Boolean);
                const counts = [...new Set(sizes.map(s => s.key))].map(k => tires.get(k)?.count || 0);
                return {
                    makeSlug: d.makeSlug,
                    makeName: d.makeName,
                    modelSlug: d.modelSlug,
                    modelName: d.modelName,
                    yearFrom: d.summary?.yearFrom,
                    yearTo: d.summary?.yearTo,
                    oeTireSizes: (d.summary?.oeTireSizes || []).slice(0, 6),
                    rimDiameters: d.summary?.rimDiameters || [],
                    boltPatterns: d.summary?.boltPatterns || [],
                    tireStock: counts.reduce((a, b) => a + b, 0),
                    indexable: counts.some(c => c >= MIN_TIRE_STOCK),
                    updatedAt: d.syncedAt
                };
            });
    });
}

// GET /api/vehicles/makes — markalar ve model sayıları
router.get('/makes', async (req, res) => {
    try {
        const index = await modelIndex(req.site);
        const makes = new Map();
        for (const m of index) {
            const cur = makes.get(m.makeSlug) || { makeSlug: m.makeSlug, makeName: m.makeName, modelCount: 0, indexableModelCount: 0, tireStock: 0 };
            cur.modelCount++;
            if (m.indexable) cur.indexableModelCount++;
            cur.tireStock += m.tireStock;
            makes.set(m.makeSlug, cur);
        }
        const data = [...makes.values()].sort((a, b) => a.makeName.localeCompare(b.makeName, 'tr'));
        res.json({ success: true, data });
    } catch (error) {
        console.error('[vehicles] makes hatası:', error);
        res.status(500).json({ success: false, message: 'Markalar alınamadı' });
    }
});

// GET /api/vehicles/index — tüm modeller (sitemap / listeler)
router.get('/index', async (req, res) => {
    try {
        res.json({ success: true, data: await modelIndex(req.site) });
    } catch (error) {
        console.error('[vehicles] index hatası:', error);
        res.status(500).json({ success: false, message: 'Araç listesi alınamadı' });
    }
});

// GET /api/vehicles/by-size/:size — bu ebadı fabrika çıkışı kullanan modeller (ör. 205-55-r16)
// Etiket (ebat) ve lastik ürün sayfalarındaki "Bu ebadı kullanan araçlar" bloğu için
router.get('/by-size/:size', async (req, res) => {
    try {
        const m = /^(\d{3})-(\d{2})-r(\d{2}(?:\.\d)?)$/i.exec(String(req.params.size || ''));
        if (!m) return res.status(400).json({ success: false, message: 'Ebat biçimi: 205-55-r16' });
        const [, w, a, d] = m;
        const data = await cached(`by-size:${req.site}:${w}-${a}-${d}`, async () => {
            const variants = [`${w}/${a}R${d}`, `${w}/${a}ZR${d}`, `${w}/${a}R${d}C`];
            const docs = await WebVehicleFitment.find(
                { 'summary.oeTireSizes': { $in: variants } },
                { makeSlug: 1, makeName: 1, modelSlug: 1, modelName: 1, 'summary.yearFrom': 1, 'summary.yearTo': 1 }
            ).lean();
            const indexable = new Set((await modelIndex(req.site)).filter(x => x.indexable).map(x => `${x.makeSlug}/${x.modelSlug}`));
            return docs
                .filter(x => !HIDDEN_MAKES.has(x.makeSlug))
                .map(x => ({
                    makeSlug: x.makeSlug, makeName: x.makeName, modelSlug: x.modelSlug, modelName: x.modelName,
                    yearFrom: x.summary?.yearFrom, yearTo: x.summary?.yearTo,
                    indexable: indexable.has(`${x.makeSlug}/${x.modelSlug}`)
                }))
                .sort((p, q) => p.makeName.localeCompare(q.makeName, 'tr') || p.modelName.localeCompare(q.modelName, 'tr'));
        });
        res.json({ success: true, data });
    } catch (error) {
        console.error('[vehicles] by-size hatası:', error);
        res.status(500).json({ success: false, message: 'Araçlar alınamadı' });
    }
});

// GET /api/vehicles/:make — markanın modelleri
router.get('/:make', async (req, res) => {
    try {
        const make = String(req.params.make).toLowerCase();
        const models = (await modelIndex(req.site)).filter(m => m.makeSlug === make);
        if (!models.length) return res.status(404).json({ success: false, message: 'Marka bulunamadı' });
        models.sort((a, b) => (b.yearTo || 0) - (a.yearTo || 0) || a.modelName.localeCompare(b.modelName, 'tr'));
        res.json({ success: true, data: { makeSlug: make, makeName: models[0].makeName, models } });
    } catch (error) {
        console.error('[vehicles] marka hatası:', error);
        res.status(500).json({ success: false, message: 'Marka alınamadı' });
    }
});

// GET /api/vehicles/:make/:model — model detayı + ebat bazında site stoğu
router.get('/:make/:model', async (req, res) => {
    try {
        const make = String(req.params.make).toLowerCase();
        const model = String(req.params.model).toLowerCase();
        if (HIDDEN_MAKES.has(make)) return res.status(404).json({ success: false, message: 'Araç bulunamadı' });
        const doc = await WebVehicleFitment.findOne({ makeSlug: make, modelSlug: model }).lean();
        if (!doc) return res.status(404).json({ success: false, message: 'Araç bulunamadı' });

        const [{ tires, rims }, chains] = await Promise.all([tagMaps(req.site), chainMap(req.site)]);

        const sizeInfo = (size, oe) => {
            const p = parseTireSize(size);
            if (!p) return { size, oe, key: null, tag: null, chainCount: 0 };
            return {
                size, oe, key: p.key, width: p.width, aspect: p.aspect, diameter: p.diameter, commercial: p.commercial,
                tag: tires.get(p.key) || null,
                chainCount: chains.get(p.key) || 0
            };
        };
        // Aynı ebadın yazım varyantları (205/55R16 ↔ 205/55ZR16) tek satır; fabrika ebadı alternatiften önce gelir
        const seen = new Set();
        const tireSizes = [
            ...(doc.summary?.oeTireSizes || []).map(s => sizeInfo(s, true)),
            ...(doc.summary?.optionalTireSizes || []).map(s => sizeInfo(s, false))
        ].filter(s => {
            const k = s.key || s.size;
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
        });
        const rimInfo = (doc.summary?.boltPatterns || []).map(bp => ({
            boltPattern: bp,
            tag: rims.get(pcdKey(bp)) || null
        }));
        const oeCounts = tireSizes.filter(s => s.oe).map(s => s.tag?.count || 0);

        res.json({
            success: true,
            data: {
                ...doc,
                stock: {
                    tireSizes,
                    rims: rimInfo,
                    indexable: oeCounts.some(c => c >= MIN_TIRE_STOCK),
                    minTireStock: MIN_TIRE_STOCK
                }
            }
        });
    } catch (error) {
        console.error('[vehicles] model hatası:', error);
        res.status(500).json({ success: false, message: 'Araç alınamadı' });
    }
});

module.exports = router;
