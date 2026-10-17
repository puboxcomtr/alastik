/**
 * Stoklu (DIA) ürünler için kural tabanlı birim kargo payı.
 *
 * Kurallar admin Kargo Tanımları'ndan gelir (Cargo: productRules / brandRules / categoryRules / sizeRules,
 * dia_api tipinde ise genel desiPricing + fixedPrice). Kargo payı XML ürünlerdeki gibi ürün fiyatına GÖMÜLÜR:
 * müşteri tek fiyat + "ücretsiz kargo" görür, siparişte birim kargo ayrı kaydedilir (admin panelde görünür).
 *
 * Öncelik (ilk eşleşen kazanır): Ürün > Marka > Kategori > Ebat (genel) > Genel: stok desi tablosu (stockDesiPricing);
 * o yoksa dia_api tipli tanımın genel desi/sabit ücreti. XML ürünleri ayrı tabloyu (desiPricing) kullanır.
 * Kural içinde: ebat bazlıysa ebat ücreti > desi tablosu > sabit ücret (>0) > bir sonraki seviye.
 * Ücretsiz kargo eşikleri (tutar / desi) stoklu ürünlerin KENDİ alanlarından (stockFreeShipping*) okunur; birim bazlı uygulanır.
 *
 * Ayarlar 60 sn önbelleklenir; admin kargo kaydedince invalidateShippingRules() ile düşürülür.
 */
const Cargo = require('../../../models/admin/settings/Cargo');
const WebCategory = require('../../../models/web/catalog/WebCategory');
const CargoCalculatorService = require('./CargoCalculatorService');

const CACHE_TTL_MS = 60 * 1000;
// Genel ebat kuralları (Cargo.sizeRules) yalnız bu ürün türlerine uygulanır (DIA ozelkod7kodu): lastik ve jant.
// Aksesuarlar da lastik ebatı taşır (ör. kar çorabı "215/65R16") ama ebat ücreti onlar için değildir;
// aksesuara ebat ücreti gerekiyorsa kategori / marka kuralı ile tanımlanır.
const TIRE_TYPE_CODE = 'LASTİK';
const RIM_TYPE_CODE = 'JANT';
const SIZE_RULE_PRODUCT_TYPES = [TIRE_TYPE_CODE, RIM_TYPE_CODE];
const SIZE_REGEX = /(\d{1,3}(?:\.\d{1,2})?)(?:\/(\d{2,3})?)?\s*Z?R\s*(\d{2}(?:\.5)?)\s*(C)?(?![0-9])/i;

let cacheBySite = {};
let categoryMap = {};
let loadedAt = 0;
let loading = null;

function round2(v) {
    return Math.round(v * 100) / 100;
}

/** Ürün ebatı — admin kural sayfasındaki extractProductSize ile aynı kural */
function productSize(dia) {
    const props = {};
    for (const o of dia.m_urunOzellikleri || []) {
        if (o?.ozellikadi) props[o.ozellikadi] = String(o.detayaciklama || '').trim();
    }
    const tip = String(dia.ozelkod7kodu || '').toUpperCase();
    if (tip === RIM_TYPE_CODE || props['Jant Genişliği']) {
        const w = props['Jant Genişliği'];
        const d = (props['Jant Çapı'] || '').replace(/[^0-9.]/g, '');
        if (w && d) return `${w}x${d}`;
    } else {
        const w = props['Genişlik'];
        const a = props['Yanak'];
        const d = (props['Jant Çapı'] || '').replace(/^R/i, '').toUpperCase();
        if (w && d) return a ? `${w}/${a}R${d}` : `${w}R${d}`;
    }
    const name = String(dia.aciklama || '');
    const tire = name.match(SIZE_REGEX);
    if (tire) return `${tire[1]}${tire[2] ? `/${tire[2]}` : ''}R${tire[3]}${tire[4] ? 'C' : ''}`;
    const rim = name.match(/(\d{1,2}(?:\.\d)?)\s*x\s*(\d{2})/i);
    if (rim) return `${rim[1]}x${rim[2]}`;
    return null;
}

