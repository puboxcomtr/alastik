
const { SITE_SLUGS, DEFAULT_SITE } = require('./sites');

const DEFAULT_AKTARIM = { mode: 'tumu', filterType: 'urun', products: [], categories: [], brands: [] };
const DEFAULT_ZORUNLU_DAHIL = { filterType: 'kategori', products: [], categories: [], brands: [] };
const DEFAULT_SYNC_RULES = { durum: 'A', ozelkod11Kodu: 'E', b2cKodu: '', b2bKodu: '', hashKontrol: true, aktarim: DEFAULT_AKTARIM, zorunluDahil: DEFAULT_ZORUNLU_DAHIL };

const rulesBySite = {};
SITE_SLUGS.forEach(slug => { rulesBySite[slug] = { ...DEFAULT_SYNC_RULES }; });
let rulesLoadedAt = 0;
const RULES_TTL_MS = 60 * 1000;

const MAIN_DIA_FILTERS = [];

function settingsToRules(s) {
    const aktarim = s.aktarim
        ? {
            mode: s.aktarim.mode || 'tumu',
            filterType: s.aktarim.filterType || 'urun',
            products: s.aktarim.products || [],
            categories: s.aktarim.categories || [],
            brands: s.aktarim.brands || []
        }
        : DEFAULT_AKTARIM;
    return {
        durum: String(s.sync?.durumFiltre ?? DEFAULT_SYNC_RULES.durum).trim(),
        ozelkod11Kodu: String(s.sync?.ozelkod11Filtre ?? DEFAULT_SYNC_RULES.ozelkod11Kodu).trim(),
        b2cKodu: String(s.sync?.b2cFiltre ?? DEFAULT_SYNC_RULES.b2cKodu).trim(),
        b2bKodu: String(s.sync?.b2bFiltre ?? DEFAULT_SYNC_RULES.b2bKodu).trim(),
        hashKontrol: s.sync?.hashKontrol !== false,
        manuelGorselKoru: s.sync?.manuelGorselKoru !== false,
        aktarim,
        zorunluDahil: s.zorunluDahil
            ? {
                filterType: s.zorunluDahil.filterType || DEFAULT_ZORUNLU_DAHIL.filterType,
                products: s.zorunluDahil.products || [],
                categories: s.zorunluDahil.categories || [],
                brands: s.zorunluDahil.brands || []
            }
            : DEFAULT_ZORUNLU_DAHIL
    };
}

function refreshRulesFromDb() {
    rulesLoadedAt = Date.now();
    try {
        const DiaSettings = require('../models/plugins/dia/DiaSettings');
        SITE_SLUGS.forEach(slug => {
            DiaSettings.getSettings(slug).then(s => {
                rulesBySite[slug] = settingsToRules(s);
            }).catch(() => { });
        });
    } catch (e) {
    }
}

function getSyncRules(site = DEFAULT_SITE) {
    if (Date.now() - rulesLoadedAt > RULES_TTL_MS) refreshRulesFromDb();
    return rulesBySite[site] || rulesBySite[DEFAULT_SITE];
}

function getAllSyncRules() {
    if (Date.now() - rulesLoadedAt > RULES_TTL_MS) refreshRulesFromDb();
    return rulesBySite;
}

const CATEGORY_FILTERS = [];

const EXCLUDED_CATEGORIES = [];

const SYNC_SPECIFIC_FILTERS = {
    names: [],
    codes: [],
    prices: [],
    images: [],
    all: []
};

const DIA_FIELDS = [
    '_key',
    'stokkartkodu',
    'aciklama',
    'marka',
    'markaack',
    'fiyat1',
    'fiyat2',
    'fiyat3',
    'fiyat4',
    'fiyat10',
    'sontuketicifiyati',
    'fiili_stok',
    'gercek_stok',
    'durum',
    'b2c_gonder',
    'b2b_gonder',
    'b2c_indirimorani',
    'birimindirimorani',
    'ozelkod5',
    'ozelkod5kodu',
    'ozelkod6',
    'ozelkod6kodu',
    'ozelkod11',
    'ozelkod11kodu',
    'm_kategoriler',
    'm_resimler',
    'm_urunOzellikleri',
    'm_birimler',
    'ekalan1',
    'ekalan2',
    'ekalan3',
    'ekalan4',
    'ekalan5',
    'menseiulkeadi',
    'urunagaci1',
    'azamimiktar',
    'azamimiktar_firma',
    'anabarkod',
    'anabirimkey',
    'anabirimdesi',
    '__dinamik__16'
];

const FILTER_DESCRIPTIONS = {
    "durum": "Aktif Ürünler (A)",
    "ozelkod11": "Özel Kod 11 (E)"
};

function getBasicFilters() {
    getSyncRules();
    return [];
}

function getDiaFields() {
    return [...DIA_FIELDS];
}

function getDiaFieldsCustom(customFields = null) {
    return customFields ? customFields : getDiaFields();
}

function getFiltersForSyncType(syncType) {
    const basicFilters = getBasicFilters();
    const specificFilters = SYNC_SPECIFIC_FILTERS[syncType] || [];
    return [...basicFilters, ...specificFilters];
}

function getCategoryFilter() {
    return [];
}

function getAvailableSyncTypes() {
    return Object.keys(SYNC_SPECIFIC_FILTERS);
}

function getFilterDescriptions() {
    return { ...FILTER_DESCRIPTIONS };
}

function logFilterConfig() {
}

const WEB_DISPLAY_LABELS = {
    vehicleTypes: {
        'otolastik': 'Otomobil',
        'elektrikliaraclastigi': 'Elektrikli Araç',
        '4x4lastik': '4x4 SUV',
        'ticarilastik': 'Hafif Ticari',
        'setlastikler': 'Set Lastik'
    }
};

const SERVICE_VAT_RULE = {
    categoryLevel1: 'Hizmetlerimiz',
    defaultRate: 20
};

function getProductListFilters(site) {
    const filters = { 'syncInfo.diaStatus': 'synced' };
    if (site) filters.sites = site;
    return filters;
}

function getVehicleTypeLabel(code) {
    return WEB_DISPLAY_LABELS.vehicleTypes[code] || code;
}

function getSiteVisibilityFilter(site) {
    const siteField = `customData.siteData.${site}.webVisible`;
    return {
        $or: [
            { [siteField]: true },
            { [siteField]: { $exists: false }, 'customData.webVisible': true }
        ]
    };
}
module.exports = {
    MAIN_DIA_FILTERS,
    getSyncRules,
    getAllSyncRules,
    CATEGORY_FILTERS,
    EXCLUDED_CATEGORIES,
    SYNC_SPECIFIC_FILTERS,
    FILTER_DESCRIPTIONS,
    DIA_FIELDS,
    WEB_DISPLAY_LABELS,

    SERVICE_VAT_RULE,

    getProductListFilters,
    getSiteVisibilityFilter,
    getBasicFilters,
    getFiltersForSyncType,
    getCategoryFilter,
    getAvailableSyncTypes,
    getFilterDescriptions,
    getDiaFields,
    getDiaFieldsCustom,
    logFilterConfig,
    getVehicleTypeLabel
};