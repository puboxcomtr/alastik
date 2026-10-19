
const PRICE_FIELDS = ['fiyat1', 'fiyat2', 'fiyat3', 'fiyat4', '__dinamik__16'];
const DISCOUNT_MODES = ['none', 'b2c_oran'];
const PRICE_HIDDEN = Symbol('priceHidden');
const { SERVICE_VAT_RULE } = require('../config/diaFilters');
const { DEFAULT_SITE } = require('../config/sites');
const DEFAULT_PRICING = Object.freeze({ priceField: 'fiyat4', discountMode: 'none' });
const CONFIG_TTL_MS = 60 * 1000;
const applyShippingToProduct = (doc, site) => require('../services/web/cargo/ShippingRuleService').applyShippingToProduct(doc, site);

const configBySite = {};
let configLoadedAt = 0;

function round2(value) {
    return Math.round(value * 100) / 100;
}

function normalizeConfig(value) {
    const priceField = PRICE_FIELDS.includes(value?.priceField) ? value.priceField : DEFAULT_PRICING.priceField;
    const discountMode = DISCOUNT_MODES.includes(value?.priceDiscountMode) ? value.priceDiscountMode : DEFAULT_PRICING.discountMode;
    return { priceField, discountMode };
}

async function loadPricingConfig() {
    configLoadedAt = Date.now();
    try {
        const SiteSetting = require('../models/admin/settings/SiteSetting');
        const rows = await SiteSetting.find({ key: 'theme' }, { site: 1, value: 1 }).lean();
        const next = {};
        rows.forEach(r => { next[r.site] = normalizeConfig(r.value); });
        Object.keys(configBySite).forEach(k => delete configBySite[k]);
        Object.assign(configBySite, next);
    } catch (e) {
    }
    return configBySite;
}

function invalidatePricingConfig() {
    configLoadedAt = 0;
}

function getPricingConfig(site) {
    if (Date.now() - configLoadedAt > CONFIG_TTL_MS) loadPricingConfig();
    return configBySite[site] || DEFAULT_PRICING;
}

function isDefaultPricing(cfg) {
    return cfg.priceField === DEFAULT_PRICING.priceField && cfg.discountMode === DEFAULT_PRICING.discountMode;
}

function usesCustomPricing(site) {
    return !isDefaultPricing(getPricingConfig(site));
}

function isServiceProduct(dia) {
    return (dia.m_kategoriler || []).some(k => k && k.kategori_aciklama_1 === SERVICE_VAT_RULE.categoryLevel1);
}

function parseDiscountRate(dia) {
    const m = String(dia.birimindirimorani || '').match(/([0-9]+(?:\.[0-9]+)?)/);
    let oran = m ? parseFloat(m[1]) || 0 : 0;
    if (!oran) oran = parseFloat(dia.b2c_indirimorani) || 0;
    return oran;
}

function resolveSitePrice(doc, site) {
    if (doc?.syncInfo?.syncSource === 'xml_integration') {
        const siteXml = parseFloat(doc?.customData?.siteData?.[site]?.xmlPrice);
        return siteXml > 0 ? round2(siteXml) : null;
    }

    const cfg = getPricingConfig(site);
    if (isDefaultPricing(cfg)) return null;

    const dia = doc?.diaData || doc || {};
    if (isServiceProduct(dia)) return null;
    const birim = (dia.m_birimler || [])[0] || {};

    if (cfg.priceField === '__dinamik__16') {
        const dinamik = parseFloat(birim.fiyat4) || 0;
        const ham = parseFloat(birim.fiyat4Ham) || 0;
        const stored = birim.fiyatDinamik ?? dia.fiyatDinamik;
        const hasDynamic = (stored !== undefined && stored !== null)
            ? dinamik > 0 && parseFloat(stored) > 0
            : dinamik > 0 && !(ham > 0 && Math.abs(dinamik - ham) < 0.01);
        if (!hasDynamic) return PRICE_HIDDEN;
        if (cfg.discountMode === 'b2c_oran') {
            const oran = parseDiscountRate(dia);
            if (oran > 0 && oran < 100) return round2(dinamik * (1 - oran / 100));
        }
        return round2(dinamik);
    }

    const base = parseFloat(birim?.[cfg.priceField]) || 0;
    if (base <= 0) return null;

    if (cfg.discountMode === 'b2c_oran') {
        const oran = parseDiscountRate(dia);
        if (oran > 0 && oran < 100) return round2(base * (1 - oran / 100));
    }
    return round2(base);
}

