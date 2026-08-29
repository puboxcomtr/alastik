/**
 * Montaj noktasına özel hizmet fiyatı çözümü.
 * Panelde noktaya girilen fiyat (0 = ücretsiz) önceliklidir; yoksa hizmetin katalog fiyatı;
 * ikisi de yoksa null (vitrinde "Sorunuz", sepete eklenemez).
 */
const WebMontagePoint = require('../models/web/content/WebMontagePoint');

const resolveMontageServicePrice = (service) => {
    if (!service) return null;
    if (typeof service.price === 'number' && Number.isFinite(service.price) && service.price >= 0) {
        return service.price;
    }
    return service.defaultPrice > 0 ? service.defaultPrice : null;
};

/**
 * Verilen sepet kalemleri için noktaya özel fiyatları toplu yükler.
 * Dönüş: Map<`${montagePointId}:${productKey}`, number|null>
 */
const loadMontagePrices = async (items, site) => {
    const pointIds = [...new Set(items.map(i => String(i.montagePointId || '')).filter(id => /^[a-f0-9]{24}$/i.test(id)))];
    const prices = new Map();
    if (pointIds.length === 0) return prices;
    const points = await WebMontagePoint.find({ _id: { $in: pointIds }, site }, { services: 1 }).lean();
    const pointMap = new Map(points.map(p => [String(p._id), p]));
    for (const item of items) {
        const pointId = String(item.montagePointId || '');
        const point = pointMap.get(pointId);
        if (!point) continue;
        const service = (point.services || []).find(s => String(s.productKey) === String(item.productKey));
        prices.set(`${pointId}:${item.productKey}`, resolveMontageServicePrice(service));
    }
    return prices;
};

module.exports = { resolveMontageServicePrice, loadMontagePrices };
