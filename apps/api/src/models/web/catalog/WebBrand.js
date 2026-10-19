const mongoose = require('mongoose');
const { SITES } = require('../../../config/sites');

const siteBrandSettingsSchema = new mongoose.Schema({
    webVisible: { type: Boolean, default: true },
    webOrder: { type: Number, default: 0 },
    showOnHomepage: { type: Boolean, default: false },
    homepageOrder: { type: Number, default: 0 },
    productCount: { type: Number, default: 0 }
}, { _id: false });

const siteSettingsShape = Object.keys(SITES).reduce((acc, slug) => {
    acc[slug] = { type: siteBrandSettingsSchema, default: () => ({}) };
    return acc;
}, {});

const siteBrandContentSchema = new mongoose.Schema({
    displayName: { type: String },
    logoUrl: { type: String },
    logoAlt: { type: String },
    description: { type: String },
    seoTitle: { type: String },
    seoDescription: { type: String },
    seoKeywords: { type: [String], default: undefined }
}, { _id: false });

const siteContentShape = Object.keys(SITES).reduce((acc, slug) => {
    acc[slug] = { type: siteBrandContentSchema, default: () => ({}) };
    return acc;
}, {});

const showcaseProductSchema = new mongoose.Schema({
    productKey: { type: String, required: true },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    addedAt: { type: Date, default: Date.now },
    addedBy: String
}, { _id: false });

const webBrandSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    customName: {
        type: String,
        default: null
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    showOnHomepage: { type: Boolean, default: false },
    homepageOrder: { type: Number, default: 0 },
    diaBrand: {
        type: String,
        required: true,
        unique: true
    },
    diaMarkaAck: String,
    diaKey: String,

    webVisible: {
        type: Boolean,
        default: true,
        index: true
    },
    webOrder: {
        type: Number,
        default: 0,
        index: true
    },
    siteSettings: siteSettingsShape,
    siteContent: siteContentShape,

    seoTitle: String,
    seoDescription: String,
    focusKeyword: String,
    seoUrl: {
        type: String,
        sparse: true,
        unique: true
    },
    seoKeywords: [String],

    customImage: {
        url: String,
        alt: String,
        title: String
    },
    description: String,

    logo: {
        url: String,
        alt: String,
        title: String
    },
    bannerImage: {
        url: String,
        alt: String,
        title: String
    },

    brandInfo: {
        foundedYear: Number,
        country: String,
        website: String,
        about: String
    },

    showcase: [showcaseProductSchema],

    productCount: {
        type: Number,
        default: 0,
        index: true
    },
    activeProductCount: {
        type: Number,
        default: 0
    },
    totalStock: {
        type: Number,
        default: 0
    },
    totalValue: {
        type: Number,
        default: 0
    },

    categoryDistribution: [{
        categoryName: String,
        productCount: Number
    }],

    priceRange: {
        min: { type: Number, default: 0 },
        max: { type: Number, default: 0 },
        average: { type: Number, default: 0 }
    },

    syncInfo: {
        lastSync: {
            type: Date,
            default: Date.now
        },
        syncStatus: {
            type: String,
            enum: ['synced', 'pending', 'error'],
            default: 'synced'
        },
        errorMessage: String,
        lastProductSync: Date,
        syncSource: {
            type: String,
            default: 'diasync'
        },
        lastDiaSync: Date
    }

}, {
    timestamps: true,
    collection: 'webbrands'
});

webBrandSchema.index({ 'name': 1 }, { unique: true });
webBrandSchema.index({ 'slug': 1 }, { unique: true });
webBrandSchema.index({ 'diaBrand': 1 }, { unique: true });
webBrandSchema.index({ 'syncInfo.lastSync': 1 });
webBrandSchema.index({ 'productCount': -1 });
webBrandSchema.index({ 'webVisible': 1, 'productCount': -1 });
Object.keys(SITES).forEach(slug => {
    webBrandSchema.index({ [`siteSettings.${slug}.webVisible`]: 1, 'productCount': -1 });
});
webBrandSchema.index({ 'createdAt': -1 });
webBrandSchema.index({ 'updatedAt': -1 });

