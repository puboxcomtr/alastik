const mongoose = require('mongoose');
const { SITES, DEFAULT_SITE } = require('../../../config/sites');

// Desi aralığı alt şeması (genel tablo ve kapsam kuralları ortak)
const desiRangeSchema = {
    min: { type: Number, required: true, min: 0 },
    max: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 }
};

/**
 * Kapsam kuralı (kategori / marka başına): pricingMode 'all' = desi tablosu, 'size' = ebat başına ücret.
 */
function scopedRuleSchema(idField, nameField, refModel, withDiaBrand = false) {
    const def = {
        [idField]: { type: mongoose.Schema.Types.ObjectId, ref: refModel, required: true },
        [nameField]: { type: String, default: '' },
        fixedPrice: { type: Number, default: 0, min: 0 },
        pricingMode: { type: String, enum: ['all', 'size'], default: 'all' },
        sizeRules: {
            type: [{
                size: { type: String, required: true, trim: true },
                price: { type: Number, required: true, min: 0 }
            }],
            default: []
        },
        desiPricing: {
            ranges: { type: [desiRangeSchema], default: [] },
            extraPerDesi: { type: Number, default: 0, min: 0 }
        }
    };
    if (withDiaBrand) def.diaBrand = { type: String, default: '' };
    return def;
}

const cargoSchema = new mongoose.Schema({
    // Her site için ayrı kargo tanımı (site + code benzersiz)
    site: {
        type: String,
        enum: Object.keys(SITES),
        default: DEFAULT_SITE,
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    code: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    logo: {
        type: String,
        default: ''
    },
    isActive: {
        type: Boolean,
        default: true
    },
    webOrder: {
        type: Number,
        default: 0
    },
    memberGroups: {
        type: [String],
        enum: ['member', 'guest', 'all'],
        default: []
    },
    // Ürün tipi: stoklu (DIA) ya da XML tedarikçi ürünleri
    productType: {
        type: String,
        enum: ['dia_api', 'xml_integration'],
        default: 'dia_api'
    },
    // Panelde son düzenlenen kural grubu (yalnız arayüz hatırlatması). Kural grupları BİRLİKTE geçerlidir:
    // desiPricing (tüm ürünler), categoryRules, brandRules, productRules, sizeRules — öncelik hesaplamada çözülür.
    scopeType: {
        type: String,
        enum: ['', 'category', 'brand', 'product', 'size'],
        default: ''
    },
    // Ebat bazlı kurallar (tüm ürünler): ebat başına adet ücreti
    sizeRules: {
        type: [{
            size: { type: String, required: true, trim: true },
            price: { type: Number, required: true, min: 0 }
        }],
        default: []
    },
    // Kategori bazlı kurallar (scopeType = category): seçili sitenin WebCategory kaydı başına ayrı kural
    categoryRules: {
        type: [scopedRuleSchema('categoryId', 'categoryName', 'WebCategory')],
        default: []
    },
    // Marka bazlı kurallar (scopeType = brand): WebBrand başına ayrı kural; ürün eşleşmesi diaBrand ↔ diaData.marka
    brandRules: {
        type: [scopedRuleSchema('brandId', 'brandName', 'WebBrand', true)],
        default: []
    },
    // Ürün bazlı kurallar (scopeType = product): stok kartı başına adet ücreti
    productRules: {
        type: [{
            productKey: { type: String, required: true, trim: true },
            stockCode: { type: String, default: '' },
            productName: { type: String, default: '' },
            price: { type: Number, required: true, min: 0 },
        }],
        default: []
    },
    paymentType: {
        type: String,
        enum: ['sender', 'receiver'],
        default: 'sender'
    },
    fixedPrice: {
        type: Number,
        default: 0,
        min: 0
    },
    freeShippingThreshold: {
        type: Number,
        default: 0,
        min: 0
    },
    freeShippingDesiLimit: {
        type: Number,
        default: 0,
        min: 0
    },
    desiPricing: {
        ranges: {
            type: [{
                min: { type: Number, required: true, min: 0 },
                max: { type: Number, required: true, min: 0 },
                price: { type: Number, required: true, min: 0 }
            }],
            default: []
        },
        extraPerDesi: {
            type: Number,
            default: 0,
            min: 0
        }
    }
}, {
    timestamps: true,
    collection: 'webcargo'
});

cargoSchema.index({ site: 1, code: 1 }, { unique: true });
cargoSchema.index({ isActive: 1, webOrder: -1 });

module.exports = mongoose.model('Cargo', cargoSchema);