async function loadShippingRules() {
    if (loading) return loading;
    loading = (async () => {
        try {
            const cargos = await Cargo.find({ isActive: true }).sort({ webOrder: 1 }).lean();
            const next = {};
            const categoryIds = new Set();
            for (const c of cargos) {
                (next[c.site] = next[c.site] || []).push(c);
                (c.categoryRules || []).forEach(r => categoryIds.add(String(r.categoryId)));
            }
            const cats = categoryIds.size
                ? await WebCategory.find({ _id: { $in: [...categoryIds] } }).select('diaCategory diaLevel').lean()
                : [];
            const catMap = {};
            cats.forEach(c => { catMap[String(c._id)] = { diaCategory: c.diaCategory, diaLevel: c.diaLevel || 'kategori_aciklama_2' }; });
            cacheBySite = next;
            categoryMap = catMap;
            loadedAt = Date.now();
        } catch (e) {
            // DB hazır değilse mevcut önbellekle devam
        } finally {
            loading = null;
        }
    })();
    return loading;
}

function invalidateShippingRules() {
    loadedAt = 0;
}

function getCargos(site) {
    if (Date.now() - loadedAt > CACHE_TTL_MS) loadShippingRules();
    return cacheBySite[site] || [];
}

/** Kural içi çözüm: ebat > desi tablosu > sabit ücret; yoksa null */
function priceFromRule(rule, size, desi) {
    if (rule.pricingMode === 'size' && size) {
        const hit = (rule.sizeRules || []).find(s => s.size === size);
        if (hit) return hit.price;
    }
    const ranges = rule.desiPricing?.ranges || [];
    if (ranges.length > 0 && desi > 0) {
        return CargoCalculatorService.calculateShippingPrice(desi, { desiPricing: rule.desiPricing, fixedPrice: rule.fixedPrice || 0 });
    }
    if ((rule.fixedPrice || 0) > 0) return rule.fixedPrice;
    return null;
}

/** Tanımda stoktaki ürünler için genel ücret (desi tablosu ya da sabit ücret) tanımlı mı? */
function hasStockGeneral(cargo) {
    return (cargo.stockDesiPricing?.ranges || []).length > 0 || (cargo.stockFixedPrice || 0) > 0;
}

/** Eski yapı: stoklu ürün ayarları tanımın genel alanlarında tutulan (dia_api tipli, stok alanları boş) tanım */
function isLegacyStockDefinition(cargo) {
    return cargo.productType === 'dia_api' && !hasStockGeneral(cargo);
}

/**
 * Genel (kuralsız) kargo ücreti — stoktaki ürünlerin kendi ayarlarından: desi tablosu, yoksa sabit ücret.
 * Desisi olmayan ürüne (hizmetler vb.) ücret yazılmaz.
 */
function generalPrice(cargo, desi) {
    if (isLegacyStockDefinition(cargo)) return CargoCalculatorService.calculateShippingPrice(desi, cargo);
    if (!(desi > 0)) return null;
    return CargoCalculatorService.calculateShippingPrice(desi, { desiPricing: cargo.stockDesiPricing, fixedPrice: cargo.stockFixedPrice || 0 });
}

/** Stoklu ürünün ücretsiz kargo eşikleri (XML eşiklerinden ayrı) */
function stockFreeShippingSettings(cargo) {
    if (isLegacyStockDefinition(cargo)) return cargo;
    return { freeShippingThreshold: cargo.stockFreeShippingThreshold || 0, freeShippingDesiLimit: cargo.stockFreeShippingDesiLimit || 0 };
}

function productMatchesCategory(dia, rule) {
    const cat = categoryMap[String(rule.categoryId)];
    if (!cat || !cat.diaCategory) return false;
    return (dia.m_kategoriler || []).some(k => k && k[cat.diaLevel] === cat.diaCategory);
}

