// Depo bazlı stok filtresi — b2b kategori/vitrin süzmesinde kullanılır.
// Verilen stok kodlarından, seçilen depoda (vitrinDepolari) stoğu > 0 olanları
// döner. Depo stoğu canlı DIA'dan (getDepotStockBatch) çekilir; kod bazında kısa
// süreli önbellekle sayfa geçişlerinde tekrar DIA'ya gidilmez.
const DiaSettings = require('../../../models/plugins/dia/DiaSettings');
const { DiaOrderService } = require('./DiaOrderService');

const TTL_MS = 5 * 60 * 1000; // 5 dk — depo-stok endpoint'iyle aynı tazelik
const CHUNK = 200; // DIA IN filtresi başına kod adedi
const cache = new Map(); // anahtar: `${depoKey}:${code}` → { at, adet }

/** b2b vitrin depoları: [{ ad, key }]. Ayar yoksa boş dizi. */
async function getDepotList(site) {
    const settings = await DiaSettings.getSettings(site);
    return Array.isArray(settings?.vitrinDepolari) ? settings.vitrinDepolari : [];
}

/**
 * codes içinden, depoAd (vitrinDepolari.ad) deposunda stoğu > 0 olan kodların
 * Set'ini döner. Depo bulunamazsa null döner (çağıran depo filtresini yok sayar).
 */
async function filterCodesByDepot(site, depoAd, codes) {
    const list = await getDepotList(site);
    const depo = list.find(d => d.ad === depoAd || d.key === depoAd);
    if (!depo) return null;

    const benzersiz = [...new Set((codes || []).map(String).filter(Boolean))];
    if (benzersiz.length === 0) return new Set();

    const simdi = Date.now();
    const eksik = [];
    const adetMap = new Map(); // code → adet

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

        // Chunk'lar paralel — sıralı çalışınca kod sayısı arttıkça (6+ çağrı) çok
        // yavaşlıyordu; paralel çağrıda toplam süre tek çağrı gecikmesine yaklaşır.
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
