/**
 * Montaj noktasına özel hizmet fiyatı çözümü.
 * Panelde noktaya girilen fiyat (0 = ücretsiz) önceliklidir; yoksa hizmetin katalog fiyatı;
 * ikisi de yoksa null (vitrinde "Sorunuz", sepete eklenemez).
 *
 * Müşteri fiyatı:
 *   vitrin = girilen fiyat × (1 + komisyon %)   → tam TL'ye yuvarlanır
 *   ödenen = KDV EKLENEN sitelerde vitrin × (1 + KDV %), vitrinde "X TL + KDV" yazar;
 *            diğer sitelerde (şu an hepsi) girilen fiyat KDV dahil sayılır, ödenen = vitrin.
 * Komisyon (Admin › Montaj Noktaları › Komisyon Oranları, site başına) kendi şubelerimize
 * (showPublicInfo) uygulanmaz; KDV (eklenen sitelerde) her noktada eklenir.
 */
const WebMontagePoint = require('../models/web/content/WebMontagePoint');
const WebMontageCommission = require('../models/web/content/WebMontageCommission');

const KDV_ORANI = 20;
// Montaj hizmeti fiyatı "+ KDV" hesaplanan siteler — şu an YOK: iki sitede de girilen fiyat KDV dahildir
// (15 Ekim 2026 kararı). Bir siteye "+ KDV" gerekirse adını buraya eklemek yeterli.
const KDV_EKLENEN_SITELER = new Set([]);
const kdvEklenirMi = (site) => KDV_EKLENEN_SITELER.has(String(site || ''));
// Değişim ücretleri: lastik montajı (600.201-203), yazlık-kışlık / yerinde değişim (600.106-112), mobil değişim (YMH-*)
const DEGISIM_SKU = /^(600\.(10[6-9]|11[0-2]|20[1-3])|YMH-\d+)$/i;
const ORAN_ONBELLEK_MS = 60 * 1000;
const oranOnbellek = new Map(); // site -> { zaman, oranlar }

const sayi = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : 0);

/** Sitenin komisyon oranları { degisim, diger, kdvEkle } (yüzde; 60 sn önbellekli) */
const getKomisyonOranlari = async (site) => {
    const kayit = oranOnbellek.get(site);
    if (kayit && Date.now() - kayit.zaman < ORAN_ONBELLEK_MS) return kayit.oranlar;
    const doc = await WebMontageCommission.findOne({ site }).lean().catch(() => null);
    const oranlar = { degisim: sayi(doc?.degisim), diger: sayi(doc?.diger), kdvEkle: kdvEklenirMi(site) };
    oranOnbellek.set(site, { zaman: Date.now(), oranlar });
    return oranlar;
};

const komisyonOnbellekTemizle = (site) => (site ? oranOnbellek.delete(site) : oranOnbellek.clear());

/** Hizmetin oran grubu: 'degisim' | 'diger' */
const komisyonGrubu = (service) => (DEGISIM_SKU.test(String(service?.sku || '').trim()) ? 'degisim' : 'diger');

/** Noktaya girilen (komisyonsuz, KDV hariç) fiyat */
const bayiFiyati = (service) => {
    if (!service) return null;
    if (typeof service.price === 'number' && Number.isFinite(service.price) && service.price >= 0) {
        return service.price;
    }
    return service.defaultPrice > 0 ? service.defaultPrice : null;
};

/** Müşterinin vitrinde gördüğü fiyat (komisyon eklenmiş, tam TL; KDV eklenen sitelerde "+ KDV" ile yazılır) */
const musteriNetFiyati = (service, point = null, oranlar = null) => {
    const fiyat = bayiFiyati(service);
    if (fiyat === null || fiyat === 0) return fiyat;
    const oran = oranlar && !point?.showPublicInfo ? sayi(oranlar[komisyonGrubu(service)]) : 0;
    return oran > 0 ? Math.round(fiyat * (1 + oran / 100)) : fiyat;
};

/** Müşterinin ödediği birim fiyat (KDV dahil) — sepet ve sipariş bunu kullanır */
const resolveMontageServicePrice = (service, point = null, oranlar = null) => {
    const net = musteriNetFiyati(service, point, oranlar);
    if (net === null || net === 0 || !oranlar?.kdvEkle) return net;
    return Math.round(net * (1 + KDV_ORANI / 100) * 100) / 100;
};

/**
 * Verilen sepet kalemleri için noktaya özel fiyatları (KDV dahil, komisyonlu) toplu yükler.
 * Dönüş: Map<`${montagePointId}:${productKey}`, number|null>
 */
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
