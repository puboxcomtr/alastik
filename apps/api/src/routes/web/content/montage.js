// Vitrin: Montaj Noktaları (site bazlı, yalnız aktif kayıtlar)
// DİKKAT: documents (bayi sözleşmeleri) İÇ EVRAKTIR, hiçbir uçtan dışarı verilmez.
const express = require('express');
const router = express.Router();
const WebMontagePoint = require('../../../models/web/content/WebMontagePoint');

// Satın alma öncesi noktalar ANONİMDİR: ad, adres, telefon, görsel ve hassas konum dışarı verilmez
// (müşteri hizmeti satın alınca sipariş tarafında açılır). documents bayi sözleşmesidir, HER ZAMAN gizli.
const PUBLIC_FIELDS = {
    documents: 0,
    name: 0,
    address: 0,
    phone: 0,
    image: 0,
    __v: 0
};

const ANONYMOUS_NAME = 'Anlaşmalı Nokta';

/** Konumu ~1 km hassasiyete yuvarlar: harita bölgeye yaklaşır ama noktayı ele vermez */
function fuzzLocation(location) {
    if (!location || location.lat === null || location.lng === null) return { lat: null, lng: null };
    return {
        lat: Math.round(location.lat * 100) / 100,
        lng: Math.round(location.lng * 100) / 100
    };
}

/** Yorumlardan özet puanlar: süreç + nokta memnuniyeti ortalaması */
function ratingSummary(reviews = []) {
    if (!reviews.length) return { average: null, processAverage: null, locationAverage: null, count: 0 };
    const sum = (field) => reviews.reduce((t, r) => t + (Number(r[field]) || 0), 0);
    const processAverage = Math.round((sum('processRating') / reviews.length) * 10) / 10;
    const locationAverage = Math.round((sum('locationRating') / reviews.length) * 10) / 10;
    return {
        average: Math.round(((processAverage + locationAverage) / 2) * 10) / 10,
        processAverage,
        locationAverage,
        count: reviews.length
    };
}

function toPublic(point) {
    const { reviews, services, location, ...rest } = point;
    const servicePrices = (services || []).map(s => (s.price ?? s.defaultPrice) || 0).filter(v => v > 0);
    return {
        ...rest,
        name: ANONYMOUS_NAME,
        location: fuzzLocation(location),
        services: (services || []).map(s => ({
            productKey: s.productKey || '',
            sku: s.sku || '',
            name: s.name,
            price: (s.price ?? s.defaultPrice) || 0
        })),
        startingPrice: servicePrices.length ? Math.min(...servicePrices) : null,
        rating: ratingSummary(reviews),
        // Yorumlar en yeniden eskiye; üye adı ve tarih dışında kişisel veri yok
        reviews: (reviews || [])
            .slice()
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .map(r => ({
                memberName: r.memberName || 'sistem',
                comment: r.comment || '',
                processRating: r.processRating,
                locationRating: r.locationRating,
                createdAt: r.createdAt
            }))
    };
}

// GET /api/montage-points — liste (+ il/ilçe filtresi ve filtre seçenekleri)
router.get('/', async (req, res) => {
    try {
        const { city, district } = req.query;
        const filter = { site: req.site, isActive: true };
        if (city) filter.city = city;
        if (district) filter.district = district;

        const [points, all] = await Promise.all([
            WebMontagePoint.find(filter, PUBLIC_FIELDS).sort({ order: 1, name: 1 }).lean(),
            WebMontagePoint.find({ site: req.site, isActive: true }, { city: 1, district: 1 }).lean()
        ]);

        // Filtre seçenekleri: il → ilçeler (aktif noktalardan türetilir)
        const cityMap = new Map();
        for (const p of all) {
            if (!p.city) continue;
            if (!cityMap.has(p.city)) cityMap.set(p.city, new Set());
            if (p.district) cityMap.get(p.city).add(p.district);
        }
        const cities = [...cityMap.entries()]
            .map(([name, districts]) => ({ city: name, districts: [...districts].sort((a, b) => a.localeCompare(b, 'tr')) }))
            .sort((a, b) => a.city.localeCompare(b.city, 'tr'));

        res.json({ success: true, data: points.map(toPublic), meta: { total: points.length, cities } });
    } catch (error) {
        console.error('Montaj noktaları listelenemedi:', error);
        res.status(500).json({ success: false, message: 'Montaj noktaları alınamadı' });
    }
});

// GET /api/montage-points/:id — detay
router.get('/:id', async (req, res) => {
    try {
        if (!String(req.params.id).match(/^[a-f0-9]{24}$/i)) {
            return res.status(400).json({ success: false, message: 'Geçersiz montaj noktası' });
        }
        const point = await WebMontagePoint.findOne(
            { _id: req.params.id, site: req.site, isActive: true },
            PUBLIC_FIELDS
        ).lean();
        if (!point) return res.status(404).json({ success: false, message: 'Montaj noktası bulunamadı' });
        res.json({ success: true, data: toPublic(point) });
    } catch (error) {
        console.error('Montaj noktası alınamadı:', error);
        res.status(500).json({ success: false, message: 'Montaj noktası alınamadı' });
    }
});

module.exports = router;
