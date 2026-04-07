// models/WebBrand.js
const mongoose = require('mongoose');

// Showcase Ürün Schema (Vitrin için)
const showcaseProductSchema = new mongoose.Schema({
    productKey: { type: String, required: true },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    addedAt: { type: Date, default: Date.now },
    addedBy: String
}, { _id: false });

// Ana WebBrand Schema
const webBrandSchema = new mongoose.Schema({
    // Temel Bilgiler
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
    }, // DIA'daki "marka" field'ı (örn: "KONAK")
    diaMarkaAck: String, // DIA'daki "markaack" field'ı (örn: "Konak")
    diaKey: String, // DIA'dan gelen _key_scf_marka

    // Web Yönetimi
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

    // SEO Bilgileri
    seoTitle: String,
    seoDescription: String,
    seoUrl: {
        type: String,
        sparse: true,
        unique: true
    },
    seoKeywords: [String],

    // Görsel ve İçerik
    customImage: {
        url: String,
        alt: String,
        title: String
    },
    description: String, // Marka detay açıklaması

    // Logo ve Marka Görselleri
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

    // Marka Bilgileri
    brandInfo: {
        foundedYear: Number,
        country: String,
        website: String,
        about: String
    },

    // Showcase (Vitrin Ürünleri)
    showcase: [showcaseProductSchema],

    // İstatistikler (DiaStock'tan hesaplanacak)
    productCount: {
        type: Number,
        default: 0,
        index: true
    },
    activeProductCount: {
        type: Number,
        default: 0
    }, // durum: 'A' olan ürün sayısı
    totalStock: {
        type: Number,
        default: 0
    }, // gercek_stok toplamı
    totalValue: {
        type: Number,
        default: 0
    }, // Toplam stok değeri

    // Kategori Dağılımı
    categoryDistribution: [{
        categoryName: String,
        productCount: Number
    }],

    // Fiyat Aralığı
    priceRange: {
        min: { type: Number, default: 0 },
        max: { type: Number, default: 0 },
        average: { type: Number, default: 0 }
    },

    // Senkronizasyon Bilgileri
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
        lastProductSync: Date, // Son ürün sayısı güncellemesi
        syncSource: {
            type: String,
            default: 'diasync'
        },
        lastDiaSync: Date // Son DIA senkronizasyonu
    }

}, {
    timestamps: true,
    collection: 'webbrands'
});

// Index'ler
webBrandSchema.index({ 'name': 1 }, { unique: true });
webBrandSchema.index({ 'slug': 1 }, { unique: true });
webBrandSchema.index({ 'diaBrand': 1 }, { unique: true });
webBrandSchema.index({ 'syncInfo.lastSync': 1 });
webBrandSchema.index({ 'productCount': -1 });
webBrandSchema.index({ 'webVisible': 1, 'productCount': -1 });
webBrandSchema.index({ 'createdAt': -1 });
webBrandSchema.index({ 'updatedAt': -1 });

// Compound index'ler
webBrandSchema.index({
    'syncInfo.syncStatus': 1,
    'webVisible': 1,
    'productCount': 1
});

// Text search için
webBrandSchema.index({
    'name': 'text',
    'diaBrand': 'text',
    'diaMarkaAck': 'text',
    'seoTitle': 'text',
    'description': 'text'
});

// Virtual'lar
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

// Middleware
webBrandSchema.pre('save', function (next) {
    // Name'i diaBrand'den oluştur (büyük harflerle)
    if (!this.name && this.diaBrand) {
        this.name = this.diaBrand.toUpperCase();
    }

    // SEO URL otomatik oluştur
    if (!this.seoUrl && this.name) {
        this.seoUrl = this.name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-');
    }

    // Slug otomatik oluştur
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

// Static metodlar
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