const { getNetPriceRule, isNetPriceStock } = require('./netPrice');
const DiaSettings = require('../../../models/plugins/dia/DiaSettings');
const FinancialDiscount = require('../../../models/admin/settings/FinancialDiscount');
const WebCategory = require('../../../models/web/catalog/WebCategory');
const { STOCK_SOURCES } = FinancialDiscount;

const CACHE_TTL_MS = 60 * 1000;
const cache = new Map();

const XML_CODE_MARKER = '-XML';
const XML_SOURCE_ID = STOCK_SOURCES.find(s => s.syncSource === 'xml_integration').id;
const OWN_SOURCE_ID = STOCK_SOURCES.find(s => s.syncSource === 'dia_api').id;

const fold = value => String(value || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR').replace(/ı/g, 'i');

const SECOND_HAND_CATEGORY_SLUG = 'ikinci-el';
let secondHandCache = { at: 0, rule: null };

async function getSecondHandRule() {
    if (Date.now() - secondHandCache.at < CACHE_TTL_MS) return secondHandCache.rule;
    const category = await WebCategory.findOne({ slug: SECOND_HAND_CATEGORY_SLUG }).select('diaCategory diaLevel').lean();
    const rule = category?.diaCategory ? { level: category.diaLevel || 'kategori_aciklama_2', name: category.diaCategory } : null;
    secondHandCache = { at: Date.now(), rule };
    return rule;
}

function isSecondHandStock(stock, rule) {
    if (!rule) return false;
    return (stock?.m_kategoriler || []).some(category => category?.[rule.level] === rule.name);
}

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

const YEAR_PATTERN = /^\d{4}$/;

function yearMatches(rule, scope) {
    if (!rule.productionYear) return true;
    if (!rule.productionYearAndOlder) return rule.productionYear === scope.productionYear;
    return YEAR_PATTERN.test(scope.productionYear) && Number(scope.productionYear) <= Number(rule.productionYear);
}

function categoryMatches(rule, scope) {
    if (!rule.categories.length) return true;
    return scope.categories.some(pc => {
        if (!rule.categories.includes(pc.main)) return false;
        const subsOfMain = rule.subCategories.filter(s => s.main === pc.main);
        return subsOfMain.length === 0 || subsOfMain.some(s => s.name === pc.sub);
    });
}

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

const RATE_PRECISION = 1e6;
const roundRate = rate => Math.round(rate * RATE_PRECISION) / RATE_PRECISION;

function splitMethodDiscount(yearBrandRate, methodRate) {
    const method = Math.max(0, Number(methodRate) || 0);
    const base = Math.min(Math.max(0, Number(yearBrandRate) || 0), method);
    if (!(method > base)) return { yearBrandRate: roundRate(base), remainderRate: 0 };
    return { yearBrandRate: roundRate(base), remainderRate: roundRate((1 - (100 - method) / (100 - base)) * 100) };
}

const overdueKurusOf = member => Math.max(0, Math.round(Number(member?.diaCari?.overdueKurus) || 0));

const OVERDUE_THRESHOLD_TTL_MS = 60 * 1000;
const overdueThresholdCache = new Map();

async function getOverdueThresholdKurus(site) {
    const hit = overdueThresholdCache.get(site);
    if (hit && Date.now() - hit.at < OVERDUE_THRESHOLD_TTL_MS) return hit.kurus;
    const settings = await DiaSettings.getSettings(site);
    const kurus = Math.max(0, Math.round(Number(settings?.b2bOverdue?.blockThresholdKurus) || 0));
    overdueThresholdCache.set(site, { at: Date.now(), kurus });
    return kurus;
}

async function overdueBlocked(site, member) {
    const overdueKurus = overdueKurusOf(member);
    return overdueKurus > 0 && overdueKurus >= await getOverdueThresholdKurus(site);
}

const discountsBlocked = overdueBlocked;

const tierOfMember = member => (member?.diaCari?.premium === true ? 'premium' : 'normal');

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
