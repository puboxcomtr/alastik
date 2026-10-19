const express = require('express');
const router = express.Router();
const WebProduct = require('../../../models/web/catalog/WebProduct');
const WebBrand = require('../../../models/web/catalog/WebBrand');
const WebCategory = require('../../../models/web/catalog/WebCategory');
const WebTag = require('../../../models/web/catalog/WebTag');
const Setting = require('../../../models/admin/settings/Setting');
const { getProductListFilters } = require('../../../config/diaFilters');
const { pricedCondition } = require('../../../utils/sitePricing');

const CACHE_MS = 6 * 60 * 60 * 1000;
const SEASONS = { yaz: 'Yaz', kis: 'Kış', dort: '4 Mevsim' };
const SECOND_HAND_SLUG = 'ikinci-el';

const cache = new Map();
async function cached(key, fn) {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;
    const value = await fn();
    cache.set(key, { at: Date.now(), value });
    return value;
}

async function baseFilter(site) {
    const filter = getProductListFilters(site);
    filter[`customData.siteData.${site}.hideFromListing`] = { $ne: true };
    const hidePriceless = await Setting.findOne({ key: 'hidePricelessProducts', group: 'showcase', site }).lean();
    if (hidePriceless?.value === true) Object.assign(filter, pricedCondition(site));
    const and = [];
    const secondHand = await WebCategory.findOne({ slug: SECOND_HAND_SLUG }).lean();
    if (secondHand?.diaCategory) {
        and.push({
            'diaData.m_kategoriler': {
                $not: { $elemMatch: { [secondHand.diaLevel || 'kategori_aciklama_2']: secondHand.diaCategory } }
            }
        });
    }
    return { filter, and };
}

const attr = (name) => ({
    $let: {
        vars: {
            o: { $arrayElemAt: [{ $filter: { input: { $ifNull: ['$diaData.m_urunOzellikleri', []] }, as: 'x', cond: { $eq: ['$$x.ozellikadi', name] } } }, 0] }
        },
        in: '$$o.detayaciklama'
    }
});

const pairs = (rows) => rows.filter(r => r._id !== null && r._id !== undefined && r._id !== '').map(r => [String(r._id), r.n]);
const groupCount = (field) => [{ $group: { _id: field, n: { $sum: 1 } } }, { $sort: { n: -1 } }];

const seriesKey = (s) => String(s || '').toLocaleLowerCase('tr-TR').replace(/ı/g, 'i').replace(/[^a-z0-9]+/g, '');
function mergeSeries(rows) {
    const map = new Map();
    for (const r of rows) {
        const name = String(r._id.s || '').trim();
        if (!name || /^yok$/i.test(name)) continue;
        const key = `${seriesKey(name)}|${r._id.m || ''}`;
        const prev = map.get(key);
        const better = !prev || (/[A-Z ]/.test(name) && !/[A-Z ]/.test(prev.name)) ? name : prev.name;
        map.set(key, { name: better, season: r._id.m || null, n: (prev?.n || 0) + r.n });
    }
    return [...map.values()].sort((a, b) => b.n - a.n);
}

async function buildStats(site, brand, seasonKey) {
    const { filter, and } = await baseFilter(site);
    filter['diaData.marka'] = brand.diaMarkaAck || brand.diaBrand || brand.name;
    if (seasonKey) filter['diaData.ozelkod1kodu'] = SEASONS[seasonKey];
    if (and.length) filter.$and = and;

    const [f] = await WebProduct.aggregate([
        { $match: filter },
        {
            $project: {
                type: '$diaData.ozelkod7kodu',
                season: '$diaData.ozelkod1kodu',
                series: '$diaData.ozelkod5kodu',
                size: '$diaData.ozelkod3kodu',
                rim: '$diaData.ozelkod4kodu',
                origin: '$diaData.menseiulkeadi',
                vehicle: attr('Araç Tipi'),
                rft: attr('Run Flat'),
                xl: attr('XL'),
                seal: attr('Seal'),
                year: attr('Üretim Tarihi'),
                wet: attr('Islak Zeminde Frenleme'),
                fuel: attr('Yakıt Verimliliği'),
                noise: attr('Gürültü Seviyesi'),
                name: '$diaData.aciklama'
            }
        },
        {
            $facet: {
                total: [{ $count: 'n' }],
                types: groupCount('$type'),
                seasons: groupCount('$season'),
                series: [{ $group: { _id: { s: '$series', m: '$season' }, n: { $sum: 1 } } }],
                sizes: [{ $match: { type: 'LASTİK' } }, ...groupCount('$size'), { $limit: 40 }],
                sizeCount: [{ $match: { type: 'LASTİK' } }, { $group: { _id: '$size' } }, { $count: 'n' }],
                rims: groupCount('$rim'),
                origins: groupCount('$origin'),
                vehicles: groupCount('$vehicle'),
                rft: [{ $match: { rft: 'Evet' } }, { $count: 'n' }],
                xl: [{ $match: { xl: 'Evet' } }, { $count: 'n' }],
                seal: [{ $match: { seal: 'Evet' } }, { $count: 'n' }],
                ev: [{ $match: { $or: [{ vehicle: 'Elektrikli Araç' }, { name: { $regex: /\b(EV|Elect|e\.Primacy|Enliten|iON)\b/i } }] } }, { $count: 'n' }],
                snow: [{ $match: { name: { $regex: /3PMSF/i } } }, { $count: 'n' }],
                years: groupCount('$year'),
                wet: groupCount('$wet'),
                fuel: groupCount('$fuel'),
                noise: [{ $match: { noise: { $regex: /^\d+$/ } } }, { $group: { _id: null, min: { $min: { $toInt: '$noise' } }, max: { $max: { $toInt: '$noise' } } } }]
            }
        }
    ]).allowDiskUse(true);

    const one = (a) => a?.[0]?.n || 0;
    return {
        total: one(f.total),
        types: pairs(f.types),
        seasons: pairs(f.seasons),
        series: mergeSeries(f.series).slice(0, 40),
        sizes: pairs(f.sizes),
        sizeCount: one(f.sizeCount),
        rims: pairs(f.rims).filter(([r]) => /^\d/.test(r)),
        origins: pairs(f.origins),
        vehicles: pairs(f.vehicles),
        runFlat: one(f.rft),
        xl: one(f.xl),
        seal: one(f.seal),
        ev: one(f.ev),
        snowflake: one(f.snow),
        years: pairs(f.years).filter(([y]) => /^20\d\d$/.test(y)).sort((a, b) => b[0].localeCompare(a[0])),
        wet: pairs(f.wet).filter(([g]) => /^[A-E]$/.test(g)),
        fuel: pairs(f.fuel).filter(([g]) => /^[A-E]$/.test(g)),
        noise: f.noise?.[0] ? { min: f.noise[0].min, max: f.noise[0].max } : null
    };
}

