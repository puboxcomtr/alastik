const mongoose = require('mongoose');

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
  description: {
    type: String,
    default: null
  },
  seoTitle: String,
  seoDescription: String,
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
webCategorySchema.index({ parent: 1, level: 1, webOrder: 1 });
webCategorySchema.index({ slug: 1 }, { unique: true });
webCategorySchema.index({ diaCategory: 1, diaLevel: 1 });
webCategorySchema.index({ 'syncInfo.lastSync': 1 });
webCategorySchema.index({ productCount: -1 });
webCategorySchema.index({ webVisible: 1, productCount: -1 });

module.exports = mongoose.model('WebCategory', webCategorySchema);