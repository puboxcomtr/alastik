/**
 * b2b ödeme yöntemi iskontoları — DIA kampanyalarından türetilir.
 *
 * DIA'da iskontolar, carinin segmentine (özelkod2, ör. F4) × markaya × ödeme
 * yöntemine göre kampanyalarda tanımlıdır (scf_kampanya). İskonto oranı kampanya
 * ADININ içindedir (ör. "Toptan F4 - HANKOOK LF | Nakit(Anında) %7").
 *
 * Bu servis, bir segment için b2b'de aktif (b2b="E") kampanyaları çekip
 * marka × ödeme yöntemi × iskonto haritasına çevirir. Sepet, her ürünün
 * markasına göre satır bazında iskontoyu bu haritadan uygular.
 *
 * NOT: "Gel Al" kampanyaları şimdilik hariç tutulur (yalnız normal iskontolar).
 */

const { DiaOrderService } = require('./DiaOrderService');
const { getCreditCardOptions } = require('../payment/creditCardOptions');

// Ödeme yöntemleri (sepette gösterim sırası). id = sepet/işlem anahtarı.
const PAYMENT_METHODS = [
    { id: 'cari', title: 'Cari Sipariş' },
    { id: 'havale', title: 'Havale ile Ödeme' },
    { id: 'kkTek', title: 'Kredi Kartı — Tek Çekim (Anında)' },
    { id: 'kkTaksit', title: 'Kredi Kartı — Taksitli (Anında)' },
];

const CACHE = new Map(); // `${site}:${segment}` -> { at, data }
const TTL_MS = 10 * 60 * 1000;

/** Kampanya adının ödeme-yöntemi kısmından yöntem anahtarını çıkarır. */
function methodOf(text) {
    if (/gel[\s-]*al/i.test(text)) return null; // Gel Al şimdilik hariç
    if (/nakit|havale/i.test(text)) return 'havale';
    if (/tek\s*[çc]ekim/i.test(text)) return 'kkTek';
    if (/taksit/i.test(text)) return 'kkTaksit';
    if (/cari/i.test(text)) return 'cari';
    return null;
}

/**
 * Kampanya adından "grup anahtarı"nı çıkarır. Ürün → kampanya eşleşmesi bu
 * anahtar üzerinden yapılır:
 *   "Toptan F4 - HANKOOK LF"                → HANKOOK   (marka)
 *   "Pirelli F4 Grubu Kampanyası"           → PIRELLI   (marka)
 *   "Toptan F4 - İKİNCİ EL JANT LJA"        → JANT_2EL  (kategori)
 *   "Toptan F4 - JANT LJA"                  → JANT      (kategori: jant)
 *   "Sabit Fiyatlı Ürünler F4"              → SABIT     (kategori)
 *   "İkinci El F4" / "İkinci el Cari F4"    → IKINCIEL  (kategori: 2.el)
 *   "Kendi Stoklarımızdaki Diğer Markalar"  → *         (varsayılan)
 */
function brandOf(aciklama) {
    const a = String(aciklama || '');
    if (/di[ğg]er markalar/i.test(a)) return '*';
    if (/jant/i.test(a)) return /[iİ]kinci\s*el/i.test(a) ? 'JANT_2EL' : 'JANT';
    if (/sabit fiyatl/i.test(a)) return 'SABIT';
    if (/[iİ]kinci\s*el/i.test(a)) return 'IKINCIEL';
    // "<Marka> F<n> Grubu" (ör. Pirelli F4 Grubu)
    const grup = a.match(/^\s*([A-Za-zÇĞİÖŞÜçğıöşü]+)\s+F\d+\s+Grubu/i);
    if (grup) return normBrand(grup[1]);
    // "... - <MARKA> LF"  (ör. Toptan F4 - HANKOOK LF)
    const m = a.match(/-\s*([A-Za-zÇĞİÖŞÜçğıöşü0-9]+(?:\s+[A-Za-zÇĞİÖŞÜçğıöşü0-9]+)?)\s+LF\b/i);
    return m ? normBrand(m[1]) : null;
}

