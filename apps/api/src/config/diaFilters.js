/**
 * TÜM DIA SYNC İŞLEMLERİ İÇİN MERKEZI FİLTRELER
 */

const MAIN_DIA_FILTERS = [
    { field: "durum", operator: "=", value: "A" },
    { field: "b2c_durum", operator: "=", value: "E" },
    { field: "b2c_gonder", operator: "=", value: "E" },
    { field: "fiili_stok", operator: ">", value: "0" }
];

const CATEGORY_FILTERS = [
    "Lastik",
    "Jant",
    "Aksesuar",
    "Kar Paleti ve Zinciri",
    "Akü"
];

const EXCLUDED_CATEGORIES = [
    "İkinci El Lastik",
    "Hizmetlerimiz"
];

const SYNC_SPECIFIC_FILTERS = {
    names: [],
    codes: [],
    prices: [],
    images: [],
    all: []
};

const FILTER_DESCRIPTIONS = {
    "durum": "Aktif Ürünler (A)",
    "b2c_durum": "B2C Etkin (E)",
    "b2c_gonder": "B2C Gönderim Aktif (E)",
    "fiili_stok": "Stokta Var (>0)",
};

function getCategoryFilter() {
    return CATEGORY_FILTERS.map(category => ({
        field: "m_kategoriler.kategori_aciklama_1",
        operator: "=",
        value: category
    }));
}

function getAllFilters() {
    const categoryFilters = getCategoryFilter();
    return [...MAIN_DIA_FILTERS, ...categoryFilters];
}

function getFiltersForSyncType(syncType) {
    const mainFilters = getAllFilters();
    const specificFilters = SYNC_SPECIFIC_FILTERS[syncType] || [];
    return [...mainFilters, ...specificFilters];
}

function getAvailableSyncTypes() {
    return Object.keys(SYNC_SPECIFIC_FILTERS);
}

function getFilterDescriptions() {
    return { ...FILTER_DESCRIPTIONS };
}

function logFilterConfig() {
    console.log('=== DIA FİLTRE KONFIGÜRASYONU ===');
    console.log('Temel Filtreler:', JSON.stringify(MAIN_DIA_FILTERS, null, 2));
    console.log('Kategori Filtreleri:', CATEGORY_FILTERS);
    console.log('Sync Tipleri:', Object.keys(SYNC_SPECIFIC_FILTERS));
    console.log('================================');
}

module.exports = {
    MAIN_DIA_FILTERS,
    CATEGORY_FILTERS,
    EXCLUDED_CATEGORIES,
    SYNC_SPECIFIC_FILTERS,
    FILTER_DESCRIPTIONS,
    getCategoryFilter,
    getAllFilters,
    getFiltersForSyncType,
    getAvailableSyncTypes,
    getFilterDescriptions,
    logFilterConfig
};