function resolveXmlShipping(doc, site) {
    if (doc?.syncInfo?.syncSource !== 'xml_integration') return null;
    const src = site === DEFAULT_SITE ? doc?.customData : doc?.customData?.siteData?.[site];
    const included = parseFloat(src?.shippingIncludedPrice) || 0;
    const perUnit = parseFloat(src?.shippingPerUnit) || 0;
    return {
        shippingIncludedPrice: included > 0 ? round2(included) : 0,
        shippingPerUnit: perUnit > 0 ? round2(perUnit) : 0
    };
}

function applySitePricing(doc, site) {
    if (!doc) return doc;
    const price = resolveSitePrice(doc, site);
    if (price === PRICE_HIDDEN) {
        const dia = doc.diaData || doc;
        if (dia.m_birimler && dia.m_birimler[0]) dia.m_birimler[0].fiyat4 = 0;
        if (!doc.diaData && typeof doc.fiyat4 !== 'undefined') doc.fiyat4 = 0;
        doc.customData = doc.customData || {};
        doc.customData.priceHidden = true;
        doc.customData.webPrice = 0;
        return doc;
    }
    if (price !== null) {
        const dia = doc.diaData || doc;
        if (dia.m_birimler && dia.m_birimler[0]) {
            dia.m_birimler[0].fiyat4 = price;
        }
        if (!doc.diaData && typeof doc.fiyat4 !== 'undefined') {
            doc.fiyat4 = price;
        }
    }
    if (doc.syncInfo?.syncSource === 'xml_integration' && site !== DEFAULT_SITE) {
        const ship = resolveXmlShipping(doc, site);
        doc.customData = doc.customData || {};
        doc.customData.shippingIncludedPrice = ship.shippingIncludedPrice;
        doc.customData.shippingPerUnit = ship.shippingPerUnit;
        if (price !== null) doc.customData.webPrice = price;
    }
    if (doc.diaData) applyShippingToProduct(doc, site);
    return doc;
}

function applySitePricingMany(docs, site) {
    if (!Array.isArray(docs)) return docs;
    for (const doc of docs) applySitePricing(doc, site);
    return docs;
}

