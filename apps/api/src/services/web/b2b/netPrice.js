/**
 * b2b Net Fiyat ürünleri — DIA stok kartının ek alanında (varsayılan ekalan7 / ekalan9) "NetFiyat" yazan ürünler.
 * Bu ürünler yalnız Cari iskontosunu (fiyat1 × cari oranı) alır; ödeme yöntemi iskontoları (havale / kredi kartı)
 * ve marka / finansal iskontolar (panel "Finansal İskontolar") uygulanmaz.
 * Hangi alanlar ve hangi değer: DiaSettings.b2bNetPrice (fields, matchValue).
 */
const DiaSettings = require('../../../models/plugins/dia/DiaSettings');

const CACHE_TTL_MS = 60 * 1000;
const EXTRA_FIELD_PATTERN = /^ekalan\d+$/;
const cache = new Map(); // site -> { at, rule }

// Karşılaştırma için sadeleştirir: boşluksuz küçük harf, I/İ/ı/i tek harf ("NetFiyat", "NET FİYAT" aynı sayılır)
const normalize = v => String(v || '').replace(/\s+/g, '').toLocaleLowerCase('tr-TR').replace(/ı/g, 'i');

/** @returns {Promise<{ fields: string[], matchValue: string } | null>} kural tanımlı değilse null */
async function getNetPriceRule(site) {
    const hit = cache.get(site);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.rule;
    const settings = await DiaSettings.getSettings(site);
    const fields = (settings?.b2bNetPrice?.fields || []).filter(f => EXTRA_FIELD_PATTERN.test(f));
    const matchValue = normalize(settings?.b2bNetPrice?.matchValue);
    const rule = fields.length && matchValue ? { fields, matchValue } : null;
    cache.set(site, { at: Date.now(), rule });
    return rule;
}

/** DiaStock sorgusunda seçilmesi gereken ek alanlar (select metnine eklenir). */
function netPriceSelect(rule) {
    return rule ? rule.fields.join(' ') : '';
}

/** Ürün (DiaStock kaydı) Net Fiyat ürünü mü? */
function isNetPriceStock(stock, rule) {
    if (!rule || !stock) return false;
    return rule.fields.some(f => normalize(stock[f]) === rule.matchValue);
}

module.exports = { getNetPriceRule, netPriceSelect, isNetPriceStock };
