
const { DiaOrderService } = require('./DiaOrderService');
const { getCreditCardOptions } = require('../payment/creditCardOptions');

const PAYMENT_METHODS = [
    { id: 'cari', title: 'Cari Sipariş' },
    { id: 'havale', title: 'Havale ile Ödeme' },
    { id: 'kkTek', title: 'Kredi Kartı — Tek Çekim (Anında)' },
    { id: 'kkTaksit', title: 'Kredi Kartı — Taksitli (Anında)' },
];

const CACHE = new Map();
const TTL_MS = 10 * 60 * 1000;

function methodOf(text) {
    if (/gel[\s-]*al/i.test(text)) return null;
    if (/nakit|havale/i.test(text)) return 'havale';
    if (/tek\s*[çc]ekim/i.test(text)) return 'kkTek';
    if (/taksit/i.test(text)) return 'kkTaksit';
    if (/cari/i.test(text)) return 'cari';
    return null;
}

function brandOf(aciklama) {
    const a = String(aciklama || '');
    if (/di[ğg]er markalar/i.test(a)) return '*';
    if (/jant/i.test(a)) return /[iİ]kinci\s*el/i.test(a) ? 'JANT_2EL' : 'JANT';
    if (/sabit fiyatl/i.test(a)) return 'SABIT';
    if (/[iİ]kinci\s*el/i.test(a)) return 'IKINCIEL';
    const grup = a.match(/^\s*([A-Za-zÇĞİÖŞÜçğıöşü]+)\s+F\d+\s+Grubu/i);
    if (grup) return normBrand(grup[1]);
    const m = a.match(/-\s*([A-Za-zÇĞİÖŞÜçğıöşü0-9]+(?:\s+[A-Za-zÇĞİÖŞÜçğıöşü0-9]+)?)\s+LF\b/i);
    return m ? normBrand(m[1]) : null;
}

