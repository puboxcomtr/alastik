const mongoose = require('mongoose');

// DIA Birim Schema
const diaUnitSchema = new mongoose.Schema({
    _key: String,
    _key_scf_stokkart: String,
    _key_sis_doviz1: String,
    _key_sis_doviz2: String,
    _key_sis_doviz3: String,
    _key_sis_doviz4: String,
    _key_sis_doviz10: String,
    birimadi: String,
    birimkod: String,
    carpan: Number,
    fiyat1: Number,
    fiyat2: Number,
    fiyat3: Number,
    fiyat4: Number,
    fiyat10: Number,
    kdvdurumu1: String,
    kdvdurumu2: String,
    kdvdurumu3: String,
    kdvdurumu4: String,
    kdvdurumu10: String,
    miktar: Number,
    oranlama: String
}, { _id: false });

// DIA Kategori Schema
const diaCategorySchema = new mongoose.Schema({
    _key: String,
    _key_scf_stokkart: String,
    _key_scf_malzeme_kategori_1: String,
    _key_scf_malzeme_kategori_2: String,
    _key_scf_malzeme_kategori_3: String,
    _key_scf_malzeme_kategori_4: String,
    _key_scf_malzeme_kategori_5: String,
    _key_scf_malzeme_kategori_6: String,
    kategori_aciklama_1: String,
    kategori_aciklama_2: String,
    kategori_aciklama_3: String,
    kategori_aciklama_4: String,
    kategori_aciklama_5: String,
    kategori_aciklama_6: String,
    kategori_durum_1: String,
    kategori_durum_2: String,
    kategori_durum_3: String,
    kategori_durum_4: String,
    kategori_durum_5: String,
    kategori_durum_6: String
}, { _id: false });

// DIA Resim Schema
const diaImageSchema = new mongoose.Schema({
    _key: String,
    _key_kayit: String,
    aws_url: String,
    content_type: String,
    is_aws: String,
    kayitturu: String,
    localdata: String,
    order_id: String,
    varyantlar: String,
    yukleyen: String
}, { _id: false });

// DIA Ürün Özellik Schema
const diaProductFeatureSchema = new mongoose.Schema({
    _key: String,
    _key_scf_stokkart: String,
    _key_scf_urun_ozellik: String,
    _key_scf_urun_ozellik_kalemi: String,
    _key_scf_urun_ozellik_kalemi_detayi: String,
    detayaciklama: String,
    ozellikadi: String,
    ozellisirano: String
}, { _id: false });

// DIA Veri Schema
const diaDataSchema = new mongoose.Schema({
    // Key alanları
    _key_scf_karebarkod: String,
    _key_scf_marka: String,
    _key_scf_odeme_plani: String,
    _key_scf_urun_ozellik: String,
    _key_sis_ozelkod1: String,
    _key_sis_ozelkod2: String,
    _key_sis_ozelkod3: String,
    _key_sis_ozelkod4: String,
    _key_sis_ozelkod5: String,
    _key_sis_ozelkod6: String,
    _key_sis_ozelkod7: String,
    _key_sis_ozelkod8: String,
    _key_sis_ozelkod9: String,
    _key_sis_ozelkod10: String,
    _key_sis_ozelkod11: String,
    _key_sis_resim: String,

    // Temel bilgiler
    aciklama: String,
    anabarkod: String,
    barkodu: String,
    durum: { type: String, default: 'A' },

    // Ek alanlar
    ekalan1: String,
    ekalan2: String,
    ekalan3: String,
    ekalan4: String,
    ekalan5: String,
    ekalan6: String,
    ekalan7: String,
    ekalan8: String,
    ekalan9: String,
    ekalan10: String,

    // Stok bilgileri
    gercek_stok: { type: Number, default: 0 },

    // Marka ve menşei
    marka: String,
    menseiulkeadi: String,

    // Özel kodlar
    ozelkod1: String,
    ozelkod1kodu: String,
    ozelkod2: String,
    ozelkod2kodu: String,
    ozelkod3: String,
    ozelkod3kodu: String,
    ozelkod4: String,
    ozelkod4kodu: String,
    ozelkod5: String,
    ozelkod5kodu: String,
    ozelkod6: String,
    ozelkod6kodu: String,
    ozelkod7: String,
    ozelkod7kodu: String,
    ozelkod8: String,
    ozelkod8kodu: String,
    ozelkod9: String,
    ozelkod9kodu: String,
    ozelkod10: String,
    ozelkod10kodu: String,
    ozelkod11: String,
    ozelkod11kodu: String,

    // Stok kart kodu
    stokkartkodu: { type: String, required: true },

    // Senkronizasyon durumu
    synced: { type: String, default: 'synced' },

    // Alt veriler
    m_birimler: [diaUnitSchema],
    m_kategoriler: [diaCategorySchema],
    m_resimler: [diaImageSchema],
    m_urunOzellikleri: [diaProductFeatureSchema]
}, { _id: false });

