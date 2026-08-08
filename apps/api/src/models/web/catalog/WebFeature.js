const mongoose = require('mongoose');
const { SITES } = require('../../../config/sites');

// Site başına yayınlanmış ürün sayısı — sync hesaplar; 0 ise o sitede listelenmez
// Yönetim alanları (isActive/displayLocation/sıralar) tanımsızsa kök (ortak) değer geçerlidir
const siteFeatureSettingsSchema = new mongoose.Schema({
    productCount: { type: Number, default: 0 },
    isActive: { type: Boolean },
    displayLocation: { type: String, enum: ['product_detail', 'filter', 'both'] },
    featureGroupOrder: { type: Number },
    featureValueOrder: { type: Number }
}, { _id: false });

const siteSettingsShape = Object.keys(SITES).reduce((acc, slug) => {
    acc[slug] = { type: siteFeatureSettingsSchema, default: () => ({}) };
    return acc;
}, {});

const webFeatureSchema = new mongoose.Schema({
    featureName: {
        type: String,
        required: true,
        trim: true
    },
    featureValue: {
        type: String,
        required: true,
        trim: true
    },
    diaFeatureKey: {
        type: String,
        index: true
    },
    displayLocation: {
        type: String,
        enum: ['product_detail', 'filter', 'both'],
        default: 'both'
    },
    featureGroupOrder: {
        type: Number,
        default: 0,
        index: true
    },
    featureValueOrder: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    seoFriendlyName: {
        type: String,
        trim: true,
        lowercase: true
    },

    // İstatistikler
    productCount: {
        type: Number,
        default: 0
    },
    siteSettings: siteSettingsShape,

    // Senkronizasyon Bilgileri
    lastSync: {
        type: Date,
        default: Date.now
    },
    syncSource: {
        type: String,
        default: 'dia_sync'
    }
}, {
    timestamps: true,
    collection: 'webfeatures'
});

// Index'ler
webFeatureSchema.index({ featureName: 1, featureValue: 1 }, { unique: true });
webFeatureSchema.index({ featureName: 1, isActive: 1 });
webFeatureSchema.index({ displayLocation: 1 });

webFeatureSchema.pre('save', function (next) {
    if (!this.seoFriendlyName && this.featureName) {
        this.seoFriendlyName = this.featureName
            .toLowerCase()
            .replace(/ş/g, 's')
            .replace(/ğ/g, 'g')
            .replace(/ü/g, 'u')
            .replace(/ı/g, 'i')
            .replace(/ö/g, 'o')
            .replace(/ç/g, 'c')
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .trim('-');
    }
    next();
});
module.exports = mongoose.model('WebFeature', webFeatureSchema);