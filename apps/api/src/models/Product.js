const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  // Temel bilgiler
  name: {
    type: String,
    required: [true, 'Ürün adı gereklidir'],
    trim: true,
    maxlength: [200, 'Ürün adı 200 karakterden fazla olamaz']
  },
  
  sku: {
    type: String,
    required: [true, 'SKU gereklidir'],
    unique: true,
    trim: true,
    uppercase: true
  },
  
  brand: {
    type: String,
    required: [true, 'Marka gereklidir'],
    trim: true
  },
  
  category: {
    type: String,
    required: [true, 'Kategori gereklidir'],
    trim: true
  },
  
  // Fiyat bilgileri
  price: {
    type: Number,
    required: [true, 'Fiyat gereklidir'],
    min: [0, 'Fiyat negatif olamaz']
  },
  
  originalPrice: {
    type: Number,
    min: [0, 'Orijinal fiyat negatif olamaz']
  },
  
  discountPercentage: {
    type: Number,
    min: [0, 'İndirim oranı negatif olamaz'],
    max: [100, 'İndirim oranı 100\'den fazla olamaz']
  },
  
  // Stok bilgileri
  stock: {
    type: Number,
    required: [true, 'Stok miktarı gereklidir'],
    min: [0, 'Stok miktarı negatif olamaz'],
    default: 0
  },
  
  minStockLevel: {
    type: Number,
    default: 5,
    min: [0, 'Minimum stok seviyesi negatif olamaz']
  },
  
  stockStatus: {
    type: String,
    enum: ['in_stock', 'low_stock', 'out_of_stock', 'discontinued'],
    default: 'in_stock'
  },
  
  // Lastik spesifikasyonları
  specifications: {
    // Lastik ebatı (örn: 205/55R16)
    size: {
      type: String,
      required: [true, 'Lastik ebatı gereklidir'],
      trim: true
    },
    
    // Genişlik (mm)
    width: {
      type: Number,
      required: [true, 'Lastik genişliği gereklidir'],
      min: [125, 'Geçersiz lastik genişliği']
    },
    
    // Yanak yüksekliği (%)
    aspectRatio: {
      type: Number,
      required: [true, 'Yanak yüksekliği gereklidir'],
      min: [25, 'Geçersiz yanak yüksekliği']
    },
    
    // Jant çapı (inç)
    rimDiameter: {
      type: Number,
      required: [true, 'Jant çapı gereklidir'],
      min: [12, 'Geçersiz jant çapı']
    },
    
    // Mevsim
    season: {
      type: String,
      required: [true, 'Mevsim bilgisi gereklidir'],
      enum: ['yaz', 'kis', '4mevsim']
    },
    
    // Yük endeksi
    loadIndex: {
      type: String,
      required: [true, 'Yük endeksi gereklidir'],
      trim: true
    },
    
    // Hız endeksi
    speedIndex: {
      type: String,
      required: [true, 'Hız endeksi gereklidir'],
      trim: true,
      uppercase: true
    },
    
    // Araç tipi
    vehicleType: {
      type: String,
      required: [true, 'Araç tipi gereklidir'],
      enum: ['otomobil', 'suv', 'kamyonet', 'kamyon', 'motosiklet']
    },
    
    // Fuel efficiency (A-G)
    fuelEfficiency: {
      type: String,
      enum: ['A', 'B', 'C', 'D', 'E', 'F', 'G']
    },
    
    // Wet grip (A-G)
    wetGrip: {
      type: String,
      enum: ['A', 'B', 'C', 'D', 'E', 'F', 'G']
    },
    
    // Noise level (dB)
    noiseLevel: {
      type: Number,
      min: [60, 'Geçersiz gürültü seviyesi'],
      max: [80, 'Geçersiz gürültü seviyesi']
    },
    
    // Runflat özelliği
    runflat: {
      type: Boolean,
      default: false
    },
    
    // Reinforced (XL) özelliği
    reinforced: {
      type: Boolean,
      default: false
    }
  },
  
  // Görsel ve medya
  images: [{
    url: {
      type: String,
      required: true
    },
    alt: String,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  
  // Açıklama
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Açıklama 2000 karakterden fazla olamaz']
  },
  
  shortDescription: {
    type: String,
    trim: true,
    maxlength: [500, 'Kısa açıklama 500 karakterden fazla olamaz']
  },
  
  // SEO bilgileri
  seo: {
    title: String,
    description: String,
    keywords: [String],
    slug: {
      type: String,
      unique: true,
      sparse: true
    }
  },
  
  // Durum bilgileri
  status: {
    type: String,
    enum: ['active', 'inactive', 'draft', 'archived'],
    default: 'active'
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  isFeatured: {
    type: Boolean,
    default: false
  },
  
  // Satış bilgileri
  salesCount: {
    type: Number,
    default: 0,
    min: [0, 'Satış sayısı negatif olamaz']
  },
  
  viewCount: {
    type: Number,
    default: 0,
    min: [0, 'Görüntüleme sayısı negatif olamaz']
  },
  
  // Rating bilgileri
  rating: {
    average: {
      type: Number,
      default: 0,
      min: [0, 'Ortalama puan negatif olamaz'],
      max: [5, 'Ortalama puan 5\'ten fazla olamaz']
    },
    count: {
      type: Number,
      default: 0,
      min: [0, 'Yorum sayısı negatif olamaz']
    }
  },
  
  // Tedarikçi bilgileri
  supplier: {
    name: String,
    code: String,
    contact: String
  },
  
  // Tarih bilgileri
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  lastStockUpdate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
ProductSchema.index({ brand: 1, category: 1 });
ProductSchema.index({ 'specifications.season': 1, price: 1 });
ProductSchema.index({ 'specifications.size': 1 });
ProductSchema.index({ 'specifications.vehicleType': 1 });
ProductSchema.index({ stockStatus: 1, isActive: 1 });
ProductSchema.index({ isFeatured: 1, isActive: 1 });
ProductSchema.index({ salesCount: -1 });
ProductSchema.index({ 'rating.average': -1 });

// Text search index
ProductSchema.index({
  name: 'text',
  brand: 'text',
  category: 'text',
  'specifications.size': 'text',
  description: 'text'
}, {
  weights: {
    name: 10,
    brand: 5,
    'specifications.size': 8,
    category: 3,
    description: 1
  }
});

// Virtual fields
ProductSchema.virtual('isInStock').get(function() {
  return this.stock > 0 && this.stockStatus === 'in_stock';
});

ProductSchema.virtual('isLowStock').get(function() {
  return this.stock <= this.minStockLevel && this.stock > 0;
});

ProductSchema.virtual('discountAmount').get(function() {
  if (this.originalPrice && this.price) {
    return this.originalPrice - this.price;
  }
  return 0;
});

ProductSchema.virtual('formattedPrice').get(function() {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY'
  }).format(this.price);
});

