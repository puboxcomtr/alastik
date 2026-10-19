const WebMontagePoint = require('../models/web/content/WebMontagePoint');
const WebMontageCommission = require('../models/web/content/WebMontageCommission');

const KDV_ORANI = 20;
const KDV_EKLENEN_SITELER = new Set([]);
const kdvEklenirMi = (site) => KDV_EKLENEN_SITELER.has(String(site || ''));
const DEGISIM_SKU = /^(600\.(10[6-9]|11[0-2]|20[1-3])|YMH-\d+)$/i;
const ORAN_ONBELLEK_MS = 60 * 1000;
const oranOnbellek = new Map();

const sayi = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : 0);

const getKomisyonOranlari = async (site) => {
    const kayit = oranOnbellek.get(site);
    if (kayit && Date.now() - kayit.zaman < ORAN_ONBELLEK_MS) return kayit.oranlar;
    const doc = await WebMontageCommission.findOne({ site }).lean().catch(() => null);
    const oranlar = { degisim: sayi(doc?.degisim), diger: sayi(doc?.diger), kdvEkle: kdvEklenirMi(site) };
    oranOnbellek.set(site, { zaman: Date.now(), oranlar });
    return oranlar;
};

const komisyonOnbellekTemizle = (site) => (site ? oranOnbellek.delete(site) : oranOnbellek.clear());

const komisyonGrubu = (service) => (DEGISIM_SKU.test(String(service?.sku || '').trim()) ? 'degisim' : 'diger');

const bayiFiyati = (service) => {
    if (!service) return null;
    if (typeof service.price === 'number' && Number.isFinite(service.price) && service.price >= 0) {
        return service.price;
    }
    return service.defaultPrice > 0 ? service.defaultPrice : null;
};

const musteriNetFiyati = (service, point = null, oranlar = null) => {
    const fiyat = bayiFiyati(service);
    if (fiyat === null || fiyat === 0) return fiyat;
    const oran = oranlar && !point?.showPublicInfo ? sayi(oranlar[komisyonGrubu(service)]) : 0;
    return oran > 0 ? Math.round(fiyat * (1 + oran / 100)) : fiyat;
};

const resolveMontageServicePrice = (service, point = null, oranlar = null) => {
    const net = musteriNetFiyati(service, point, oranlar);
    if (net === null || net === 0 || !oranlar?.kdvEkle) return net;
    return Math.round(net * (1 + KDV_ORANI / 100) * 100) / 100;
};

const loadMontagePrices = async (items, site) => {
    const pointIds = [...new Set(items.map(i => String(i.montagePointId || '')).filter(id => /^[a-f0-9]{24}$/i.test(id)))];
    const prices = new Map();
    if (pointIds.length === 0) return prices;
    const [points, oranlar] = await Promise.all([
        WebMontagePoint.find({ _id: { $in: pointIds }, site }, { services: 1, showPublicInfo: 1 }).lean(),
        getKomisyonOranlari(site)
    ]);
    const pointMap = new Map(points.map(p => [String(p._id), p]));
    for (const item of items) {
        const pointId = String(item.montagePointId || '');
        const point = pointMap.get(pointId);
        if (!point) continue;
        const service = (point.services || []).find(s => String(s.productKey) === String(item.productKey));
        prices.set(`${pointId}:${item.productKey}`, resolveMontageServicePrice(service, point, oranlar));
    }
    return prices;
};

module.exports = {
    KDV_ORANI,
    DEGISIM_SKU,
    kdvEklenirMi,
    getKomisyonOranlari,
    komisyonOnbellekTemizle,
    komisyonGrubu,
    bayiFiyati,
    musteriNetFiyati,
    resolveMontageServicePrice,
    loadMontagePrices
};
