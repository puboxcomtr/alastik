const mongoose = require('mongoose');
const { SITES, DEFAULT_SITE } = require('../../../config/sites');

const webMerchantSettingsSchema = new mongoose.Schema({
    // Her site için ayrı Merchant yapılandırması ve feed'i
    site: {
        type: String,
        enum: Object.keys(SITES),
        default: DEFAULT_SITE,
        required: true,
        unique: true,
        index: true
    },

    // Genel Ayarlar
    isActive: { type: Boolean, default: true },
    currency: { type: String, default: 'TRY' },
    language: { type: String, default: 'tr' },
    country: { type: String, default: 'TR' },

    // Fiyat Ayarları
    priceField: {
        type: String,
        enum: ['fiyat1', 'fiyat2', 'fiyat3', 'fiyat4', 'fiyat10'],
        default: 'fiyat4'
    },
    includeTax: { type: Boolean, default: true },
    taxRate: { type: Number, default: 20 },

    // Ürün Filtresi
    onlyInStock: { type: Boolean, default: true },
    minPrice: { type: Number, default: 0 },
    minStock: { type: Number, default: 1 },
    // Gerçek DIA stok kartıyla eşleşmemiş XML ürünlerini (otomatik -XML kartları,
    // ozelkod10=XML) feed'e alma
    excludeUnmatchedXml: { type: Boolean, default: false },
    // Feed'den hariç tutulacak DIA üst kategori adları (kategori_aciklama_1)
    excludedCategories: { type: [String], default: [] },

    // Görsel Ayarları
    imageSource: {
        type: String,
        enum: ['custom_first', 'dia_first'],
        default: 'custom_first'
    },

    // Alan Eşleştirmeleri
    fieldMapping: {
        id: { type: String, default: 'stokkartkodu' },
        title: { type: String, default: 'diaData.aciklama' },
        description: { type: String, default: 'customData.customDescription' },
        brand: { type: String, default: 'marka' },
        gtin: { type: String, default: 'anabarkod' },
        condition: { type: String, enum: ['new', 'used', 'refurbished'], default: 'new' },
    },

    // Kargo Ayarları
    shippingEnabled: { type: Boolean, default: true },
    shippingCountry: { type: String, default: 'TR' },
    shippingPrice: { type: Number, default: 0 },
    freeShippingThreshold: { type: Number, default: 0 },

    // Feed Ayarları
    feedFormat: { type: String, enum: ['xml', 'csv'], default: 'xml' },
    lastGenerated: { type: Date, default: null },
    productCount: { type: Number, default: 0 }

}, {
    timestamps: true,
    collection: 'webmerchantsettings'
});

module.exports = mongoose.model('WebMerchantSettings', webMerchantSettingsSchema);