/**
 * Finansal iskontolar — panelde (Finansal İskontolar) tanımlanan kuralların ürüne uygulanması.
 *
 * Kural: cari tipi × ödeme yöntemi × (stok kaynağı, kategori, marka, üretim yılı) → iskonto oranı (%).
 * Bir ürün satırında, seçilen ödeme yöntemi için kural EŞLEŞİRSE o satırın ödeme iskontosu panel oranıdır
 * (DIA kampanyasından gelen oranın YERİNE geçer); eşleşme yoksa DIA oranı aynen kullanılır.
 * Birden fazla kural eşleşirse en dar kapsamlı (en çok alanı dolu) kural, eşitlikte en yüksek oran kazanır.
 *
 * Bayi sitesi (ürün listesi, sepet) ve sipariş hesabı aynı fonksiyonu kullanır — görünen fiyat = sipariş tutarı.
 */
const { getNetPriceRule, isNetPriceStock } = require('./netPrice');
const DiaSettings = require('../../../models/plugins/dia/DiaSettings');
const FinancialDiscount = require('../../../models/admin/settings/FinancialDiscount');
const WebCategory = require('../../../models/web/catalog/WebCategory');
const { STOCK_SOURCES } = FinancialDiscount;

const CACHE_TTL_MS = 60 * 1000;
const cache = new Map(); // site -> { at, rules }

// XML (tedarikçi) ürün stok kodu işareti — sipariş ucundaki ayrımla aynı
const XML_CODE_MARKER = '-XML';
const XML_SOURCE_ID = STOCK_SOURCES.find(s => s.syncSource === 'xml_integration').id;
const OWN_SOURCE_ID = STOCK_SOURCES.find(s => s.syncSource === 'dia_api').id;

