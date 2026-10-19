const express = require('express');
const router = express.Router();
const WebMontagePoint = require('../../../models/web/content/WebMontagePoint');
const { resolveMontageServicePrice, musteriNetFiyati, getKomisyonOranlari, KDV_ORANI } = require('../../../utils/montagePricing');
const { isMontageServiceName, parseRimRange } = require('../../../services/web/cart/CartRulesService');
const WebProduct = require('../../../models/web/catalog/WebProduct');
const { getFiyatAyarlari, fiyatAyariUygula } = require('../../../utils/categoryPriceDisplay');

const PUBLIC_FIELDS = {
    documents: 0,
    __v: 0
};

const ANONYMOUS_NAME = 'Anlaşmalı Nokta';

async function loadServiceVatSettings(points, site) {
    const keys = [...new Set(
        points.flatMap(p => (p.services || []).map(sv => String(sv.productKey || '')).filter(Boolean))
    )];
    const map = new Map();
    if (!keys.length) return map;

    const [products, ayarlar] = await Promise.all([
        WebProduct.find({ _key: { $in: keys } }, { _key: 1, 'diaData.m_kategoriler': 1 }).lean(),
        getFiyatAyarlari(site)
    ]);
    for (const product of products) {
        const urun = { diaData: product.diaData };
        fiyatAyariUygula(urun, ayarlar);
        map.set(String(product._key), {
            priceDisplay: urun.priceDisplay === 'haric' ? 'haric' : 'dahil',
            vatRate: Number(urun.vatRate) > 0 ? Number(urun.vatRate) : 20
        });
    }
    return map;
}

function fuzzLocation(location) {
    if (!location || location.lat === null || location.lng === null) return { lat: null, lng: null };
    return {
        lat: Math.round(location.lat * 100) / 100,
        lng: Math.round(location.lng * 100) / 100
    };
}

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

function toPublic(point, vatSettings = new Map(), oranlar = null) {
    const { reviews, services, location, name, address, phone, image, showPublicInfo, ...rest } = point;
    const isPublicInfo = showPublicInfo === true;
    const publicServices = (services || []).map(s => {
        const vat = vatSettings.get(String(s.productKey || '')) || { priceDisplay: 'dahil', vatRate: 20 };
        return {
            productKey: s.productKey || '',
            sku: s.sku || '',
            name: s.name,
            price: musteriNetFiyati(s, point, oranlar),
            kdvDahilFiyat: resolveMontageServicePrice(s, point, oranlar),
            priceDisplay: oranlar?.kdvEkle ? 'haric' : 'dahil',
            vatRate: KDV_ORANI,
            isMontage: isMontageServiceName(s.name),
            rimRange: isMontageServiceName(s.name) ? parseRimRange(s.name) : null
        };
    });
    const servicePrices = publicServices.map(s => s.price).filter(v => v !== null && v > 0);
    const montageServices = publicServices.filter(s => s.isMontage && s.price !== null);
    const rangedMontage = montageServices.filter(s => s.rimRange).sort((a, b) => a.rimRange.min - b.rimRange.min);
    const montageService = rangedMontage[0]
        || montageServices.slice().sort((a, b) => a.price - b.price)[0]
        || null;
    return {
        ...rest,
        isPublicInfo,
        name: isPublicInfo ? name : ANONYMOUS_NAME,
        address: isPublicInfo ? (address || '') : '',
        phone: isPublicInfo ? (phone || '') : '',
        image: isPublicInfo ? (image || '') : '',
        location: isPublicInfo ? { lat: location?.lat ?? null, lng: location?.lng ?? null } : fuzzLocation(location),
        services: publicServices,
        startingPrice: servicePrices.length ? Math.min(...servicePrices) : null,
        montageStartingPrice: montageService ? montageService.price : null,
        montageStartingPriceDisplay: montageService ? montageService.priceDisplay : 'dahil',
        montageStartingVatRate: montageService ? montageService.vatRate : 20,
        rating: ratingSummary(reviews),
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

        const cityMap = new Map();
        for (const p of all) {
            if (!p.city) continue;
            if (!cityMap.has(p.city)) cityMap.set(p.city, new Set());
            if (p.district) cityMap.get(p.city).add(p.district);
        }
        const cities = [...cityMap.entries()]
            .map(([name, districts]) => ({ city: name, districts: [...districts].sort((a, b) => a.localeCompare(b, 'tr')) }))
            .sort((a, b) => a.city.localeCompare(b.city, 'tr'));

        const [vatSettings, oranlar] = await Promise.all([loadServiceVatSettings(points, req.site), getKomisyonOranlari(req.site)]);
        res.json({ success: true, data: points.map(p => toPublic(p, vatSettings, oranlar)), meta: { total: points.length, cities } });
    } catch (error) {
        console.error('Montaj noktaları listelenemedi:', error);
        res.status(500).json({ success: false, message: 'Montaj noktaları alınamadı' });
    }
});

router.get('/branches', async (req, res) => {
    try {
        const points = await WebMontagePoint.find(
            { site: req.site, isActive: true, showPublicInfo: true },
            { name: 1, city: 1, district: 1 }
        ).sort({ order: 1, name: 1 }).lean();
        res.json({ success: true, data: points });
    } catch (error) {
        console.error('Montaj şubeleri listelenemedi:', error);
        res.status(500).json({ success: false, message: 'Montaj şubeleri alınamadı' });
    }
});

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
        const [vatSettings, oranlar] = await Promise.all([loadServiceVatSettings([point], req.site), getKomisyonOranlari(req.site)]);
        res.json({ success: true, data: toPublic(point, vatSettings, oranlar) });
    } catch (error) {
        console.error('Montaj noktası alınamadı:', error);
        res.status(500).json({ success: false, message: 'Montaj noktası alınamadı' });
    }
});

module.exports = router;
