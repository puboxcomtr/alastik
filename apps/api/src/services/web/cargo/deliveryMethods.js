/**
 * Teslimat yöntemleri — sitenin aktif kargo tanımlarından (Kargo Firmaları) teslimat adresine göre sunulanlar.
 *
 * Tanımın hizmet bölgesi (serviceAreas) boşsa her adreste sunulur; doluysa yalnız o il / ilçelerde
 * (ör. b2b "Standart Sevkiyat": İstanbul'un tamamı + Kocaeli / İzmit). Sıra: öncelik (webOrder) büyükten küçüğe.
 */
const Cargo = require('../../../models/admin/settings/Cargo');

const FREE_PRICING_TYPE = 'free';

/** İl / ilçe adını karşılaştırma için sadeleştirir ("İSTANBUL", "İstanbul", "istanbul" → "ISTANBUL") */
function normalizeLocationName(value) {
    return String(value || '')
        .toLocaleUpperCase('tr-TR')
        .replace(/İ/g, 'I').replace(/Ş/g, 'S').replace(/Ğ/g, 'G').replace(/Ü/g, 'U').replace(/Ö/g, 'O').replace(/Ç/g, 'C')
        .replace(/[^A-Z0-9]/g, '');
}

/** Adres (il + ilçe) tanımın hizmet bölgesinde mi? Bölge tanımlı değilse her adres kapsamdadır. */
function isInServiceArea(serviceAreas, { city, district } = {}) {
    const areas = serviceAreas || [];
    if (areas.length === 0) return true;
    const cityKey = normalizeLocationName(city);
    if (!cityKey) return false;
    const districtKey = normalizeLocationName(district);
    return areas.some(area => {
        if (normalizeLocationName(area.cityName) !== cityKey) return false;
        // İlçe seçilmemiş bölge ilin tamamını kapsar
        return !area.districtName || normalizeLocationName(area.districtName) === districtKey;
    });
}

/**
 * @param {string} site
 * @param {{ city?: string, district?: string }} location teslimat adresinin ili / ilçesi
 * @returns {Promise<Array<{ id: string, title: string, free: boolean }>>} id = kargo tanımının kodu
 */
async function getDeliveryMethods(site, location = {}) {
    const cargos = await Cargo.find({ site, isActive: true }).sort({ webOrder: -1, createdAt: 1 })
        .select('name code pricingType serviceAreas').lean();
    return cargos
        .filter(cargo => isInServiceArea(cargo.serviceAreas, location))
        .map(cargo => ({ id: cargo.code, title: cargo.name, free: cargo.pricingType === FREE_PRICING_TYPE }));
}

module.exports = { normalizeLocationName, isInServiceArea, getDeliveryMethods };
