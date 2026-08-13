const mongoose = require('mongoose');
const { SITES } = require('../../../config/sites');

// Site başına görünürlük/sıralama ayarları (siteSettings.<slug>)
const siteCategorySettingsSchema = new mongoose.Schema({
  webVisible: { type: Boolean, default: true },
  webOrder: { type: Number, default: 0 },
  // Sitede yayınlanmış ürün sayısı — sync hesaplar; 0 ise vitrin ve admin listesi kategoriyi göstermez
  productCount: { type: Number, default: 0 }
}, { _id: false });

const siteSettingsShape = Object.keys(SITES).reduce((acc, slug) => {
  acc[slug] = { type: siteCategorySettingsSchema, default: () => ({}) };
  return acc;
}, {});

const showcaseProductSchema = new mongoose.Schema({
  productKey: { type: String, required: true },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  addedAt: { type: Date, default: Date.now },
  addedBy: String
}, { _id: false });

const webCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },

  level: {
    type: Number,
    required: true,
    enum: [1, 2, 3],
    index: true
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WebCategory',
    default: null
  },
  parentPath: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WebCategory'
  }],

  diaCategory: {
    type: String,
    required: true
  },
  diaLevel: {
    type: String,
    required: true,
    enum: ['kategori_aciklama_1', 'kategori_aciklama_2', 'kategori_aciklama_3']
  },
  diaKey: String,
  ozelkod7kodu: {
    type: String,
    enum: ['JANT', 'LASTİK'],
    default: 'LASTİK'
  },
  // Eski ortak alanlar — geriye dönük uyumluluk için tutuluyor; okuma/yazma artık siteSettings üzerinden
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
  description: {
    type: String,
    default: null
  },
  seoTitle: String,
  seoDescription: String,
  // Site başına içerik/SEO alanları — description/sliderId/seoKeywords tanımsızsa ortak alanlar geçerlidir
  siteContent: Object.keys(SITES).reduce((acc, slug) => {
    acc[slug] = {
      content: { type: String, default: '' },
      seoTitle: { type: String, default: '' },
      seoDescription: { type: String, default: '' },
      description: { type: String },
      seoKeywords: { type: [String], default: undefined },
      sliderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Slider' },
      // Kategori sayfasında gösterilecek menüler (boş bırakılabilir, birden fazla olabilir)
      menuIds: { type: [mongoose.Schema.Types.ObjectId], ref: 'Menu', default: undefined },
      // Eski tek menü alanı — geriye dönük uyumluluk için korunur
      menuId: { type: mongoose.Schema.Types.ObjectId, ref: 'Menu' },
      // Fiyat gösterimi: dahil = kayıtlı fiyat, haric = KDV çıkarılıp "+ KDV" ibaresiyle
      priceDisplay: { type: String, enum: ['dahil', 'haric'], default: 'dahil' },
      // "haric" seçiliyken kullanılacak KDV oranı (%)
      vatRate: { type: Number, default: 20 },
      // Açıkken bu kategorideki ürünlerde stok kodu gösterilmez
      hideStockCode: { type: Boolean, default: false }
    };
    return acc;
  }, {}),
  seoUrl: {
    type: String,
    sparse: true,
    unique: true
  },
  seoKeywords: [String],
  sliderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Slider',
    default: null
  },
  detail: String,
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
    }
  }

}, {
  timestamps: true,
  collection: 'webcategories'
});

webCategorySchema.index({ level: 1, webVisible: 1, webOrder: 1 });
Object.keys(SITES).forEach(slug => {
  webCategorySchema.index({ [`siteSettings.${slug}.webVisible`]: 1, [`siteSettings.${slug}.webOrder`]: 1 });
});
webCategorySchema.index({ parent: 1, level: 1, webOrder: 1 });
webCategorySchema.index({ slug: 1 }, { unique: true });
webCategorySchema.index({ diaCategory: 1, diaLevel: 1 });
webCategorySchema.index({ 'syncInfo.lastSync': 1 });
webCategorySchema.index({ productCount: -1 });
webCategorySchema.index({ webVisible: 1, productCount: -1 });

module.exports = mongoose.model('WebCategory', webCategorySchema);