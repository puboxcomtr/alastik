/**
 * Site bazlı satış fiyatı çözümü — PANELDEN YÖNETİLİR.
 *
 * Ayar kaynağı: sitesettings { key:'theme', site } → value.priceField / value.priceDiscountMode
 * (Admin > Tasarım > Tema Ayarları > "Gösterilecek Fiyat").
 *   priceField        : 'fiyat1' | 'fiyat2' | 'fiyat3' | 'fiyat4'  (varsayılan fiyat4)
 *   priceDiscountMode : 'none' | 'b2c_oran'                        (varsayılan none)
 *     b2c_oran → satış = temelFiyat − (temelFiyat × oran/100), yani oran kadar İNDİRİM
 *     (21 Ağu 2026 son karar; ara bir sürümde temelFiyat × oran denenmiş, geri alındı).
 *     Oran DIA "B2C İndirim Oranı" (birimindirimorani "AD: 46.00" > b2c_indirimorani). Oran yoksa temel fiyat aynen.
 *
 * Vitrindeki tüm tüketiciler satış fiyatını m_birimler[0].fiyat4 alanından okuduğu için
 * dönüşüm, yanıt üzerindeki fiyat4 alanı ezilerek yapılır; üstü çizili liste fiyatı (fiyat1)
 * değişmez → satış fiyatı düşükse indirim etiketi kendiliğinden görünür.
 * Varsayılan ayarda (fiyat4 + none) hiçbir şeye dokunulmaz — eski davranış birebir.
 *
 * İstisna: 'Hizmetlerimiz' kategorisi site kuralına girmez; DIA'daki KDV dahil satış
 * fiyatı (fiyat4) her sitede aynen gösterilir (1 Eyl 2026 kararı).
 * İstisna 2: XML kaynaklı ürünler (syncInfo.syncSource='xml_integration') site kuralına
 * girmez; fiyat4 zaten XML fiyat kurallarıyla site bazlı hesaplanır (1 Eyl 2026).
 */

// '__dinamik__16' = ALastik B2C dinamik fiyatı. Senkron bu değeri m_birimler[0].fiyat4'e yazar,
// ham toptan fiyatı fiyat4Ham'da tutar. Bu alan seçilirse YALNIZ dinamik fiyat gösterilir;
// dinamik yoksa fiyat gizlenir (fallback/başka alan gösterilmez).
const PRICE_FIELDS = ['fiyat1', 'fiyat2', 'fiyat3', 'fiyat4', '__dinamik__16'];
const DISCOUNT_MODES = ['none', 'b2c_oran'];
// Fiyat gizli işareti: '__dinamik__16' seçili + üründe dinamik fiyat yok → fiyat gösterilmez,
// sepete eklenemez. Sentinel (Symbol) sayı/null ile asla karışmaz.
const PRICE_HIDDEN = Symbol('priceHidden');
// Hizmet kategorisi site fiyat kuralından muaftır: DIA'daki KDV dahil satış fiyatı (fiyat4) aynen gösterilir
const { SERVICE_VAT_RULE } = require('../config/diaFilters');
const { DEFAULT_SITE } = require('../config/sites');
const DEFAULT_PRICING = Object.freeze({ priceField: 'fiyat4', discountMode: 'none' });
const CONFIG_TTL_MS = 60 * 1000;
// Geç bağlama: ShippingRuleService model yükler, döngüsel require riskine karşı kullanım anında alınır
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

/**
 * Tüm sitelerin fiyat ayarlarını DB'den yükler (server açılışında await edilir).
 */
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
        // DB hazır değilse mevcut/varsayılan ayarlarla devam
    }
    return configBySite;
}

/** Admin tema ayarı kaydedilince çağrılır — bir sonraki istekte DB'den tazelenir */
function invalidatePricingConfig() {
    configLoadedAt = 0;
}

/**
 * Sitenin güncel fiyat ayarı (senkron; 60 sn'de bir arka planda tazelenir)
 */
function getPricingConfig(site) {
    if (Date.now() - configLoadedAt > CONFIG_TTL_MS) loadPricingConfig();
    return configBySite[site] || DEFAULT_PRICING;
}

function isDefaultPricing(cfg) {
    return cfg.priceField === DEFAULT_PRICING.priceField && cfg.discountMode === DEFAULT_PRICING.discountMode;
}

/** Site varsayılan (fiyat4) dışında bir fiyat kuralı kullanıyor mu */
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

/**
 * Sitenin kuralına göre satış fiyatı. Varsayılan ayarda veya temel fiyat yoksa null
 * döner (çağıran mevcut fiyat4 mantığıyla devam eder).
 * doc: WebProduct (diaData'lı) veya ham DiaStock dokümanı olabilir.
 */
