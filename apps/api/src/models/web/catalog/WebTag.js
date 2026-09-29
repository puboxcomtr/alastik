const mongoose = require('mongoose');
const { SITES, DEFAULT_SITE } = require('../../../config/sites');

const webTagSchema = new mongoose.Schema({
    // Her etiket bir siteye aittir — siteler arası tamamen bağımsız (isim, url, ürünler)
    site: {
        type: String,
        enum: Object.keys(SITES),
        default: DEFAULT_SITE,
        required: true,
        index: true
    },

    title: {
        type: String,
        required: true,
        trim: true
    },

    type: {
        type: String,
        enum: ['general', 'tire_size', 'brand', 'season', 'feature'],
        default: 'general'
    },

    season: {
        type: String,
        enum: ['all', 'summer', 'winter', 'all_season'],
        default: 'all'
    },

    description: {
        type: String,
        trim: true
    },

    seoTitle: {
        type: String,
        trim: true
    },

    seoDescription: {
        type: String,
        trim: true
    },

    // SEO analizi: odak anahtar kelime
    focusKeyword: {
        type: String,
        trim: true
    },

    seoUrl: {
        type: String,
        required: false,
        trim: true,
        lowercase: true
    },

    products: [{
        type: String,
        ref: 'WebProduct'
    }],

    productCount: {
        type: Number,
        default: 0
    },

    isActive: {
        type: Boolean,
        default: true
    },

    order: {
        type: Number,
        default: 999
    }

}, {
    timestamps: true,
    collection: 'webtags'
});

// Index'ler (seoUrl site içinde benzersiz — aynı URL iki sitede ayrı etiket olabilir)
webTagSchema.index({ site: 1, seoUrl: 1 }, { unique: true, partialFilterExpression: { seoUrl: { $type: 'string' } } });
webTagSchema.index({ site: 1, type: 1, isActive: 1 });
webTagSchema.index({ site: 1, isActive: 1, order: 1 });
webTagSchema.index({ title: 'text', description: 'text' });

// SEO URL otomatik oluşturma (Türkçe karakter desteği)
webTagSchema.pre('save', function (next) {
    if (!this.seoUrl && this.title) {
        this.seoUrl = this.title
            .toLowerCase()
            .replace(/ş/g, 's')
            .replace(/ğ/g, 'g')
            .replace(/ü/g, 'u')
            .replace(/ı/g, 'i')
            .replace(/ö/g, 'o')
            .replace(/ç/g, 'c')
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-');
    }
    next();
});

// productCount güncelleme
webTagSchema.pre('save', function (next) {
    this.productCount = this.products ? this.products.length : 0;
    next();
});

module.exports = mongoose.model('WebTag', webTagSchema);