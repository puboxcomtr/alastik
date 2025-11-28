const mongoose = require('mongoose');

const webTagSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
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

    seoUrl: {
        type: String,
        required: false,
        unique: true,
        sparse: true,
        trim: true,
        lowercase: true,
        index: true
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
        default: 0
    }

}, {
    timestamps: true,
    collection: 'webtags'
});

// Index'ler
webTagSchema.index({ seoUrl: 1 }, { unique: true });
webTagSchema.index({ isActive: 1, order: 1 });
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
    this.productCount = this.products.length;
    next();
});

module.exports = mongoose.model('WebTag', webTagSchema);