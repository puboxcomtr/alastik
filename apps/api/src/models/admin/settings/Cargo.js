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

// Kargo ücretinin gösterim biçimleri
const SHIPPING_PRICE_MODES = ['included', 'excluded'];

// Ücretlendirme tipi: 'rules' = desi / kural bazlı (kargo firması), 'free' = ücretsiz teslimat (ör. kendi aracımızla
// "Standart Sevkiyat"). 'free' tanımda desi / kural alanları kullanılmaz; yalnız hizmet bölgesi (serviceAreas) geçerlidir.
const CARGO_PRICING_TYPES = ['rules', 'free'];

const cargoSchema = new mongoose.Schema({
    // Site bazlı sıra numarası (admin kurallar sayfası adresi /apps/cargo/desi/<cargoNo>) — utils/cargoNo
    cargoNo: { type: Number },
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
    pricingType: { type: String, enum: CARGO_PRICING_TYPES, default: 'rules' },
    // Hizmet bölgesi: BOŞSA her adreste sunulur; doluysa yalnız bu il / ilçelerdeki teslimat adreslerinde.
    // districtId boş = ilin tamamı. Adlar adres eşleştirmesinde kullanılır (DIA adreslerinde il / ilçe ad olarak gelir).
    serviceAreas: {
        type: [{
            _id: false,
            cityId: { type: String, required: true },
            cityName: { type: String, required: true },
            districtId: { type: String, default: '' },
            districtName: { type: String, default: '' }
        }],
        default: []
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
    // XML (tedarikçi) ürünlerinin genel desi tablosu
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
    },
    // ── Stoktaki (DIA) ürünlerin genel ayarları — XML ayarlarından (fixedPrice, freeShipping*, desiPricing) BAĞIMSIZDIR ──
    // Desi tablosu boşken uygulanacak sabit ücret (yalnız desisi olan ürüne)
    stockFixedPrice: { type: Number, default: 0, min: 0 },
    // Ürün fiyatı bu tutarı geçerse stoklu üründe kargo ücretsiz (0 = kapalı)
    stockFreeShippingThreshold: { type: Number, default: 0, min: 0 },
    // Ürün desisi bu değeri geçerse stoklu üründe kargo ücretsiz (0 = kapalı)
    stockFreeShippingDesiLimit: { type: Number, default: 0, min: 0 },
    // Stoklu üründe kargo ücretinin gösterimi: 'included' = ürün fiyatına dahil (tek fiyat),
    // 'excluded' = ürün fiyatından hariç (sepette ve ödeme adımında ayrı "Kargo" satırı). Ödenen toplam aynıdır.
    stockShippingPriceMode: { type: String, enum: SHIPPING_PRICE_MODES, default: 'included' },
    // Kendi stoğumuzdaki (DIA) ürünlerin genel desi tablosu — XML tablosundan bağımsızdır.
    // Boşsa stoklu ürüne genel desi ücreti uygulanmaz (ürün/marka/kategori/ebat kuralları ayrıca geçerlidir).
    stockDesiPricing: {
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
cargoSchema.index({ site: 1, cargoNo: 1 }, { unique: true, partialFilterExpression: { cargoNo: { $type: 'number' } } });

// Yeni tanıma sıradaki numarayı ver
cargoSchema.pre('save', async function (next) {
    if (!this.isNew || typeof this.cargoNo === 'number') return next();
    try {
        const { reserveCargoNos } = require('../../../utils/cargoNo');
        this.cargoNo = await reserveCargoNos(this.site, 1);
        next();
    } catch (error) {
        next(error);
    }
});

module.exports = mongoose.model('Cargo', cargoSchema);
module.exports.SHIPPING_PRICE_MODES = SHIPPING_PRICE_MODES;
module.exports.CARGO_PRICING_TYPES = CARGO_PRICING_TYPES;