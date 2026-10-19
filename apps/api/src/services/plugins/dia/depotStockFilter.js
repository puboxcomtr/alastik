const DiaSettings = require('../../../models/plugins/dia/DiaSettings');
const { DiaOrderService } = require('./DiaOrderService');

const TTL_MS = 5 * 60 * 1000;
const CHUNK = 200;
const cache = new Map();

async function getDepotList(site) {
    const settings = await DiaSettings.getSettings(site);
    return Array.isArray(settings?.vitrinDepolari) ? settings.vitrinDepolari : [];
}

async function filterCodesByDepot(site, depoAd, codes) {
    const list = await getDepotList(site);
    const depo = list.find(d => d.ad === depoAd || d.key === depoAd);
    if (!depo) return null;

    const benzersiz = [...new Set((codes || []).map(String).filter(Boolean))];
    if (benzersiz.length === 0) return new Set();

    const simdi = Date.now();
    const eksik = [];
    const adetMap = new Map();

    for (const kod of benzersiz) {
        const c = cache.get(`${depo.key}:${kod}`);
        if (c && simdi - c.at < TTL_MS) adetMap.set(kod, c.adet);
        else eksik.push(kod);
    }

    if (eksik.length > 0) {
        const settings = await DiaSettings.getSettings(site);
        const svc = new DiaOrderService(site);
        svc.settings = settings;
        svc.firmaKodu = settings.firmaKodu || 1;
        svc.donemKodu = settings.donemKodu || 1;
        await svc.login();

        const parcalar = [];
        for (let i = 0; i < eksik.length; i += CHUNK) parcalar.push(eksik.slice(i, i + CHUNK));
        const maps = await Promise.all(
            parcalar.map(parca => svc.getDepotStockBatch(parca, depo.key).catch(() => ({})))
        );
        parcalar.forEach((parca, idx) => {
            const map = maps[idx] || {};
            for (const kod of parca) {
                const adet = Math.max(0, Math.floor(map[kod] || 0));
                cache.set(`${depo.key}:${kod}`, { at: simdi, adet });
                adetMap.set(kod, adet);
            }
        });
    }

    const izinli = new Set();
    for (const [kod, adet] of adetMap) if (adet > 0) izinli.add(kod);
    return izinli;
}

module.exports = { getDepotList, filterCodesByDepot };