/** Karşılaştırma için metni sadeleştirir (Türkçe harf farkı ve büyük/küçük harf önemsiz) */
const fold = value => String(value || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR').replace(/ı/g, 'i');

// İkinci el ürünler: vitrindeki "İkinci El" kategorisinin (slug) DIA kategori eşleşmesiyle tanınır
const SECOND_HAND_CATEGORY_SLUG = 'ikinci-el';
let secondHandCache = { at: 0, rule: null };

/** İkinci el ürün kuralı { level, name } (DIA kategori düzeyi + adı) — kategori kaydından, 60 sn önbellek */
async function getSecondHandRule() {
    if (Date.now() - secondHandCache.at < CACHE_TTL_MS) return secondHandCache.rule;
    const category = await WebCategory.findOne({ slug: SECOND_HAND_CATEGORY_SLUG }).select('diaCategory diaLevel').lean();
    const rule = category?.diaCategory ? { level: category.diaLevel || 'kategori_aciklama_2', name: category.diaCategory } : null;
    secondHandCache = { at: Date.now(), rule };
    return rule;
}

/** Stok kaydı ikinci el ürün mü? (m_kategoriler gerekir) */
function isSecondHandStock(stock, rule) {
    if (!rule) return false;
    return (stock?.m_kategoriler || []).some(category => category?.[rule.level] === rule.name);
}

/** Sitenin aktif kuralları (60 sn önbellek; panelde değişiklik olunca temizlenir) */
async function getActiveRules(site) {
    const cached = cache.get(site);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.rules;
    const docs = await FinancialDiscount.find({ site, isActive: true }).lean();
    const rules = docs.map(doc => {
        const categories = (doc.categories || []).map(fold);
        const subCategories = (doc.subCategories || []).map(s => ({ main: fold(s.main), name: fold(s.name) }));
        const brands = (doc.brands || []).map(fold);
        return {
            id: String(doc._id),
            name: doc.name,
            customerTier: doc.customerTier,
            paymentMethod: doc.paymentMethod,
            stockSource: doc.stockSource || '',
            productionYear: String(doc.productionYear || '').trim(),
            productionYearAndOlder: doc.productionYearAndOlder === true,
            categories,
            subCategories,
            brands,
            rate: Number(doc.rate) || 0,
            // Kapsam darlığı: dolu olan her alan 1 puan, alt kategori seçimi ek 1 puan
            specificity: (doc.stockSource ? 1 : 0) + (brands.length ? 1 : 0) + (doc.productionYear ? 1 : 0)
                + (categories.length ? 1 : 0) + (subCategories.length ? 1 : 0)
        };
    });
    cache.set(site, { at: Date.now(), rules });
    return rules;
}

function invalidateFinancialDiscounts(site) {
    if (site) cache.delete(site);
    else cache.clear();
}

/**
 * Ürünün kural eşleştirmesinde kullanılan özellikleri (DIA stok kaydından).
 * @param {object} stock stokkartkodu, marka, ekalan5, m_kategoriler
 */
function productScope(stock) {
    const code = String(stock?.stokkartkodu || '');
    return {
        code,
        source: code.includes(XML_CODE_MARKER) ? XML_SOURCE_ID : OWN_SOURCE_ID,
        brand: fold(stock?.marka),
        productionYear: String(stock?.ekalan5 || '').trim(),
        categories: (stock?.m_kategoriler || []).map(c => ({ main: fold(c.kategori_aciklama_1), sub: fold(c.kategori_aciklama_2) })).filter(c => c.main)
    };
}

// Dört haneli üretim yılı (ürünlerde yıl yerine "#" gibi değerler de bulunabiliyor)
const YEAR_PATTERN = /^\d{4}$/;

/** Kuralın üretim yılı kapsamı ürünü içeriyor mu? ("ve öncesi" ise ürün yılı ≤ kural yılı; yılı olmayan ürün eşleşmez) */
function yearMatches(rule, scope) {
    if (!rule.productionYear) return true;
    if (!rule.productionYearAndOlder) return rule.productionYear === scope.productionYear;
    return YEAR_PATTERN.test(scope.productionYear) && Number(scope.productionYear) <= Number(rule.productionYear);
}

/** Kuralın kategori kapsamı ürünü içeriyor mu? (ana kategori + varsa o ana kategorinin seçili alt kategorileri) */
function categoryMatches(rule, scope) {
    if (!rule.categories.length) return true;
    return scope.categories.some(pc => {
        if (!rule.categories.includes(pc.main)) return false;
        const subsOfMain = rule.subCategories.filter(s => s.main === pc.main);
        // Ana kategorinin hiç alt kategorisi seçilmemişse tamamı kapsamdadır
        return subsOfMain.length === 0 || subsOfMain.some(s => s.name === pc.sub);
    });
}

/**
 * Ürün + cari tipi + ödeme yöntemi için geçerli kuralı bulur.
 * XML ürünlere finansal iskonto UYGULANMAZ (mevcut kural: tedarikçi ürününde iskonto yok).
 * @returns {object|null} eşleşen kural
 */
function matchFinancialDiscount(rules, { tier, methodId, scope }) {
    if (!scope || scope.source === XML_SOURCE_ID) return null;
    let best = null;
    for (const rule of rules) {
        if (rule.customerTier !== tier || rule.paymentMethod !== methodId) continue;
        if (rule.stockSource && rule.stockSource !== scope.source) continue;
        if (rule.brands.length && !rule.brands.includes(scope.brand)) continue;
        if (!yearMatches(rule, scope)) continue;
        if (!categoryMatches(rule, scope)) continue;
        if (!best || rule.specificity > best.specificity || (rule.specificity === best.specificity && rule.rate > best.rate)) best = rule;
    }
    return best;
}

// İskonto oranı hassasiyeti (DIA indirim alanları 6 ondalık)
const RATE_PRECISION = 1e6;
const roundRate = rate => Math.round(rate * RATE_PRECISION) / RATE_PRECISION;

/**
 * Seçilen ödeme yönteminin iskontosunu DIA indirim satırlarına böler: yıl + marka iskontosu (Cari Sipariş oranı) ve
 * ödeme yönteminden kalan fark. İkisi zincirli uygulandığında toplam TAM yöntem oranına eşittir
 * (ör. yıl-marka %4, havale %7 → 4 + 3,125; 0,96 × 0,96875 = 0,93).
 * Yöntem oranı yıl-marka oranından küçükse tamamı yıl-marka satırına yazılır, fark 0'dır.
 * @param {number} yearBrandRate Cari Sipariş (yıl + marka) oranı (%)
 * @param {number} methodRate seçilen ödeme yönteminin oranı (%)
 * @returns {{ yearBrandRate: number, remainderRate: number }}
 */
function splitMethodDiscount(yearBrandRate, methodRate) {
    const method = Math.max(0, Number(methodRate) || 0);
    const base = Math.min(Math.max(0, Number(yearBrandRate) || 0), method);
    if (!(method > base)) return { yearBrandRate: roundRate(base), remainderRate: 0 };
    return { yearBrandRate: roundRate(base), remainderRate: roundRate((1 - (100 - method) / (100 - base)) * 100) };
}

/** Carinin vadesi geçen borcu (kuruş; finans senkronundan — WebMember.diaCari.overdueKurus) */
const overdueKurusOf = member => Math.max(0, Math.round(Number(member?.diaCari?.overdueKurus) || 0));

const OVERDUE_THRESHOLD_TTL_MS = 60 * 1000;
const overdueThresholdCache = new Map(); // site -> { at, kurus }

/** Vadesi geçen borç yaptırım eşiği (kuruş) — DiaSettings.b2bOverdue.blockThresholdKurus; altındaki borç yaptırım doğurmaz */
async function getOverdueThresholdKurus(site) {
    const hit = overdueThresholdCache.get(site);
    if (hit && Date.now() - hit.at < OVERDUE_THRESHOLD_TTL_MS) return hit.kurus;
    const settings = await DiaSettings.getSettings(site);
    const kurus = Math.max(0, Math.round(Number(settings?.b2bOverdue?.blockThresholdKurus) || 0));
    overdueThresholdCache.set(site, { at: Date.now(), kurus });
    return kurus;
}

/**
 * Carinin vadesi geçen borcu yaptırım doğuruyor mu? (borç var ve eşiğin altında değil)
 * Yaptırımlar: sepete ekleme + sipariş kapalı (creditLimit), iskontolar iptal (discountsBlocked).
 */
async function overdueBlocked(site, member) {
    const overdueKurus = overdueKurusOf(member);
    return overdueKurus > 0 && overdueKurus >= await getOverdueThresholdKurus(site);
}

/**
 * Vadesi geçen borcu yaptırım eşiğine ulaşan caride TÜM iskontolar iptaldir (panel finansal iskontoları + DIA ödeme yöntemi
 * iskontoları): bayi yalnız taban cari fiyatını görür. Borç kapanıp finans senkronu çalışınca kalkar.
 */
const discountsBlocked = overdueBlocked;

/** Üyenin cari tipi (Premium bilgisi DIA senkronundan) */
const tierOfMember = member => (member?.diaCari?.premium === true ? 'premium' : 'normal');

/**
 * Stok kayıtları için ödeme yöntemi → oran haritası (yalnız kuralı eşleşen ürün/yöntemler).
 * Net Fiyat ve ikinci el ürünlerde her yöntem açıkça 0 döner: ödeme / marka iskontosu yok, istemci DIA oranına da düşmez.
 * Stok kayıtları Net Fiyat ek alanlarını içermelidir (netPriceSelect).
 * @returns {Promise<Record<string, Record<string, number>>>} { stokKodu: { yöntem: oran } }
 */
async function resolveForStocks(site, tier, stocks, methodIds) {
    const rules = await getActiveRules(site);
    const netRule = await getNetPriceRule(site);
    const secondHandRule = await getSecondHandRule();
    const result = {};
    for (const stock of stocks) {
        const scope = productScope(stock);
        if (isNetPriceStock(stock, netRule) || isSecondHandStock(stock, secondHandRule)) {
            result[scope.code] = Object.fromEntries(methodIds.map(methodId => [methodId, 0]));
            continue;
        }
        for (const methodId of methodIds) {
            const rule = matchFinancialDiscount(rules, { tier, methodId, scope });
            if (rule) (result[scope.code] = result[scope.code] || {})[methodId] = rule.rate;
        }
    }
    return result;
}

module.exports = { getActiveRules, invalidateFinancialDiscounts, productScope, matchFinancialDiscount, splitMethodDiscount, getSecondHandRule, isSecondHandStock, tierOfMember, resolveForStocks, overdueKurusOf, overdueBlocked, discountsBlocked };