// Özel Görsel Schema
const customImageSchema = new mongoose.Schema({
    order: { type: Number, required: true },
    url: { type: String, required: true },
    alt: String,
    title: String
}, { _id: false });

// Özel Veri Schema
const customDataSchema = new mongoose.Schema({
    // SEO Bilgileri
    seoTitle: String,
    seoDescription: String,
    seoUrl: { type: String, sparse: true },
    seoKeywords: [String],

    // Web Görünüm
    webOrder: { type: Number, default: 0 },
    webVisible: { type: Boolean, default: true },

    // Kargo Süresi
    delivery: {
        type: String,
        enum: ['same_day', 'next_day', 'next_week'],
        default: 'same_day'
    },

    // İçerik
    customDescription: String,
    shortDescription: String,

    // Etiketler ve kategoriler
    webTags: [String],
    webCategory: String,
    webSubCategory: String,

    // Görseller
    customImages: [customImageSchema],
    featuredImage: String,

    // Fiyatlandırma
    webPrice: Number,
    originalPrice: Number,
    webDiscount: { type: Number, default: 0 },
    discountType: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },

    // Stok ve satış bilgileri
    minOrderQuantity: { type: Number, default: 1 },
    maxOrderQuantity: Number,
    stockAlert: { type: Number, default: 5 },

    // Meta bilgiler
    isNew: { type: Boolean, default: false },
    isBestSeller: { type: Boolean, default: false },
    reviewStats: {
        averageRating: { type: Number, default: 0 },
        reviewCount: { type: Number, default: 0 }
    }
}, { _id: false });
// Pricing Data Schema (XML kaynaklı Ürünler )
const pricingDataSchema = new mongoose.Schema({
    hamFiyat: Number,
    alastikPrice: Number,
    b2bPrice: Number,
    b2cPrice: Number,
    lastPricingAt: Date
}, { _id: false });
// Senkronizasyon Bilgi Schema
const syncInfoSchema = new mongoose.Schema({
    lastDiaSync: { type: Date, default: Date.now },
    diaStatus: {
        type: String,
        enum: ['synced', 'pending_sync', 'not_in_dia', 'error'],
        default: 'synced'
    },
    webStatus: {
        type: String,
        enum: ['active', 'draft', 'hidden', 'archived'],
        default: 'draft'
    },
    syncErrors: [String],
    lastWebUpdate: Date,
    syncSource: { type: String, default: 'dia_api' },
    xmlSource: { type: String, default: null },
    lastXmlSync: { type: Date, default: null }
}, { _id: false });

// Ana WebProduct Schema
const webProductSchema = new mongoose.Schema({
    _key: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    // DIA Verileri
    diaData: diaDataSchema,

    // Özel Veriler
    customData: customDataSchema,

    // Senkronizasyon Bilgileri
    syncInfo: syncInfoSchema,

    // Pricing Data (XML kaynaklı ürünler için hesaplanmış fiyatlar)
    pricingData: pricingDataSchema

}, {
    timestamps: true, // createdAt ve updatedAt otomatik ekler
    collection: 'webproducts'
});