async function brandTags(site, slug) {
    const variants = [...new Set([slug, slug.replace(/-/g, '')])].map(v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const rx = new RegExp(`(^|-)(${variants.join('|')})-`);
    const tags = await WebTag.find(
        { site, isActive: true, productCount: { $gt: 0 }, seoUrl: { $regex: rx } },
        { title: 1, seoUrl: 1, productCount: 1, season: 1 }
    ).lean();
    const seasonRx = new RegExp(`^(${variants.join('|')})-(yaz|kis|4-mevsim)-lastik`);
    const out = { series: [], sizes: [], seasons: [] };
    for (const t of tags) {
        const row = { title: t.title, url: t.seoUrl, n: t.productCount };
        if (/^\d/.test(t.seoUrl)) out.sizes.push(row);
        else if (seasonRx.test(t.seoUrl)) out.seasons.push(row);
        else out.series.push(row);
    }
    for (const k of Object.keys(out)) out[k].sort((a, b) => b.n - a.n);
    return out;
}

async function findBrand(site, slug) {
    return WebBrand.findOne(
        { slug, [`siteSettings.${site}.webVisible`]: true },
        { name: 1, slug: 1, diaBrand: 1, diaMarkaAck: 1, updatedAt: 1 }
    ).lean();
}

router.get('/', async (req, res) => {
    try {
        const data = await cached(`index:${req.site}`, async () => {
            const brands = await WebBrand.find(
                { [`siteSettings.${req.site}.webVisible`]: true, [`siteSettings.${req.site}.productCount`]: { $gt: 0 } },
                { name: 1, slug: 1, diaBrand: 1, diaMarkaAck: 1, updatedAt: 1 }
            ).lean();
            const { filter, and } = await baseFilter(req.site);
            if (and.length) filter.$and = and;
            filter['diaData.marka'] = { $in: brands.map(b => b.diaMarkaAck || b.diaBrand || b.name) };
            const rows = await WebProduct.aggregate([
                { $match: filter },
                { $group: { _id: { b: '$diaData.marka', s: '$diaData.ozelkod1kodu', t: '$diaData.ozelkod7kodu' }, n: { $sum: 1 } } }
            ]).allowDiskUse(true);
            return brands.map(b => {
                const ack = b.diaMarkaAck || b.diaBrand || b.name;
                const mine = rows.filter(r => r._id.b === ack);
                const tire = mine.filter(r => r._id.t === 'LASTİK');
                const season = (v) => tire.filter(r => r._id.s === v).reduce((s, r) => s + r.n, 0);
                return {
                    slug: b.slug,
                    name: b.name,
                    total: mine.reduce((s, r) => s + r.n, 0),
                    tires: tire.reduce((s, r) => s + r.n, 0),
                    seasons: { yaz: season('Yaz'), kis: season('Kış'), dort: season('4 Mevsim') },
                    updatedAt: b.updatedAt
                };
            });
        });
        res.json({ success: true, data });
    } catch (error) {
        console.error('[brand-seo] index hata:', error);
        res.status(500).json({ success: false, message: 'Marka özeti alınamadı' });
    }
});

router.get('/:slug', async (req, res) => {
    try {
        const slug = String(req.params.slug || '').toLowerCase();
        const season = req.query.mevsim ? String(req.query.mevsim) : '';
        if (season && !SEASONS[season]) return res.status(400).json({ success: false, message: 'Geçersiz mevsim' });

        const data = await cached(`brand:${req.site}:${slug}:${season}`, async () => {
            const brand = await findBrand(req.site, slug);
            if (!brand) return null;
            const [stats, tags] = await Promise.all([buildStats(req.site, brand, season), brandTags(req.site, slug)]);
            return { brand: { slug: brand.slug, name: brand.name, ack: brand.diaMarkaAck || brand.diaBrand || brand.name }, season: season || null, stats, tags };
        });
        if (!data) return res.status(404).json({ success: false, message: 'Marka bulunamadı' });
        res.json({ success: true, data });
    } catch (error) {
        console.error('[brand-seo] hata:', error);
        res.status(500).json({ success: false, message: 'Marka özeti alınamadı' });
    }
});

module.exports = router;