webBrandSchema.index({
    'syncInfo.syncStatus': 1,
    'webVisible': 1,
    'productCount': 1
});

webBrandSchema.index({
    'name': 'text',
    'diaBrand': 'text',
    'diaMarkaAck': 'text',
    'seoTitle': 'text',
    'description': 'text'
});

webBrandSchema.virtual('isActive').get(function () {
    return this.syncInfo.syncStatus === 'synced' &&
        this.webVisible === true;
});

webBrandSchema.virtual('hasProducts').get(function () {
    return this.productCount > 0;
});

webBrandSchema.virtual('displayName').get(function () {
    return this.diaMarkaAck || this.name || this.diaBrand;
});

webBrandSchema.pre('save', function (next) {
    if (!this.name && this.diaBrand) {
        this.name = this.diaBrand.toUpperCase();
    }

    if (!this.seoUrl && this.name) {
        this.seoUrl = this.name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-');
    }

    if (!this.slug && this.name) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-');
    }

    next();
});

webBrandSchema.statics.getWebBrands = function (filter = {}) {
    return this.find({
        'syncInfo.syncStatus': 'synced',
        'webVisible': true,
        'productCount': { $gt: 0 },
        ...filter
    });
};

webBrandSchema.statics.findBySeoUrl = function (seoUrl) {
    return this.findOne({
        'seoUrl': seoUrl,
        'webVisible': true,
        'syncInfo.syncStatus': 'synced'
    });
};

webBrandSchema.statics.getActiveBrands = function () {
    return this.find({
        'syncInfo.syncStatus': 'synced',
        'webVisible': true
    });
};

webBrandSchema.statics.searchBrands = function (searchTerm, filter = {}) {
    return this.find({
        $and: [
            {
                $or: [
                    { 'name': { $regex: searchTerm, $options: 'i' } },
                    { 'diaBrand': { $regex: searchTerm, $options: 'i' } },
                    { 'diaMarkaAck': { $regex: searchTerm, $options: 'i' } },
                    { 'seoTitle': { $regex: searchTerm, $options: 'i' } }
                ]
            },
            {
                'syncInfo.syncStatus': 'synced',
                'webVisible': true,
                ...filter
            }
        ]
    });
};
webBrandSchema.statics.syncFromDiaStock = async function () {
    const DiaStock = require('../../plugins/DiaStock');
    const brands = await DiaStock.distinct('marka', {
        durum: 'A',
        marka: { $ne: null, $ne: '' }
    });

    for (const brandName of brands) {
        const stats = await DiaStock.aggregate([
            { $match: { marka: brandName, durum: 'A' } },
            {
                $group: {
                    _id: null,
                    productCount: { $sum: 1 },
                    totalStock: { $sum: '$gercek_stok' },
                    avgPrice: { $avg: '$fiyat3' },
                    minPrice: { $min: '$fiyat3' },
                    maxPrice: { $max: '$fiyat3' }
                }
            }
        ]);

        const stat = stats[0] || {};
        await this.findOneAndUpdate(
            { diaBrand: brandName },
            {
                $set: {
                    name: brandName.toUpperCase(),
                    diaBrand: brandName,
                    productCount: stat.productCount || 0,
                    activeProductCount: stat.productCount || 0,
                    totalStock: stat.totalStock || 0,
                    'priceRange.min': stat.minPrice || 0,
                    'priceRange.max': stat.maxPrice || 0,
                    'priceRange.average': stat.avgPrice || 0,
                    'syncInfo.lastDiaSync': new Date(),
                    'syncInfo.syncStatus': 'synced'
                }
            },
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true
            }
        );
    }
};

module.exports = mongoose.models.WebBrand || mongoose.model('WebBrand', webBrandSchema);