/**
 * Ürün için birim kargo payı. XML ürünler kendi statik alanlarını taşır (bu servis karışmaz).
 * Dönüş: { shippingPerUnit, cargoId, cargoName, source } | null
 */
function resolveUnitShipping(product, site, unitPrice = 0) {
    if (!product || product.syncInfo?.syncSource === 'xml_integration') return null;
    const cargos = getCargos(site);
    if (cargos.length === 0) return null;

    const dia = product.diaData || {};
    const key = String(product._key);
    const size = productSize(dia);
    const sizeRuleEligible = SIZE_RULE_PRODUCT_TYPES.includes(String(dia.ozelkod7kodu || '').toUpperCase());
    const desi = parseFloat(dia.anabirimdesi) || 0;
    const marka = String(dia.marka || '').toLowerCase();

    const levels = [
        ['product', c => (c.productRules || []).find(r => String(r.productKey) === key), r => r.price],
        ['brand', c => (c.brandRules || []).find(r => r.diaBrand && r.diaBrand.toLowerCase() === marka), r => priceFromRule(r, size, desi)],
        ['category', c => (c.categoryRules || []).find(r => productMatchesCategory(dia, r)), r => priceFromRule(r, size, desi)],
        ['size', c => (size && sizeRuleEligible ? (c.sizeRules || []).find(r => r.size === size) : null), r => r.price],
        ['general', c => (hasStockGeneral(c) || (c.productType === 'dia_api' && ((c.desiPricing?.ranges || []).length > 0 || (c.fixedPrice || 0) > 0)) ? c : null), c => generalPrice(c, desi)]
    ];

    for (const [source, find, price] of levels) {
        for (const cargo of cargos) {
            const hit = find(cargo);
            if (!hit) continue;
            const value = price(hit);
            if (value === null || value === undefined || !(value >= 0)) continue;
            const free = CargoCalculatorService.checkFreeShipping(unitPrice, desi, stockFreeShippingSettings(cargo));
            return {
                shippingPerUnit: free.isFree ? 0 : round2(value),
                cargoId: String(cargo._id),
                cargoName: cargo.name,
                source,
                isFreeShipping: free.isFree,
                // Kargo ürün fiyatına dahil mi, yoksa sepette ayrı satır mı (tanımın stok ayarı)
                excluded: cargo.stockShippingPriceMode === 'excluded'
            };
        }
    }
    return null;
}

/**
 * Yanıt dokümanına kargo payını işler: customData.shippingPerUnit ve (gösterim "fiyata dahil" ise)
 * customData.shippingIncludedPrice (= satış fiyatı + kargo). Vitrin shippingIncludedPrice'ı öncelikli
 * gösterdiğinden müşteri kargo dahil tek fiyat görür. "Fiyattan hariç" ise shippingExcluded işaretlenir.
 */
function applyShippingToProduct(doc, site) {
    if (!doc || doc.syncInfo?.syncSource === 'xml_integration') return doc;
    const birim = (doc.diaData?.m_birimler || [])[0];
    const salePrice = parseFloat(doc.customData?.webPrice) || parseFloat(birim?.fiyat4) || 0;
    if (salePrice <= 0) return doc;
    const result = resolveUnitShipping(doc, site, salePrice);
    if (!result || result.shippingPerUnit <= 0) return doc;
    doc.customData = doc.customData || {};
    doc.customData.shippingPerUnit = result.shippingPerUnit;
    doc.customData.shippingCargoName = result.cargoName;
    if (result.excluded) {
        // Fiyata dahil edilmez: vitrin ürün fiyatını kargosuz gösterir, kargo sepette ayrı satırdır
        doc.customData.shippingExcluded = true;
    } else {
        doc.customData.shippingIncludedPrice = round2(salePrice + result.shippingPerUnit);
    }
    return doc;
}

module.exports = { loadShippingRules, invalidateShippingRules, resolveUnitShipping, applyShippingToProduct, productSize };
