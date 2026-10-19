const mongoose = require('mongoose');
const { SITES, DEFAULT_SITE } = require('../../../config/sites');

const pickItemSchema = new mongoose.Schema({
    id: { type: String, required: true },
    name: { type: String, default: '' },
    xmlName: { type: String, default: '' }
}, { _id: false });

const sourceFilterSchema = new mongoose.Schema({
    enabled: { type: Boolean, default: true },
    mode: {
        type: String,
        enum: ['all', 'category', 'product', 'custom'],
        default: 'all'
    },
    categories: { type: [pickItemSchema], default: [] },
    products: { type: [pickItemSchema], default: [] }
}, { _id: false });

const webAkakceSettingsSchema = new mongoose.Schema({
    site: {
        type: String,
        enum: Object.keys(SITES),
        default: DEFAULT_SITE,
        required: true,
        unique: true,
        index: true
    },

    isActive: { type: Boolean, default: true },

    priceField: { type: String, default: 'fiyat4' },
    includeTax: { type: Boolean, default: true },
    taxRate: { type: Number, default: 20 },

    productSources: {
        stock: { type: sourceFilterSchema, default: () => ({ enabled: true, mode: 'all' }) },
        xml: { type: sourceFilterSchema, default: () => ({ enabled: false, mode: 'all' }) }
    },

    onlyInStock: { type: Boolean, default: true },
    minPrice: { type: Number, default: 0 },
    minStock: { type: Number, default: 1 },

    imageSource: {
        type: String,
        enum: ['custom_first', 'dia_first'],
        default: 'custom_first'
    },
    includeAdditionalImages: { type: Boolean, default: true },

    fieldMapping: {
        sku: { type: String, default: 'diaData.stokkartkodu' },
        name: { type: String, default: 'diaData.aciklama' },
        description: { type: String, default: 'customData.customDescription' },
        brand: { type: String, default: 'diaData.marka' },
        barcode: { type: String, default: 'diaData.anabarkod' },
        quantity: { type: String, default: 'auto' },
        category: { type: String, default: 'auto' }
    },

    shippingPrice: { type: Number, default: 0 },
    freeShippingThreshold: { type: Number, default: 0 },
    dayOfDelivery: { type: Number, default: 3 },
    expressDeliveryTime: { type: String, default: '' },
    localDelivery: { type: String, default: '' },

    distributor: { type: Boolean, default: false },
    campaignCode: { type: String, default: '' },

    lastGenerated: { type: Date, default: null },
    productCount: { type: Number, default: 0 }

}, {
    timestamps: true,
    collection: 'webakakcesettings'
});

module.exports = mongoose.model('WebAkakceSettings', webAkakceSettingsSchema);
