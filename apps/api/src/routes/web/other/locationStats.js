// Konum sayfaları için toplu (anonim) sipariş istatistiği — /api/location-stats
// İl ve ilçe bazında bölgeye gönderilen siparişlerde en çok tercih edilen lastik ebatları.
// Kişisel veri dönmez; yalnızca yeterli sipariş olan bölgeler için (MIN_ORDERS) ebat listesi verilir.
const express = require('express');
const router = express.Router();
const WebOrder = require('../../../models/web/order/WebOrder');
const WebProduct = require('../../../models/web/catalog/WebProduct');

const MIN_ORDERS = 3;       // bu sayının altındaki bölgeler için ebat gösterilmez
const TOP = 5;
const CACHE_MS = 6 * 60 * 60 * 1000;
const VALID_STATUSES = ['confirmed', 'processing', 'shipped', 'delivered'];

const cache = new Map();

async function buildStats(site) {
    // Sipariş satırları: bölge (il / ilçe) × ürün
    const rows = await WebOrder.aggregate([
        { $match: { site, status: { $in: VALID_STATUSES }, 'shippingSnapshot.cityId': { $exists: true, $ne: null } } },
        { $project: { cityId: '$shippingSnapshot.cityId', districtId: '$shippingSnapshot.districtId', items: '$items.productKey' } },
        { $unwind: '$items' },
        { $group: { _id: { c: '$cityId', d: '$districtId', p: '$items' }, orders: { $addToSet: '$_id' } } },
        { $project: { _id: 0, c: '$_id.c', d: '$_id.d', p: '$_id.p', n: { $size: '$orders' } } }
    ]);

    // Ürün → lastik ebadı
    const keys = [...new Set(rows.map(r => r.p).filter(Boolean))];
    const products = await WebProduct.find(
        { _key: { $in: keys }, 'diaData.ozelkod7kodu': 'LASTİK' },
        { _key: 1, 'diaData.m_urunOzellikleri': 1 }
    ).lean();
    const sizeOf = new Map();
    for (const p of products) {
        const oz = p.diaData?.m_urunOzellikleri || [];
        const get = n => oz.find(o => o.ozellikadi === n)?.detayaciklama;
        const w = get('Genişlik'), a = get('Yanak'), d = String(get('Jant Çapı') || '').replace(/[^\d.]/g, '');
        if (w && a && d) sizeOf.set(p._key, `${w}/${a}R${d}`);
    }

    // Bölge başına sipariş sayısı (tüm ürünler) ve ebat sayıları
    const region = new Map(); // key → { orders:Set, sizes:Map }
    const orderSets = await WebOrder.aggregate([
        { $match: { site, status: { $in: VALID_STATUSES }, 'shippingSnapshot.cityId': { $exists: true, $ne: null } } },
        { $group: { _id: { c: '$shippingSnapshot.cityId', d: '$shippingSnapshot.districtId' }, n: { $sum: 1 } } }
    ]);
    const add = (key, n) => { const r = region.get(key) || { orders: 0, sizes: new Map() }; r.orders += n; region.set(key, r); };
    for (const o of orderSets) { add(`c:${o._id.c}`, o.n); if (o._id.d) add(`d:${o._id.d}`, o.n); }
    for (const r of rows) {
        const size = sizeOf.get(r.p);
        if (!size) continue;
        for (const key of [`c:${r.c}`, r.d ? `d:${r.d}` : null]) {
            if (!key || !region.has(key)) continue;
            const m = region.get(key).sizes;
            m.set(size, (m.get(size) || 0) + r.n);
        }
    }

    const out = {};
    for (const [key, r] of region) {
        if (r.orders < MIN_ORDERS) continue;
        out[key] = {
            orderBucket: r.orders >= 100 ? '100+' : r.orders >= 50 ? '50+' : r.orders >= 10 ? '10+' : `${MIN_ORDERS}+`,
            topSizes: [...r.sizes.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP).map(([s]) => s)
        };
    }
    return out;
}

async function stats(site) {
    const hit = cache.get(site);
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;
    const value = await buildStats(site);
    cache.set(site, { at: Date.now(), value });
    return value;
}

// GET /api/location-stats — { "c:<cityId>": {...}, "d:<districtId>": {...} }
router.get('/', async (req, res) => {
    try {
        res.json({ success: true, data: await stats(req.site), minOrders: MIN_ORDERS });
    } catch (error) {
        console.error('[location-stats] hata:', error);
        res.status(500).json({ success: false, message: 'İstatistik alınamadı' });
    }
});

module.exports = router;