function salePriceExpr(site) {
    const fiyat4 = { $ifNull: [{ $arrayElemAt: ['$diaData.m_birimler.fiyat4', 0] }, 0] };

    const isXml = { $eq: [{ $ifNull: ['$syncInfo.syncSource', ''] }, 'xml_integration'] };
    const siteXmlPrice = {
        $convert: { input: `$customData.siteData.${site}.xmlPrice`, to: 'double', onError: 0, onNull: 0 }
    };
    const withXmlOverride = (inner) => ({
        $cond: [{ $and: [isXml, { $gt: [siteXmlPrice, 0] }] }, siteXmlPrice, inner]
    });

    const cfg = getPricingConfig(site);
    if (isDefaultPricing(cfg)) return withXmlOverride(fiyat4);

    const exprField = cfg.priceField === '__dinamik__16' ? 'fiyat4' : cfg.priceField;
    const base = { $ifNull: [{ $arrayElemAt: [`$diaData.m_birimler.${exprField}`, 0] }, 0] };

    let priced = '$$base';
    if (cfg.discountMode === 'b2c_oran') {
        const birimOranMatch = {
            $regexFind: {
                input: { $toString: { $ifNull: ['$diaData.birimindirimorani', ''] } },
                regex: '[0-9]+(\\.[0-9]+)?'
            }
        };
        const birimOran = {
            $let: {
                vars: { m: birimOranMatch },
                in: { $cond: [{ $eq: ['$$m', null] }, 0, { $convert: { input: '$$m.match', to: 'double', onError: 0, onNull: 0 } }] }
            }
        };
        const kartOran = { $convert: { input: '$diaData.b2c_indirimorani', to: 'double', onError: 0, onNull: 0 } };
        priced = {
            $let: {
                vars: { oran: { $let: { vars: { bo: birimOran }, in: { $cond: [{ $gt: ['$$bo', 0] }, '$$bo', kartOran] } } } },
                in: {
                    $cond: [
                        { $or: [{ $lte: ['$$oran', 0] }, { $gte: ['$$oran', 100] }] },
                        '$$base',
                        { $round: [{ $multiply: ['$$base', { $subtract: [1, { $divide: ['$$oran', 100] }] }] }, 2] }
                    ]
                }
            }
        };
    }

    const isService = {
        $in: [SERVICE_VAT_RULE.categoryLevel1, { $ifNull: ['$diaData.m_kategoriler.kategori_aciklama_1', []] }]
    };
    return withXmlOverride({
        $cond: [
            { $or: [isService, isXml] },
            fiyat4,
            {
                $let: {
                    vars: { base, f4: fiyat4 },
                    in: { $cond: [{ $lte: ['$$base', 0] }, '$$f4', priced] }
                }
            }
        ]
    });
}

function sortPriceExpr(site) {
    const sale = salePriceExpr(site);
    if (site === DEFAULT_SITE) {
        return {
            $let: {
                vars: {
                    shipPrice: { $ifNull: ['$customData.shippingIncludedPrice', 0] },
                    webPrice: { $ifNull: ['$customData.webPrice', 0] },
                    salePrice: sale
                },
                in: {
                    $cond: [
                        { $gt: ['$$shipPrice', 0] },
                        '$$shipPrice',
                        { $cond: [{ $gt: ['$$webPrice', 0] }, '$$webPrice', '$$salePrice'] }
                    ]
                }
            }
        };
    }
    return {
        $let: {
            vars: {
                shipPrice: {
                    $convert: { input: `$customData.siteData.${site}.shippingIncludedPrice`, to: 'double', onError: 0, onNull: 0 }
                },
                salePrice: sale
            },
            in: { $cond: [{ $gt: ['$$shipPrice', 0] }, '$$shipPrice', '$$salePrice'] }
        }
    };
}

function pricedCondition(site) {
    if (!usesCustomPricing(site)) return { 'diaData.m_birimler.0.fiyat4': { $gt: 0 } };
    return { $expr: { $gt: [salePriceExpr(site), 0] } };
}

function priceRangeCondition(site, fiyatMin, fiyatMax) {
    const min = fiyatMin ? parseFloat(fiyatMin) : null;
    const max = fiyatMax ? parseFloat(fiyatMax) : null;

    if (!usesCustomPricing(site)) {
        const range = {};
        if (min !== null) range.$gte = min;
        if (max !== null) range.$lte = max;
        return { 'diaData.m_birimler': { $elemMatch: { fiyat4: range } } };
    }

    const expr = salePriceExpr(site);
    const parts = [];
    if (min !== null) parts.push({ $gte: [expr, min] });
    if (max !== null) parts.push({ $lte: [expr, max] });
    return { $expr: parts.length === 1 ? parts[0] : { $and: parts } };
}

module.exports = {
    PRICE_FIELDS,
    DISCOUNT_MODES,
    PRICE_HIDDEN,
    DEFAULT_PRICING,
    loadPricingConfig,
    invalidatePricingConfig,
    getPricingConfig,
    usesCustomPricing,
    resolveSitePrice,
    resolveXmlShipping,
    applySitePricing,
    applySitePricingMany,
    salePriceExpr,
    sortPriceExpr,
    pricedCondition,
    priceRangeCondition
};
