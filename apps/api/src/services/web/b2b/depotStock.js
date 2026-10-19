const DiaSettings = require('../../../models/plugins/dia/DiaSettings');

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CODES = 120;
const cache = new Map();

const parseCodes = value => String(value || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, MAX_CODES);

async function getDepotStocks(site, codes) {
    if (!codes.length) return {};
    const settings = await DiaSettings.getSettings(site);
    const depots = Array.isArray(settings.vitrinDepolari) ? settings.vitrinDepolari : [];
    if (depots.length === 0) return {};

    const result = {};
    const missing = [];
    for (const code of codes) {
        const cached = cache.get(code);
        if (cached && Date.now() - cached.at < CACHE_TTL_MS) result[code] = cached.data;
        else missing.push(code);
    }

    if (missing.length > 0) {
        const { DiaOrderService } = require('../../plugins/dia/DiaOrderService');
        const svc = new DiaOrderService(site);
        svc.settings = settings;
        svc.firmaKodu = settings.firmaKodu || 1;
        svc.donemKodu = settings.donemKodu || 1;
        await svc.login();

        const depotMaps = [];
        for (const depot of depots) {
            const map = await svc.getDepotStockBatch(missing, depot.key).catch(() => ({}));
            depotMaps.push({ ad: depot.ad, map });
        }
        for (const code of missing) {
            const rows = depotMaps.map(dm => ({ ad: dm.ad, adet: Math.max(0, Math.floor(dm.map[code] || 0)) }));
            cache.set(code, { at: Date.now(), data: rows });
            result[code] = rows;
        }
    }
    return result;
}

module.exports = { parseCodes, getDepotStocks };
