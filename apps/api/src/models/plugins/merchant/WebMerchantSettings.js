const mongoose = require('mongoose');
const { SITES, DEFAULT_SITE } = require('../../../config/sites');

const webMerchantSettingsSchema = new mongoose.Schema({
    site: {
        type: String,
        enum: Object.keys(SITES),
        default: DEFAULT_SITE,
        required: true,
        unique: true,
        index: true
    },

    isActive: { type: Boolean, default: true },
    currency: { type: String, default: 'TRY' },
    language: { type: String, default: 'tr' },
    country: { type: String, default: 'TR' },

    priceField: {
        type: String,
        enum: ['fiyat1', 'fiyat2', 'fiyat3', 'fiyat4', 'fiyat10'],
        default: 'fiyat4'
    },
    includeTax: { type: Boolean, default: true },
    taxRate: { type: Number, default: 20 },

    onlyInStock: { type: Boolean, default: true },
    minPrice: { type: Number, default: 0 },
    minStock: { type: Number, default: 1 },
    excludeUnmatchedXml: { type: Boolean, default: false },
    excludedCategories: { type: [String], default: [] },

    imageSource: {
        type: String,
        enum: ['custom_first', 'dia_first'],
        default: 'custom_first'
    },

    fieldMapping: {
        id: { type: String, default: 'stokkartkodu' },
        title: { type: String, default: 'diaData.aciklama' },
        description: { type: String, default: 'customData.customDescription' },
        brand: { type: String, default: 'marka' },
        gtin: { type: String, default: 'anabarkod' },
        condition: { type: String, enum: ['new', 'used', 'refurbished'], default: 'new' },
    },

    shippingEnabled: { type: Boolean, default: true },
    shippingCountry: { type: String, default: 'TR' },
    shippingPrice: { type: Number, default: 0 },
    freeShippingThreshold: { type: Number, default: 0 },

    feedFormat: { type: String, enum: ['xml', 'csv'], default: 'xml' },
    lastGenerated: { type: Date, default: null },
    productCount: { type: Number, default: 0 }

}, {
    timestamps: true,
    collection: 'webmerchantsettings'
});

module.exports = mongoose.model('WebMerchantSettings', webMerchantSettingsSchema);