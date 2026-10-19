const Cargo = require('../../../models/admin/settings/Cargo');

const FREE_PRICING_TYPE = 'free';

function normalizeLocationName(value) {
    return String(value || '')
        .toLocaleUpperCase('tr-TR')
        .replace(/İ/g, 'I').replace(/Ş/g, 'S').replace(/Ğ/g, 'G').replace(/Ü/g, 'U').replace(/Ö/g, 'O').replace(/Ç/g, 'C')
        .replace(/[^A-Z0-9]/g, '');
}

function isInServiceArea(serviceAreas, { city, district } = {}) {
    const areas = serviceAreas || [];
    if (areas.length === 0) return true;
    const cityKey = normalizeLocationName(city);
    if (!cityKey) return false;
    const districtKey = normalizeLocationName(district);
    return areas.some(area => {
        if (normalizeLocationName(area.cityName) !== cityKey) return false;
        return !area.districtName || normalizeLocationName(area.districtName) === districtKey;
    });
}

async function getDeliveryMethods(site, location = {}) {
    const cargos = await Cargo.find({ site, isActive: true }).sort({ webOrder: -1, createdAt: 1 })
        .select('name code pricingType serviceAreas').lean();
    const available = cargos
        .filter(cargo => isInServiceArea(cargo.serviceAreas, location))
        .map(cargo => ({ id: cargo.code, title: cargo.name, free: cargo.pricingType === FREE_PRICING_TYPE }));
    const free = available.filter(method => method.free);
    return free.length ? free : available;
}

module.exports = { normalizeLocationName, isInServiceArea, getDeliveryMethods };
