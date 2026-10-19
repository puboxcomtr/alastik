
const CUSTOMER_FILTERS = [
];

const ORDER_FIELDS = [
    '_key',
    'fisno',
    'tarih',
    'onay',
    'turu',
    '_key_scf_carikart',
    '__cariunvan',
    '__cariceptel',
    '__cariverginumarasi',
    'sevkadresi1',
    'sevkadresi2',
    'sevkadresi3',
    'toplam',
    'toplamkdv',
    'net',
    'dovizturu',
    'm_kalemler',
    'aciklama',
    'odemesekli',
    'sevktarihi',
    'teslimtarihi',
    'durum'
];

const ORDER_ITEM_FIELDS = [
    '_key',
    '_key_kalemturu',
    'miktar',
    'anamiktar',
    'birimfiyati',
    'tutari',
    'kdv',
    'kdvtutari',
    'indirim',
    'aciklama',
    'birimadi'
];

function getOrderFilters() {
    return [...CUSTOMER_FILTERS];
}

function getOrderFields() {
    return [...ORDER_FIELDS];
}

function getOrderItemFields() {
    return [...ORDER_ITEM_FIELDS];
}

function getOrderFieldsCustom(customFields = null) {
    return customFields ? customFields : getOrderFields();
}

function logOrderFilterConfig() {
    console.log('=== DIA SİPARİŞ FİLTRE KONFIGÜRASYONU ===');
    console.log('Sipariş Fields:', ORDER_FIELDS.length, 'alan çekilecek');
}

module.exports = {
    CUSTOMER_FILTERS,
    ORDER_FIELDS,
    ORDER_ITEM_FIELDS,

    getOrderFilters,
    getOrderFields,
    getOrderItemFields,
    getOrderFieldsCustom,
    logOrderFilterConfig
};