function firstPct(text) {
    const m = text.match(/%\s*(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
}

/**
 * Marka adını harita anahtarına normalize eder. Türkçe diyakritikleri ASCII'ye
 * katlar (İ/ı/i → I, Ş → S, …) ki "Pirelli" ↔ "PİRELLİ", "Milestone" ↔
 * "MİLESTONE" gibi büyük/küçük harf tuzakları eşleşmeyi bozmasın.
 */
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
    const brandMap = {}; // brand -> { method: pct }
    for (const p of campaigns) {
        const aciklama = String(p.aciklama || '');
        const parts = aciklama.split('|');
        const tail = parts.slice(1).join('|'); // ödeme yöntemi kısmı
        if (/gel[\s-]*al/i.test(tail)) continue; // yalnız normal
        const brand = brandOf(aciklama);
        const method = methodOf(tail);
        if (!brand || !method) continue;
        const pct = method === 'cari' ? 0 : firstPct(tail);
        brandMap[brand] = brandMap[brand] || {};
        if (brandMap[brand][method] == null) brandMap[brand][method] = pct;
    }
    return brandMap;
}

/**
 * "Gel Al" teslimatının ek iskonto artışını DIA sabit Gel-Al kampanyalarından
 * dinamik çıkarır. Kampanya adındaki SON yüzde Gel-Al artışıdır:
 *   "…| -Cari+Gel-Al %1"                 → 1
 *   "…| -Nakit(Anında)+ Gel-Al %7+%1"    → 1  (son %)
 * Bulunamazsa 0 (Gel-Al farkı yok). Hardcode yok — DIA değişirse yansır.
 */
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

/** Her ödeme yöntemi için en sık görülen iskonto (kart başlığında gösterim). */
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

/**
 * Segment için ödeme yöntemleri + marka iskonto haritasını döner.
 * { segment, methods:[{id,title,discountPct}], brandMap, defaultDiscounts }
 */
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
        // Tüm ürünler SABİT fiyatlama tipinde ve sabit kampanya marka ayrımı yapmadan
        // hepsini kapsıyor. Markası haritada olmayan ürünler de SABİT oranını (havale
        // %7, KK tek %5, taksit %3) alsın diye varsayılan iskonto = SABİT oranları.
        // (marka=* "Diğer Markalar" kampanyası varsa taban, SABİT onun üstüne biner.)
        data = {
            segment: normBrand(segment),
            methods,
            brandMap,
            defaultDiscounts: { ...(brandMap['*'] || {}), ...(brandMap['SABIT'] || {}) },
            // "Gel Al" teslimatının ek iskontosu (DIA sabit Gel-Al kampanyalarından)
            gelAlBonus: extractGelAlBonus(campaigns)
        };
        CACHE.set(key, { at: Date.now(), data });
    }

    // Kredi kartı seçenekleri (panelden aç/kapa): kapalı olan kkTek/kkTaksit süzülür.
    const cardOpts = await getCreditCardOptions(site);
    const methodsFiltered = data.methods.filter(m =>
        (m.id !== 'kkTek' || cardOpts.tekCekim) &&
        (m.id !== 'kkTaksit' || cardOpts.taksit)
    );
    return { ...data, methods: methodsFiltered };
}

/** Bir ürünün, seçilen ödeme yöntemine göre iskonto yüzdesi (marka bazlı). */
function discountFor(pricing, brandName, methodId) {
    if (!pricing || !methodId) return 0;
    const b = normBrand(brandName);
    const bm = pricing.brandMap[b];
    if (bm && bm[methodId] != null) return bm[methodId];
    if (pricing.defaultDiscounts[methodId] != null) return pricing.defaultDiscounts[methodId];
    return 0;
}

const cariRateCache = new Map();

/**
 * Segment için "Sabit Fiyatlı Ürünler <segment> | Cari" kampanyasının fiyat
 * kartındaki oranı döner: { tanimlifiyat, fiyatyuzde, artieksi }. Cari satış
 * fiyatı = fiyat<tanimlifiyat> × (fiyatyuzde/100) (artieksi '-' ise indirim).
 * DIA'da oran değişirse (ör. 50→52) buradan otomatik yansır — hardcode yok.
 */
async function getSabitCariRate(site, segment) {
    const key = `${site}:${normBrand(segment)}`;
    const cached = cariRateCache.get(key);
    if (cached && Date.now() - cached.at < TTL_MS) return cached.data;

    // Güvenli varsayılan (kampanya bulunamazsa fiyat1 × %50)
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
        // varsayılana düşülür
    }
    cariRateCache.set(key, { at: Date.now(), data });
    return data;
}

module.exports = { getB2bPaymentPricing, getSabitCariRate, discountFor, PAYMENT_METHODS };
