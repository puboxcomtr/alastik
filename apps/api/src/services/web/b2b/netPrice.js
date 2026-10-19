const DiaSettings = require('../../../models/plugins/dia/DiaSettings');

const CACHE_TTL_MS = 60 * 1000;
const EXTRA_FIELD_PATTERN = /^ekalan\d+$/;
const cache = new Map();

const normalize = v => String(v || '').replace(/\s+/g, '').toLocaleLowerCase('tr-TR').replace(/ı/g, 'i');

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

function netPriceSelect(rule) {
    return rule ? rule.fields.join(' ') : '';
}

function isNetPriceStock(stock, rule) {
    if (!rule || !stock) return false;
    return rule.fields.some(f => normalize(stock[f]) === rule.matchValue);
}

module.exports = { getNetPriceRule, netPriceSelect, isNetPriceStock };