function firstPct(text) {
    const m = text.match(/%\s*(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
}

function normBrand(name) {
    return String(name || '').trim().toUpperCase()
        .replace(/İ/g, 'I').replace(/Ş/g, 'S').replace(/Ğ/g, 'G')
        .replace(/Ü/g, 'U').replace(/Ö/g, 'O').replace(/Ç/g, 'C');
}

async function fetchSegmentCampaigns(site, segment) {
    const svc = new DiaOrderService(site);
    await svc.init().catch(() => {});
    await svc.login();
    const F = { session_id: svc.sessionId, firma_kodu: svc.firmaKodu, donem_kodu: svc.donemKodu };
    const r = await svc.sendRequest('/api/v3/scf/json', {
        scf_kampanya_listele: { ...F, limit: 2000, offset: 0 }
    });
    const rows = Array.isArray(r?.result) ? r.result : [];
    const seg = normBrand(segment);
    const re = new RegExp(`(^|;)${seg}(;|$)`);
    return rows.filter(p => p.b2b === 'E' && re.test(normBrand(p.ozelkod2cari)));
}

function buildBrandMap(campaigns) {
    const brandMap = {};
    for (const p of campaigns) {
        const aciklama = String(p.aciklama || '');
        const parts = aciklama.split('|');
        const tail = parts.slice(1).join('|');
        if (/gel[\s-]*al/i.test(tail)) continue;
        const brand = brandOf(aciklama);
        const method = methodOf(tail);
        if (!brand || !method) continue;
        const pct = method === 'cari' ? 0 : firstPct(tail);
        brandMap[brand] = brandMap[brand] || {};
        if (brandMap[brand][method] == null) brandMap[brand][method] = pct;
    }
    return brandMap;
}

function extractGelAlBonus(campaigns) {
  for (const p of campaigns) {
    const a = String(p.aciklama || '');
    if (!/sabit fiyatl/i.test(a)) continue;
    const tail = a.split('|').slice(1).join('|');
    if (!/gel[\s-]*al/i.test(tail)) continue;
    const all = tail.match(/%\s*(\d+)/g);
    if (all && all.length) {
      const last = all[all.length - 1].match(/(\d+)/);
      if (last) return parseInt(last[1], 10);
    }
  }
  return 0;
}

function representativeDiscounts(brandMap) {
    const rep = {};
    for (const m of PAYMENT_METHODS.map(x => x.id)) {
        const counts = {};
        for (const b of Object.keys(brandMap)) {
            if (b === '*') continue;
            const v = brandMap[b][m];
            if (v != null) counts[v] = (counts[v] || 0) + 1;
        }
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        rep[m] = sorted.length ? Number(sorted[0][0]) : (brandMap['*']?.[m] ?? 0);
    }
    return rep;
}

async function getB2bPaymentPricing(site, segment) {
    const key = `${site}:${normBrand(segment)}`;
    const cached = CACHE.get(key);
    let data;
    if (cached && Date.now() - cached.at < TTL_MS) {
        data = cached.data;
    } else {
        const campaigns = await fetchSegmentCampaigns(site, segment);
        const brandMap = buildBrandMap(campaigns);
        const rep = representativeDiscounts(brandMap);
        const methods = PAYMENT_METHODS.map(m => ({ ...m, discountPct: rep[m.id] || 0 }));
        data = {
            segment: normBrand(segment),
            methods,
            brandMap,
            defaultDiscounts: { ...(brandMap['*'] || {}), ...(brandMap['SABIT'] || {}) },
            gelAlBonus: extractGelAlBonus(campaigns)
        };
        CACHE.set(key, { at: Date.now(), data });
    }

    const cardOpts = await getCreditCardOptions(site);
    const methodsFiltered = data.methods.filter(m =>
        (m.id !== 'kkTek' || cardOpts.tekCekim) &&
        (m.id !== 'kkTaksit' || cardOpts.taksit)
    );
    return { ...data, methods: methodsFiltered };
}

function discountFor(pricing, brandName, methodId) {
    if (!pricing || !methodId) return 0;
    const b = normBrand(brandName);
    const bm = pricing.brandMap[b];
    if (bm && bm[methodId] != null) return bm[methodId];
    if (pricing.defaultDiscounts[methodId] != null) return pricing.defaultDiscounts[methodId];
    return 0;
}

const cariRateCache = new Map();

async function getSabitCariRate(site, segment) {
    const key = `${site}:${normBrand(segment)}`;
    const cached = cariRateCache.get(key);
    if (cached && Date.now() - cached.at < TTL_MS) return cached.data;

    let data = { tanimlifiyat: 1, fiyatyuzde: 50, artieksi: '-' };
    try {
        const svc = new DiaOrderService(site);
        await svc.init().catch(() => {});
        await svc.login();
        const F = { session_id: svc.sessionId, firma_kodu: svc.firmaKodu, donem_kodu: svc.donemKodu };

        const r = await svc.sendRequest('/api/v3/scf/json', {
            scf_kampanya_listele: { ...F, limit: 2000, offset: 0 }
        });
        const seg = normBrand(segment);
        const re = new RegExp(`(^|;)${seg}(;|$)`);
        const rows = (Array.isArray(r?.result) ? r.result : [])
            .filter(p => p.b2b === 'E' && re.test(normBrand(p.ozelkod2cari)));
        const cariKamp = rows.find(p => {
            const a = String(p.aciklama || '');
            const tail = a.split('|').slice(1).join('|');
            return /sabit fiyatl/i.test(a) && !/gel[\s-]*al/i.test(tail) && methodOf(tail) === 'cari';
        });
        if (cariKamp && cariKamp.kodu) {
            const fr = await svc.sendRequest('/api/v3/scf/json', {
                scf_fiyatkart_listele: { ...F, filters: [{ field: 'scf_kampanya_kodu', operator: '=', value: cariKamp.kodu }], limit: 1, offset: 0 }
            });
            const row = Array.isArray(fr?.result) ? fr.result[0] : null;
            if (row && parseFloat(row.fiyatyuzde) > 0) {
                data = {
                    tanimlifiyat: parseInt(row.tanimlifiyat) || 1,
                    fiyatyuzde: parseFloat(row.fiyatyuzde),
                    artieksi: row.fiyatartieksi || '-'
                };
            }
        }
    } catch (e) {
    }
    cariRateCache.set(key, { at: Date.now(), data });
    return data;
}

module.exports = { getB2bPaymentPricing, getSabitCariRate, discountFor, PAYMENT_METHODS };
