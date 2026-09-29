/**
 * Kredi kartı ödeme seçenekleri (site bazlı): Tek Çekim / Taksitli aktif mi.
 *
 * Kaynak: credit_card PaymentMethod'ların detayındaki bayraklar
 * (creditCardSettings.tekCekimAktif / .taksitAktif). Her sitede rol başına
 * (tek çekim / taksit) en fazla 1 yöntem işaretli olur; aktif + işaretli yöntem
 * varsa o seçenek açık sayılır. 30 sn cache.
 */
const PaymentMethod = require('../../../models/admin/order/PaymentMethod');

const cache = new Map();
const TTL_MS = 30 * 1000;

async function getCreditCardOptions(site) {
    const c = cache.get(site);
    if (c && Date.now() - c.at < TTL_MS) return c.data;
    let data = { tekCekim: false, taksit: false };
    try {
        const methods = await PaymentMethod.find({
            site, type: 'credit_card', isActive: true, isDeleted: { $ne: true }
        }).select('creditCardSettings.tekCekimAktif creditCardSettings.taksitAktif').lean();
        data = {
            tekCekim: methods.some(m => m.creditCardSettings?.tekCekimAktif === true),
            taksit: methods.some(m => m.creditCardSettings?.taksitAktif === true)
        };
    } catch (_) { /* hata: ikisi de kapalı sayılır */ }
    cache.set(site, { at: Date.now(), data });
    return data;
}

/** Bir yöntem güncellendiğinde ilgili sitenin cache'ini düşür. */
function invalidate(site) {
    if (site) cache.delete(site);
}

module.exports = { getCreditCardOptions, invalidate };
