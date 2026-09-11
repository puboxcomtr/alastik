/**
 * TÜM DIA SYNC İŞLEMLERİ İÇİN MERKEZI FİLTRELER
 *
 * Kurallar artık hardcoded değil: webdia (DiaSettings, site=alastik) kaydındaki
 * sync.durumFiltre / sync.ozelkod11Filtre / sync.hashKontrol alanlarından okunur.
 * 60 sn'lik cache ile senkron API korunur; DB'ye ulaşılamazsa varsayılanlar geçerlidir.
 */

const { SITE_SLUGS, DEFAULT_SITE } = require('./sites');

const DEFAULT_AKTARIM = { mode: 'tumu', filterType: 'urun', products: [], categories: [], brands: [] };
// Her Zaman Dahil listesi — boşken hiçbir ürünü eşleştirmez (etkisizdir)
const DEFAULT_ZORUNLU_DAHIL = { filterType: 'kategori', products: [], categories: [], brands: [] };
const DEFAULT_SYNC_RULES = { durum: 'A', ozelkod11Kodu: 'E', b2cKodu: '', b2bKodu: '', hashKontrol: true, aktarim: DEFAULT_AKTARIM, zorunluDahil: DEFAULT_ZORUNLU_DAHIL };

// Site bazlı kurallar: her site kendi DiaSettings kaydından (webdia) okunur.
// Bir ürünün hangi sitelerde yayınlanacağı (WebProduct.sites) bu kurallarla belirlenir.
const rulesBySite = {};
SITE_SLUGS.forEach(slug => { rulesBySite[slug] = { ...DEFAULT_SYNC_RULES }; });
let rulesLoadedAt = 0;
const RULES_TTL_MS = 60 * 1000;

// ARTIK BOŞ: webproducts koleksiyonu tek doğruluk kaynağıdır — aktarım aşamasında
// (passesWebFilter) filtrelenir, listelemede ek diaData filtresi uygulanmaz.
// Route'lar bu diziyi referansla iterasyon için kullanır; boş kalır.
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
        // Model/DB hazır değilse mevcut kurallarla devam
    }
}

/**
 * İlgili sitenin güncel sync kurallarını döndürür (60 sn'de bir DB'den tazelenir)
 */
function getSyncRules(site = DEFAULT_SITE) {
    if (Date.now() - rulesLoadedAt > RULES_TTL_MS) refreshRulesFromDb();
    return rulesBySite[site] || rulesBySite[DEFAULT_SITE];
}

/**
 * Tüm sitelerin kurallarını { site: rules } olarak döndürür
 */
function getAllSyncRules() {
    if (Date.now() - rulesLoadedAt > RULES_TTL_MS) refreshRulesFromDb();
    return rulesBySite;
}

// Kategori filtreleri kaldırıldı - Web panel kontrolü ile yapılacak
const CATEGORY_FILTERS = [];

// Hariç tutulan kategoriler kaldırıldı - Web panel kontrolü ile yapılacak  
const EXCLUDED_CATEGORIES = [];

// Sync türleri için ek filtreler (boş)
const SYNC_SPECIFIC_FILTERS = {
    names: [],
    codes: [],
    prices: [],
    images: [],
    all: []
};

// DIA API'dan çekilecek alanlar
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
    // LJA fiyatlaması: fiyat1 üzerinden uygulanan B2C indirim oranı
    'b2c_indirimorani',
    'birimindirimorani',
    'ozelkod5',
    'ozelkod5kodu',
    // Grup kodu — hizmet kartları DIA'da ozelkod6 = "Hizmet (Hizmet)" ile işaretlidir
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

/**
 * DIA API çekim filtreleri — ARTIK BOŞ: DIA'dan her şey filtresiz çekilir,
 * tüm ürünler diastocks'a yazılır. durum/ozelkod11/aktarım kuralları
 * yalnızca webproducts aktarım aşamasında (passesWebFilter) uygulanır.
 */
function getBasicFilters() {
    getSyncRules(); // gerekiyorsa DB'den tazele (listeleme kuralları için)
    return [];
}

/**
 * DIA API fields listesini döndürür
 */
function getDiaFields() {
    return [...DIA_FIELDS];
}

/**
 * Custom fields listesi ile override edebilir
 */
function getDiaFieldsCustom(customFields = null) {
    return customFields ? customFields : getDiaFields();
}

/**
 * Sync türüne göre filtreler
 */
function getFiltersForSyncType(syncType) {
    const basicFilters = getBasicFilters();
    const specificFilters = SYNC_SPECIFIC_FILTERS[syncType] || [];
    return [...basicFilters, ...specificFilters];
}

/**
 * Kategori filtreleri - artık boş döndürür
 */
function getCategoryFilter() {
    return [];
}

/**
 * Mevcut sync türlerini döndürür
 */
function getAvailableSyncTypes() {
    return Object.keys(SYNC_SPECIFIC_FILTERS);
}

/**
 * Filtre açıklamalarını döndürür
 */
function getFilterDescriptions() {
    return { ...FILTER_DESCRIPTIONS };
}

/**
 * Filtre konfigürasyonunu loglar
 */
function logFilterConfig() {
}

/**
 * Araç Tipi Eşleştirmeleri
 */
const WEB_DISPLAY_LABELS = {
    vehicleTypes: {
        'otolastik': 'Otomobil',
        'elektrikliaraclastigi': 'Elektrikli Araç',
        '4x4lastik': '4x4 SUV',
        'ticarilastik': 'Hafif Ticari',
        'setlastikler': 'Set Lastik'
    }
};

/**
 * Tüm ürün listelemeleri için ORTAK filtre
 * Admin & Web'de aynı kurallar geçerli
 */
/**
 * Hizmet kategorisi KDV kuralı:
 * Bu kategorideki ürünlerin fiyat4 değeri DIA'da KDV hariç girilir (kdvdurumu4='H');
 * web satış fiyatı KDV dahil olmalıdır. Kural senkron sırasında, fiyat webproducts'a
 * yazılırken TEK noktada uygulanır — vitrin/sepet/sipariş ek hesap yapmaz.
 * DİKKAT: kdvdurumu4='H' bayrağı lastiklerde de mevcut; kural yalnızca bu kategoriyle sınırlıdır.
 */
const SERVICE_VAT_RULE = {
    categoryLevel1: 'Hizmetlerimiz',
    defaultRate: 20
};

function getProductListFilters(site) {
    // webproducts zaten aktarım aşamasında filtrelenmiş küme — ek diaData filtresi yok.
    // site verilirse yalnızca o sitede yayınlanan (sites alanı) ürünler listelenir.
    const filters = { 'syncInfo.diaStatus': 'synced' };
    if (site) filters.sites = site;
    return filters;
}

function getVehicleTypeLabel(code) {
    return WEB_DISPLAY_LABELS.vehicleTypes[code] || code;
}

/**
 * Site bazlı ürün görünürlük filtresi.
 * Site ayarı (customData.siteData.<slug>.webVisible) varsa o geçerlidir,
 * yoksa ortak customData.webVisible değerine düşer.
 * Sorguya $or olarak eklenmeli ($and içinde kullanılabilir).
 */
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
    // Ana exports
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

    // Fonksiyonlar
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