// Middleware
ProductSchema.pre('save', function(next) {
  // Update stock status based on stock level
  if (this.stock === 0) {
    this.stockStatus = 'out_of_stock';
  } else if (this.stock <= this.minStockLevel) {
    this.stockStatus = 'low_stock';
  } else {
    this.stockStatus = 'in_stock';
  }
  
  // Update discount percentage
  if (this.originalPrice && this.price) {
    this.discountPercentage = Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
  }
  
  // Update timestamp
  this.updatedAt = Date.now();
  
  next();
});

// Static methods
ProductSchema.statics.findBySize = function(size) {
  return this.find({ 'specifications.size': size, isActive: true });
};

ProductSchema.statics.findByBrand = function(brand) {
  return this.find({ brand: brand, isActive: true });
};

ProductSchema.statics.findBySeason = function(season) {
  return this.find({ 'specifications.season': season, isActive: true });
};

ProductSchema.statics.findInStock = function() {
  return this.find({ stockStatus: 'in_stock', isActive: true });
};

ProductSchema.statics.findFeatured = function() {
  return this.find({ isFeatured: true, isActive: true });
};

// Instance methods
ProductSchema.methods.updateStock = function(quantity) {
  this.stock += quantity;
  this.lastStockUpdate = Date.now();
  return this.save();
};

ProductSchema.methods.incrementViewCount = function() {
  this.viewCount += 1;
  return this.save();
};

ProductSchema.methods.incrementSalesCount = function(quantity = 1) {
  this.salesCount += quantity;
  return this.save();
};

module.exports = mongoose.model('Product', ProductSchema); 