function resolveSitePrice(doc, site) {
    // XML kaynaklı ürün: sitenin kendi XML fiyatı (siteData.<site>.xmlPrice) varsa o gösterilir,
    // yoksa sahibin XML kural fiyatı (fiyat4) aynen kalır
    if (doc?.syncInfo?.syncSource === 'xml_integration') {
        const siteXml = parseFloat(doc?.customData?.siteData?.[site]?.xmlPrice);
        return siteXml > 0 ? round2(siteXml) : null;
    }

    const cfg = getPricingConfig(site);
    if (isDefaultPricing(cfg)) return null;

    const dia = doc?.diaData || doc || {};
    if (isServiceProduct(dia)) return null;
    const birim = (dia.m_birimler || [])[0] || {};

    // '__dinamik__16' seçili: yalnız dinamik B2C fiyatı. fiyat4 senkronda dinamikle ezilir,
    // ham toptan fiyat4Ham'da durur → dinamik = fiyat4 (fiyat4Ham'dan farklıysa). Dinamik
    // yoksa PRICE_HIDDEN döner (fiyat gösterilmez, başka alana düşülmez).
    if (cfg.priceField === '__dinamik__16') {
        const dinamik = parseFloat(birim.fiyat4) || 0;
        const ham = parseFloat(birim.fiyat4Ham) || 0;
        const hasDynamic = dinamik > 0 && !(ham > 0 && Math.abs(dinamik - ham) < 0.01);
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

/**
 * XML üründe sitenin kargo dahil fiyat alanları.
 * Varsayılan site global customData alanlarını (shippingIncludedPrice/shippingPerUnit),
 * diğer siteler customData.siteData.<site> altındaki kendi alanlarını kullanır.
 * XML olmayan üründe null döner.
 */
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

/**
 * Ürün dokümanının satış fiyatı alanlarını siteye göre yerinde günceller.
 * WebProduct: diaData.m_birimler[0].fiyat4 — DiaStock (ham): m_birimler[0].fiyat4 + kök fiyat4
 */
function applySitePricing(doc, site) {
    if (!doc) return doc;
    const price = resolveSitePrice(doc, site);
    // Fiyat gizli: satış fiyatını 0 yap, priceHidden işaretle, kargo payı ekleme, başka alana düşme
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
    // XML üründe varsayılan site dışı: global kargo dahil / webPrice alanları sahibin (varsayılan
    // sitenin) değerlerini taşır; vitrin bu alanları öncelikli okuduğundan sitenin kendi
    // değerleriyle ezilir (yoksa 0 — satış fiyatına düşülür)
    if (doc.syncInfo?.syncSource === 'xml_integration' && site !== DEFAULT_SITE) {
        const ship = resolveXmlShipping(doc, site);
        doc.customData = doc.customData || {};
        doc.customData.shippingIncludedPrice = ship.shippingIncludedPrice;
        doc.customData.shippingPerUnit = ship.shippingPerUnit;
        if (price !== null) doc.customData.webPrice = price;
    }
    // Kural tabanlı kargo payı (Kargo Tanımları): fiyata gömülür, müşteri "ücretsiz kargo" görür
    if (doc.diaData) applyShippingToProduct(doc, site);
    return doc;
}

function applySitePricingMany(docs, site) {
    if (!Array.isArray(docs)) return docs;
    for (const doc of docs) applySitePricing(doc, site);
    return docs;
}

/* ---------- Sorgu/aggregation tarafı (liste filtresi, sıralama, min-maks) ---------- */

/**
 * Satış fiyatını MongoDB aggregation ifadesi olarak döndürür (resolveSitePrice ile aynı kural).
 */
function salePriceExpr(site) {
    const fiyat4 = { $ifNull: [{ $arrayElemAt: ['$diaData.m_birimler.fiyat4', 0] }, 0] };

    // XML kaynaklı üründe sitenin kendi XML fiyatı (siteData.<site>.xmlPrice) öncelikli
    const isXml = { $eq: [{ $ifNull: ['$syncInfo.syncSource', ''] }, 'xml_integration'] };
    const siteXmlPrice = {
        $convert: { input: `$customData.siteData.${site}.xmlPrice`, to: 'double', onError: 0, onNull: 0 }
    };
    const withXmlOverride = (inner) => ({
        $cond: [{ $and: [isXml, { $gt: [siteXmlPrice, 0] }] }, siteXmlPrice, inner]
    });

    const cfg = getPricingConfig(site);
    if (isDefaultPricing(cfg)) return withXmlOverride(fiyat4);

    // '__dinamik__16' seçili: dinamik değer fiyat4'te tutulur (senkron ezer) → filtre/sıralama fiyat4'ü kullanır
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
    // Hizmet ve XML kaynaklı ürünler site kuralına girmez (fiyat4 = kural sonucu / DIA fiyatı)
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

/**
 * Liste sıralamasında kullanılan fiyat ifadesi: kargo dahil site fiyatı > (varsayılan
 * sitede webPrice) > satış fiyatı. Varsayılan site dışında global webPrice /
 * shippingIncludedPrice alanları sahibin değerleri olduğundan atlanır; XML ürünün
 * kargo dahil fiyatı customData.siteData.<site> altından okunur.
 */
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

/**
 * "Fiyatsız ürünleri gizle" koşulu (filter nesnesine Object.assign ile eklenir).
 */
function pricedCondition(site) {
    if (!usesCustomPricing(site)) return { 'diaData.m_birimler.0.fiyat4': { $gt: 0 } };
    return { $expr: { $gt: [salePriceExpr(site), 0] } };
}

/**
 * fiyatMin / fiyatMax aralık koşulu ($and dizisine eklenir).
 */
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
