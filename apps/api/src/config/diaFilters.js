/**
 * TÜM DIA SYNC İŞLEMLERİ İÇİN MERKEZI FİLTRELER
 */

const MAIN_DIA_FILTERS = [
    { field: "durum", operator: "=", value: "A" },
    { field: "ozelkod11", operator: "=", value: "E (E)" }
];

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
    'ozelkod5',
    'ozelkod5kodu',
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
 * Sadece temel filtreleri döndürür - kategori filtreleri kaldırıldı
 */
function getBasicFilters() {
    return [...MAIN_DIA_FILTERS];
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
function getProductListFilters() {
    return {
        'syncInfo.diaStatus': 'synced',
        'diaData.durum': 'A',
        'diaData.ozelkod11': 'E (E)'
    };
}

function getVehicleTypeLabel(code) {
    return WEB_DISPLAY_LABELS.vehicleTypes[code] || code;
}
module.exports = {
    // Ana exports 
    MAIN_DIA_FILTERS,
    CATEGORY_FILTERS,
    EXCLUDED_CATEGORIES,
    SYNC_SPECIFIC_FILTERS,
    FILTER_DESCRIPTIONS,
    DIA_FIELDS,
    WEB_DISPLAY_LABELS,

    // Fonksiyonlar
    getProductListFilters,
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