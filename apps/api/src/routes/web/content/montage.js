// Vitrin: Montaj Noktaları (site bazlı, yalnız aktif kayıtlar)
// DİKKAT: documents (bayi sözleşmeleri) İÇ EVRAKTIR, hiçbir uçtan dışarı verilmez.
const express = require('express');
const router = express.Router();
const WebMontagePoint = require('../../../models/web/content/WebMontagePoint');
const { resolveMontageServicePrice } = require('../../../utils/montagePricing');
const { isMontageServiceName, parseRimRange } = require('../../../services/web/cart/CartRulesService');
const WebProduct = require('../../../models/web/catalog/WebProduct');
const { getFiyatAyarlari, fiyatAyariUygula } = require('../../../utils/categoryPriceDisplay');

// Satın alma öncesi noktalar varsayılan olarak ANONİMDİR: ad, adres, telefon, görsel ve hassas konum
// dışarı verilmez (müşteri hizmeti satın alınca sipariş tarafında açılır). Panelde "Bilgileri Gözüksün"
// (showPublicInfo) açılan noktalarda bu bilgiler vitrinde gösterilir. documents bayi sözleşmesidir, HER ZAMAN gizli.
const PUBLIC_FIELDS = {
    documents: 0,
    __v: 0
};

const ANONYMOUS_NAME = 'Anlaşmalı Nokta';

/**
 * Hizmet ürünlerinin KDV gösterim ayarı: productKey → { priceDisplay, vatRate }.
 * Kategori ayarı 'haric' olan hizmetlerde vitrin fiyatı KDV hariç gösterilir; sepette
 * kullanılan kuralın (categoryPriceDisplay) AYNISI uygulanır ki iki ekran aynı tutarı yazsın.
 */
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

function toPublic(point, vatSettings = new Map()) {
    const { reviews, services, location, name, address, phone, image, showPublicInfo, ...rest } = point;
    const isPublicInfo = showPublicInfo === true;
    // Noktaya özel fiyat (0 = ücretsiz) > katalog fiyatı > null (Sorunuz)
    const publicServices = (services || []).map(s => {
        const vat = vatSettings.get(String(s.productKey || '')) || { priceDisplay: 'dahil', vatRate: 20 };
        return {
            productKey: s.productKey || '',
            sku: s.sku || '',
            name: s.name,
            price: resolveMontageServicePrice(s),
            // KDV gösterimi: kategori ayarı 'haric' ise vitrinde "X TL + KDV" yazılır (sepetle aynı)
            priceDisplay: vat.priceDisplay,
            vatRate: vat.vatRate,
            // Sepet kuralları: montaj hizmeti mi, hangi jant çapı aralığını kapsıyor
            isMontage: isMontageServiceName(s.name),
            rimRange: isMontageServiceName(s.name) ? parseRimRange(s.name) : null
        };
    });
    const servicePrices = publicServices.map(s => s.price).filter(v => v !== null && v > 0);
    // Vitrin kartında gösterilen montaj fiyatı: en düşük jant aralığındaki (13"-16") montaj
    // hizmetinin 1 ADET fiyatı. Aralık okunamayan noktalarda montaj hizmetleri içindeki en ucuzu
    // kullanılır. 0 = ücretsiz montaj (vitrinde rozet olarak gösterilir).
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
        // Tüm hizmetlerin en ucuzu (sibop vb. dahil) — kartta KULLANILMAZ, montageStartingPrice kullanılır
        startingPrice: servicePrices.length ? Math.min(...servicePrices) : null,
        montageStartingPrice: montageService ? montageService.price : null,
        // Başlangıç fiyatının KDV gösterimi (kart üzerindeki "…'den başlayan" metni için)
        montageStartingPriceDisplay: montageService ? montageService.priceDisplay : 'dahil',
        montageStartingVatRate: montageService ? montageService.vatRate : 20,
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

        const vatSettings = await loadServiceVatSettings(points, req.site);
        res.json({ success: true, data: points.map(p => toPublic(p, vatSettings)), meta: { total: points.length, cities } });
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
        const vatSettings = await loadServiceVatSettings([point], req.site);
        res.json({ success: true, data: toPublic(point, vatSettings) });
    } catch (error) {
        console.error('Montaj noktası alınamadı:', error);
        res.status(500).json({ success: false, message: 'Montaj noktası alınamadı' });
    }
});

module.exports = router;
