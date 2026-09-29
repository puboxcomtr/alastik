const mongoose = require('mongoose');
const { SITE_SLUGS } = require('../../../config/sites');

const seoSettingsSchema = new mongoose.Schema({
    // Anasayfa SEO
    homepage: {
        title: { type: String, default: '' },
        description: { type: String, default: '' },
        keywords: { type: String, default: '' }
    },

    // Kategori SEO Şablonları
    category: {
        titleTemplate: { type: String, default: '{kategori-adi}' },
        descriptionTemplate: { type: String, default: '{kategori-aciklamasi}' },
        keywordsTemplate: { type: String, default: '{kategori-adi}' }
    },

    // Marka SEO Şablonları
    brand: {
        titleTemplate: { type: String, default: '{marka-adi}' },
        descriptionTemplate: { type: String, default: '{marka-aciklamasi}' },
        keywordsTemplate: { type: String, default: '{marka-adi}' }
    },

    // Ürün SEO Şablonları
    product: {
        titleTemplate: { type: String, default: '{urun-adi}' },
        descriptionTemplate: { type: String, default: '{urun-aciklamasi}' },
        keywordsTemplate: { type: String, default: '{urun-adi}, {marka-adi}' }
    },

    // Diğer Sayfalar SEO
    other: {
        newProducts: {
            title: { type: String, default: '' },
            description: { type: String, default: '' }
        },
        discountedProducts: {
            title: { type: String, default: '' },
            description: { type: String, default: '' }
        },
        sponsorProducts: {
            title: { type: String, default: '' },
            description: { type: String, default: '' }
        },
        popularProducts: {
            title: { type: String, default: '' },
            description: { type: String, default: '' }
        },
        packageBuilder: {
            title: { type: String, default: '' },
            description: { type: String, default: '' }
        },
        seoTag: {
            title: { type: String, default: '' },
            description: { type: String, default: '' }
        },
        missedOpportunities: {
            title: { type: String, default: '' },
            description: { type: String, default: '' }
        },
        contact: {
            title: { type: String, default: '' },
            description: { type: String, default: '' }
        },
        blog: {
            title: { type: String, default: '' },
            description: { type: String, default: '' }
        },
        categories: {
            title: { type: String, default: '' },
            description: { type: String, default: '' }
        },
        brands: {
            title: { type: String, default: '' },
            description: { type: String, default: '' }
        },
        news: {
            title: { type: String, default: '' },
            description: { type: String, default: '' }
        },
        cart: {
            title: { type: String, default: '' },
            description: { type: String, default: '' }
        },
        productSearch: {
            title: { type: String, default: '' },
            description: { type: String, default: '' }
        },
        register: {
            title: { type: String, default: '' },
            description: { type: String, default: '' }
        },
        login: {
            title: { type: String, default: '' },
            description: { type: String, default: '' }
        },
        forgotPassword: {
            title: { type: String, default: '' },
            description: { type: String, default: '' }
        },
        orderTracking: {
            title: { type: String, default: '' },
            description: { type: String, default: '' }
        }
    },

    // İçerik SEO analizi eşikleri (SEO > Ayarlar) — kriter motoru bunları okur
    analysis: {
        titleMin: { type: Number, default: 30 },
        titleMax: { type: Number, default: 60 },
        descriptionMin: { type: Number, default: 70 },
        descriptionMax: { type: Number, default: 160 },
        densityMin: { type: Number, default: 0.5 },
        densityMax: { type: Number, default: 2.5 },
        minWords: {
            blog: { type: Number, default: 600 },
            page: { type: Number, default: 300 },
            product: { type: Number, default: 150 },
            category: { type: Number, default: 100 },
            brand: { type: Number, default: 100 },
            tag: { type: Number, default: 100 }
        },
        goodScore: { type: Number, default: 80 },
        fairScore: { type: Number, default: 50 }
    },

    site: {
        type: String,
        required: true,
        enum: SITE_SLUGS,
        default: 'alastik',
        index: true
    }

}, {
    timestamps: true,
    collection: 'seosettings'
});

module.exports = mongoose.model('SeoSettings', seoSettingsSchema);