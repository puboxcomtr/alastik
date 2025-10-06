const mongoose = require('mongoose');

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