const { SITES } = require('../config/sites');

const SITE_KEYS = Object.keys(SITES);
const PER_SITE_FIELDS = ['siteDescriptions', 'siteData'];

const BRAND_SWAPS = {
    lastikjantavm: { name: 'LastikJantAVM', domain: 'lastikjantavm.com', names: /\bALastik\.com\b|\bALastik\b|\bA Lastik\b/g, domains: /\balastik\.com\b/g },
    alastik: { name: 'ALastik', domain: 'alastik.com', names: /\bLastikJantAVM\.com\b|\bLastikJantAVM\b|\bLastikjantavm\b|\bLastik Jant AVM\b/g, domains: /\blastikjantavm\.com\b/gi }
};
function fixSuffix(suffix, site) {
    const s = suffix.toLocaleLowerCase('tr-TR');
    const lja = site === 'lastikjantavm';
    if (/^[dt][ae]n$/.test(s)) return lja ? 'den' : 'ten';
    if (/^[dt][ae]$/.test(s)) return lja ? 'de' : 'te';
    if (/^n?[ıiuü]n$/.test(s)) return 'in';
    if (/^[yn]?[ıiuü]$/.test(s)) return 'i';
    if (/^y?[ae]$/.test(s)) return 'e';
    if (/^l[ae]$/.test(s)) return 'le';
    return suffix;
}
function swapBrand(text, site) {
    const rule = BRAND_SWAPS[site];
    if (!rule || typeof text !== 'string' || !text) return text;
    const withSuffix = (re, repl) => new RegExp(`(?:${re.source})(?:(['’])([a-zçğıöşü]{1,3})\\b)?`, re.flags.includes('g') ? re.flags : `${re.flags}g`);
    return text
        .replace(rule.domains, rule.domain)
        .replace(withSuffix(rule.names), (_, q, suf) => rule.name + (suf ? q + fixSuffix(suf, site) : ''));
}
const TEXT_FIELDS = ['customDescription', 'seoTitle', 'seoDescription', 'shortDescription'];

function scrubOtherSites(doc, site) {
    if (!doc || !site) return doc;
    const cd = doc.customData;
    if (cd && typeof cd === 'object') {
        for (const field of PER_SITE_FIELDS) {
            const map = cd[field];
            if (!map || typeof map !== 'object') continue;
            for (const key of Object.keys(map)) {
                if (key !== site && SITE_KEYS.includes(key)) delete map[key];
            }
        }
        for (const field of TEXT_FIELDS) if (typeof cd[field] === 'string') cd[field] = swapBrand(cd[field], site);
        if (cd.siteDescriptions && typeof cd.siteDescriptions[site] === 'string') cd.siteDescriptions[site] = swapBrand(cd.siteDescriptions[site], site);
        const own = cd.siteData && cd.siteData[site];
        if (own && typeof own === 'object') for (const field of TEXT_FIELDS) if (typeof own[field] === 'string') own[field] = swapBrand(own[field], site);
        if (site !== 'lastikjantavm' && typeof cd.customDescription === 'string') {
            cd.customDescription = cd.customDescription.replace(/\bljavm-(title|list)\b/g, 'pd-$1');
        }
    }
    if (Array.isArray(doc.sites)) delete doc.sites;
    return doc;
}

function scrubOtherSitesMany(docs, site) {
    if (!Array.isArray(docs)) return docs;
    for (const doc of docs) scrubOtherSites(doc, site);
    return docs;
}

function scrubDeep(node, site, depth) {
    if (!node || typeof node !== 'object' || depth > 4) return;
    if (Array.isArray(node)) { for (const item of node) scrubDeep(item, site, depth + 1); return; }
    if (node.customData && (node.diaData || node._key)) { scrubOtherSites(node, site); return; }
    for (const key of Object.keys(node)) {
        const value = node[key];
        if (value && typeof value === 'object') scrubDeep(value, site, depth + 1);
    }
}

function scrubResponseMiddleware(req, res, next) {
    const send = res.json.bind(res);
    res.json = (body) => {
        try {
            if (req.site && body && typeof body === 'object' && body.data) scrubDeep(body.data, req.site, 0);
        } catch (error) {
            console.error('[siteScrub] hata:', error.message);
        }
        return send(body);
    };
    next();
}

module.exports = { scrubOtherSites, scrubOtherSitesMany, scrubResponseMiddleware };