// Index'ler
webProductSchema.index({ '_key': 1 }, { unique: true });
webProductSchema.index({ 'customData.seoUrl': 1 }, { unique: true, sparse: true });
webProductSchema.index({ 'diaData.stokkartkodu': 1 });
webProductSchema.index({ 'diaData.marka': 1 });
webProductSchema.index({ 'diaData.durum': 1 });
webProductSchema.index({ 'diaData.gercek_stok': 1 });
webProductSchema.index({ 'syncInfo.diaStatus': 1, 'customData.webVisible': 1 });
webProductSchema.index({ 'customData.webCategory': 1, 'customData.webVisible': 1 });
webProductSchema.index({ 'customData.webTags': 1 });
webProductSchema.index({ 'syncInfo.webStatus': 1 });
webProductSchema.index({ 'createdAt': -1 });
webProductSchema.index({ 'updatedAt': -1 });

// Compound index'ler
webProductSchema.index({
    'syncInfo.diaStatus': 1,
    'customData.webVisible': 1,
    'diaData.durum': 1,
    'diaData.gercek_stok': 1
});

// Text search için
webProductSchema.index({
    'diaData.aciklama': 'text',
    'diaData.stokkartkodu': 'text',
    'diaData.marka': 'text',
    'customData.seoTitle': 'text',
    'customData.customDescription': 'text'
});

// Virtual'lar
webProductSchema.virtual('isActive').get(function () {
    return this.syncInfo.diaStatus === 'synced' &&
        this.customData.webVisible === true &&
        this.diaData.durum === 'A';
});

webProductSchema.virtual('hasStock').get(function () {
    return this.diaData.gercek_stok > 0;
});

webProductSchema.virtual('displayPrice').get(function () {
    return this.customData.webPrice ||
        (this.diaData.m_birimler && this.diaData.m_birimler[0] && this.diaData.m_birimler[0].fiyat1) ||
        0;
});

// Middleware
webProductSchema.pre('save', function (next) {
    // SEO URL otomatik oluştur
    if (!this.customData.seoUrl && this.diaData.aciklama) {
        this.customData.seoUrl = this.diaData.aciklama
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-');
    }
    next();
});

// Static metodlar
webProductSchema.statics.getWebProducts = function (filter = {}) {
    return this.find({
        'syncInfo.diaStatus': 'synced',
        'customData.webVisible': true,
        'diaData.durum': 'A',
        'diaData.gercek_stok': { $gt: 0 },
        ...filter
    });
};

webProductSchema.statics.findBySeoUrl = function (seoUrl) {
    return this.findOne({
        'customData.seoUrl': seoUrl,
        'customData.webVisible': true,
        'syncInfo.diaStatus': 'synced'
    });
};

webProductSchema.statics.getActiveProducts = function () {
    return this.find({
        'syncInfo.diaStatus': 'synced',
        'diaData.durum': 'A'
    });
};

webProductSchema.statics.searchProducts = function (searchTerm, filter = {}) {
    return this.find({
        $and: [
            {
                $or: [
                    { 'diaData.aciklama': { $regex: searchTerm, $options: 'i' } },
                    { 'diaData.stokkartkodu': { $regex: searchTerm, $options: 'i' } },
                    { 'diaData.marka': { $regex: searchTerm, $options: 'i' } },
                    { 'customData.seoTitle': { $regex: searchTerm, $options: 'i' } }
                ]
            },
            {
                'syncInfo.diaStatus': 'synced',
                'customData.webVisible': true,
                'diaData.durum': 'A',
                ...filter
            }
        ]
    });
};

module.exports = mongoose.model('WebProduct', webProductSchema);