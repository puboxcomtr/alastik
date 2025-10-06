/**
 * DIA SİPARİŞ SYNC İÇİN MİNİMAL FİLTRELER
 * Sadece belirli müşteriye ait TÜM siparişler çekilir
 */

// Müşteri bilgisi - DIA'dan gelen field adına göre güncellenecek
const CUSTOMER_FILTERS = [
    // Seçenek 1: Müşteri unvanı ile
    // { field: "__cariunvan", operator: "like", value: "%Ahmet Kaan Demir%" }
];

// DIA API'dan çekilecek sipariş alanları
const ORDER_FIELDS = [
    '_key',
    'fisno',                    // Sipariş numarası
    'tarih',                    // Sipariş tarihi
    'onay',                     // Onay durumu (KABUL, RED, BEKLEMEDE)
    'turu',                     // Sipariş türü
    '_key_scf_carikart',        // Müşteri key
    '__cariunvan',              // Müşteri unvanı
    '__cariceptel',             // Müşteri telefon
    '__cariverginumarasi',      // Vergi numarası
    'sevkadresi1',              // Sevk adresi
    'sevkadresi2',
    'sevkadresi3',
    'toplam',                   // Ara toplam
    'toplamkdv',                // KDV toplamı
    'net',                      // Genel toplam
    'dovizturu',                // Para birimi
    'm_kalemler',               // Sipariş kalemleri
    'aciklama',                 // Açıklama/Not
    'odemesekli',               // Ödeme şekli
    'sevktarihi',               // Sevk tarihi
    'teslimtarihi',             // Teslim tarihi
    'durum'                     // Sipariş durumu
];

// Sipariş kalemi (item) alanları
const ORDER_ITEM_FIELDS = [
    '_key',
    '_key_kalemturu',           // Ürün key
    'miktar',                   // Miktar
    'anamiktar',                // Ana birim miktar
    'birimfiyati',              // Birim fiyat
    'tutari',                   // Tutar
    'kdv',                      // KDV oranı
    'kdvtutari',                // KDV tutarı
    'indirim',                  // İndirim
    'aciklama',                 // Açıklama
    'birimadi'                  // Birim adı
];

/**
 * Müşteri filtrelerini döndürür
 * Boş array = TÜM siparişler gelir
 */
function getOrderFilters() {
    return [...CUSTOMER_FILTERS];
}

/**
 * Sipariş API alanlarını döndürür
 */
function getOrderFields() {
    return [...ORDER_FIELDS];
}

/**
 * Sipariş kalemi alanlarını döndürür
 */
function getOrderItemFields() {
    return [...ORDER_ITEM_FIELDS];
}

/**
 * Custom fields listesi ile override
 */
function getOrderFieldsCustom(customFields = null) {
    return customFields ? customFields : getOrderFields();
}

/**
 * Filtre konfigürasyonunu loglar
 */
function logOrderFilterConfig() {
    console.log('=== DIA SİPARİŞ FİLTRE KONFIGÜRASYONU ===');
    console.log('Müşteri Filtreleri:', JSON.stringify(CUSTOMER_FILTERS, null, 2));
    console.log('Sipariş Fields:', ORDER_FIELDS.length, 'alan çekilecek');
    console.log('NOT: TÜM siparişler çekilecek, backend\'de filtrelenecek');
}

module.exports = {
    // Ana exports
    CUSTOMER_FILTERS,
    ORDER_FIELDS,
    ORDER_ITEM_FIELDS,

    // Fonksiyonlar
    getOrderFilters,
    getOrderFields,
    getOrderItemFields,
    getOrderFieldsCustom,
    logOrderFilterConfig
};