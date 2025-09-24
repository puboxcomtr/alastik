// models/WebCategory.js
const mongoose = require('mongoose');

// Showcase Ürün Schema (Vitrin için)
const showcaseProductSchema = new mongoose.Schema({
  productKey: { type: String, required: true }, // WebProduct _key referansı
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  addedAt: { type: Date, default: Date.now },
  addedBy: String // Admin kullanıcı adı
}, { _id: false });

// Ana WebCategory Schema
const webCategorySchema = new mongoose.Schema({
  // Temel Bilgiler
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

  // Hiyerarşi Bilgileri
  level: {
    type: Number,
    required: true,
    enum: [1, 2, 3], // 1: Ana, 2: Alt, 3: Alt-Alt
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
  }], // Tüm üst kategoriler

  // DIA Bağlantısı
  diaCategory: {
    type: String,
    required: true
  }, // DIA'daki orijinal kategori adı
  diaLevel: {
    type: String,
    required: true,
    enum: ['kategori_aciklama_1', 'kategori_aciklama_2', 'kategori_aciklama_3']
  },
  diaKey: String, // DIA'dan gelen _key varsa

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
  detail: String, // Kategori detay açıklaması

  // Showcase (Vitrin Ürünleri)
  showcase: [showcaseProductSchema],

  // İstatistikler
  productCount: {
    type: Number,
    default: 0,
    index: true
  },
  activeProductCount: {
    type: Number,
    default: 0
  }, // Aktif ürün sayısı
  totalStock: {
    type: Number,
    default: 0
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
    }
  }

}, {
  timestamps: true,
  collection: 'webcategories'
});

// Index'ler
webCategorySchema.index({ level: 1, webVisible: 1, webOrder: 1 });
webCategorySchema.index({ parent: 1, level: 1, webOrder: 1 });
webCategorySchema.index({ slug: 1 }, { unique: true });
webCategorySchema.index({ diaCategory: 1, diaLevel: 1 });
webCategorySchema.index({ 'syncInfo.lastSync': 1 });
webCategorySchema.index({ productCount: -1 });
webCategorySchema.index({ webVisible: 1, productCount: -1 });

module.exports = mongoose.model('WebCategory', webCategorySchema);