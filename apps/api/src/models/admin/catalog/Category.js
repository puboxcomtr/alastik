const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Kategori adı gereklidir'],
    trim: true,
    maxlength: [100, 'Kategori adı 100 karakterden fazla olamaz']
  },
  
  slug: {
    type: String,
    required: [true, 'Slug gereklidir'],
    unique: true,
    trim: true,
    lowercase: true
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Açıklama 1000 karakterden fazla olamaz']
  },
  
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  
  level: {
    type: Number,
    default: 1,
    min: [1, 'Seviye 1\'den az olamaz'],
    max: [5, 'Seviye 5\'ten fazla olamaz']
  },
  
  image: {
    url: String,
    alt: String
  },
  
  icon: String,
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  sortOrder: {
    type: Number,
    default: 0
  },
  
  productCount: {
    type: Number,
    default: 0,
    min: [0, 'Ürün sayısı negatif olamaz']
  },
  
  seo: {
    title: String,
    description: String,
    keywords: [String]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

CategorySchema.index({ parent: 1, level: 1 });
CategorySchema.index({ isActive: 1, sortOrder: 1 });

CategorySchema.virtual('children', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parent'
});

CategorySchema.virtual('fullPath').get(function() {
  const path = [this.name];
  let current = this.parent;
  
  while (current) {
    path.unshift(current.name);
    current = current.parent;
  }
  
  return path.join(' > ');
});

CategorySchema.statics.findByLevel = function(level) {
  return this.find({ level: level, isActive: true });
};

CategorySchema.statics.findRootCategories = function() {
  return this.find({ parent: null, isActive: true }).sort({ sortOrder: 1 });
};

CategorySchema.statics.buildTree = function() {
  return this.find({ isActive: true })
    .populate('children')
    .sort({ sortOrder: 1 });
};

module.exports = mongoose.model('Category', CategorySchema); 