const mongoose = require('mongoose');

const CartSchema = new mongoose.Schema({
  // Kullanıcı referansı (guest kullanıcılar için nullable)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    sparse: true // Guest kullanıcılar için null olabilir
  },
  
  // Guest kullanıcı için session ID
  sessionId: {
    type: String,
    sparse: true
  },
  
  // Sepet durumu
  status: {
    type: String,
    enum: ['active', 'abandoned', 'completed', 'expired', 'merged'],
    default: 'active'
  },
  
  // Sepet tipi
  type: {
    type: String,
    enum: ['regular', 'wishlist', 'saved_for_later'],
    default: 'regular'
  },
  
  // Sepet ürünleri
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    diaStockId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DiaStock'
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Miktar en az 1 olmalıdır'],
      default: 1
    },
    unitPrice: {
      type: Number,
      required: true,
      min: [0, 'Birim fiyat negatif olamaz']
    },
    totalPrice: {
      type: Number,
      required: true,
      min: [0, 'Toplam fiyat negatif olamaz']
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: [0, 'İndirim miktarı negatif olamaz']
    },
    discountPercentage: {
      type: Number,
      default: 0,
      min: [0, 'İndirim oranı negatif olamaz'],
      max: [100, 'İndirim oranı 100\'den fazla olamaz']
    },
    // Ürün ekleme zamanı
    addedAt: {
      type: Date,
      default: Date.now
    },
    // Son güncelleme zamanı
    updatedAt: {
      type: Date,
      default: Date.now
    },
    // Ürün bilgileri (snapshot)
    productSnapshot: {
      name: String,
      brand: String,
      category: String,
      sku: String,
      image: String,
      specifications: {
        size: String,
        season: String,
        vehicleType: String
      }
    },
    // Stok durumu
    stockStatus: {
      type: String,
      enum: ['in_stock', 'low_stock', 'out_of_stock'],
      default: 'in_stock'
    },
    // Rezervasyon durumu
    isReserved: {
      type: Boolean,
      default: false
    },
    reservedUntil: Date,
    // Özel notlar
    notes: String
  }],
  
  // Fiyat bilgileri
  pricing: {
    subtotal: {
      type: Number,
      default: 0,
      min: [0, 'Ara toplam negatif olamaz']
    },
    discountTotal: {
      type: Number,
      default: 0,
      min: [0, 'Toplam indirim negatif olamaz']
    },
    taxTotal: {
      type: Number,
      default: 0,
      min: [0, 'Toplam vergi negatif olamaz']
    },
    shippingCost: {
      type: Number,
      default: 0,
      min: [0, 'Kargo ücreti negatif olamaz']
    },
    total: {
      type: Number,
      default: 0,
      min: [0, 'Toplam fiyat negatif olamaz']
    },
    currency: {
      type: String,
      enum: ['TRY', 'USD', 'EUR'],
      default: 'TRY'
    }
  },
  
  // Kupon bilgileri
  coupons: [{
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    type: {
      type: String,
      enum: ['percentage', 'fixed_amount', 'free_shipping'],
      required: true
    },
    value: {
      type: Number,
      required: true,
      min: [0, 'Kupon değeri negatif olamaz']
    },
    discountAmount: {
      type: Number,
      required: true,
      min: [0, 'İndirim miktarı negatif olamaz']
    },
    appliedAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: Date
  }],
  
  // Teslimat bilgileri
  shipping: {
    method: {
      type: String,
      enum: ['standard', 'express', 'overnight', 'pickup'],
      default: 'standard'
    },
    address: {
      title: String,
      firstName: String,
      lastName: String,
      phone: String,
      address: String,
      city: String,
      district: String,
      postalCode: String,
      country: { type: String, default: 'Turkey' }
    },
    estimatedDelivery: Date,
    trackingNumber: String
  },
  
  // Ödeme bilgileri
  payment: {
    method: {
      type: String,
      enum: ['credit_card', 'debit_card', 'bank_transfer', 'cash_on_delivery', 'digital_wallet'],
      default: 'credit_card'
    },
    installments: {
      type: Number,
      default: 1,
      min: [1, 'Taksit sayısı en az 1 olmalıdır']
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
      default: 'pending'
    }
  },
  
  // Sepet aktivitesi
  activity: {
    viewCount: {
      type: Number,
      default: 0
    },
    lastViewedAt: {
      type: Date,
      default: Date.now
    },
    itemAddCount: {
      type: Number,
      default: 0
    },
    itemRemoveCount: {
      type: Number,
      default: 0
    },
    abandonedAt: Date,
    completedAt: Date,
    expiredAt: Date
  },
  
  // Sepet meta bilgileri
  metadata: {
    source: {
      type: String,
      enum: ['web', 'mobile', 'api', 'admin'],
      default: 'web'
    },
    device: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet'],
      default: 'desktop'
    },
    browser: String,
    ipAddress: String,
    userAgent: String,
    referrer: String,
    utm: {
      source: String,
      medium: String,
      campaign: String,
      term: String,
      content: String
    }
  },
  
  // Sepet notları
  notes: {
    customer: String,
    internal: String
  },
  
  // Sepet etiketleri
  tags: [String],
  
  // Sepet önceliği
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  
  // Sepet süresi
  expiresAt: {
    type: Date,
    default: function() {
      // Varsayılan olarak 30 gün sonra expire et
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
  },
  
  // Merge edilmiş sepetler
  mergedFrom: [{
    cartId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cart'
    },
    mergedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Sepet geçmişi
  history: [{
    action: {
      type: String,
      enum: ['created', 'item_added', 'item_removed', 'item_updated', 'quantity_changed', 'coupon_applied', 'coupon_removed', 'abandoned', 'completed', 'expired'],
      required: true
    },
    details: mongoose.Schema.Types.Mixed,
    timestamp: {
      type: Date,
      default: Date.now
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    }
  }],
  
  // Tarih bilgileri
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
CartSchema.index({ userId: 1, status: 1 });
CartSchema.index({ sessionId: 1, status: 1 });
CartSchema.index({ status: 1, updatedAt: -1 });
CartSchema.index({ expiresAt: 1 });
CartSchema.index({ 'items.productId': 1 });
CartSchema.index({ 'activity.lastViewedAt': -1 });
CartSchema.index({ createdAt: -1 });

// Virtual fields
CartSchema.virtual('itemCount').get(function() {
  return this.items.length;
});

CartSchema.virtual('totalQuantity').get(function() {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

CartSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

CartSchema.virtual('isAbandoned').get(function() {
  return this.status === 'abandoned' || (this.activity.lastViewedAt && 
    new Date() - this.activity.lastViewedAt > 24 * 60 * 60 * 1000);
});

CartSchema.virtual('daysSinceLastActivity').get(function() {
  if (!this.activity.lastViewedAt) return 0;
  return Math.floor((new Date() - this.activity.lastViewedAt) / (24 * 60 * 60 * 1000));
});

// Middleware
CartSchema.pre('save', function(next) {
  // Fiyat hesaplamaları
  this.calculatePricing();
  
  // Stok durumlarını kontrol et
  this.checkStockStatus();
  
  // Güncelleme tarihi
  this.updatedAt = Date.now();
  
  // Son aktivite zamanı
  if (this.isModified('items') || this.isModified('activity.viewCount')) {
    this.activity.lastViewedAt = new Date();
  }
  
  next();
});

// Instance methods
CartSchema.methods.calculatePricing = function() {
  // Ara toplam hesaplama
  this.pricing.subtotal = this.items.reduce((total, item) => {
    return total + (item.unitPrice * item.quantity);
  }, 0);
  
  // Toplam indirim hesaplama
  this.pricing.discountTotal = this.items.reduce((total, item) => {
    return total + item.discountAmount;
  }, 0);
  
  // Kupon indirimleri
  const couponDiscount = this.coupons.reduce((total, coupon) => {
    return total + coupon.discountAmount;
  }, 0);
  
  this.pricing.discountTotal += couponDiscount;
  
  // Vergi hesaplama (KDV %18)
  this.pricing.taxTotal = (this.pricing.subtotal - this.pricing.discountTotal) * 0.18;
  
  // Kargo ücreti hesaplama
  this.calculateShippingCost();
  
  // Toplam hesaplama
  this.pricing.total = this.pricing.subtotal - this.pricing.discountTotal + 
                       this.pricing.taxTotal + this.pricing.shippingCost;
};

CartSchema.methods.calculateShippingCost = function() {
  // Ücretsiz kargo limiti
  const freeShippingLimit = 500;
  
  // Ücretsiz kargo kuponu kontrolü
  const hasFreeShipping = this.coupons.some(coupon => coupon.type === 'free_shipping');
  
  if (hasFreeShipping || this.pricing.subtotal >= freeShippingLimit) {
    this.pricing.shippingCost = 0;
  } else {
    // Kargo ücreti hesaplama
    switch (this.shipping.method) {
      case 'standard':
        this.pricing.shippingCost = 25;
        break;
      case 'express':
        this.pricing.shippingCost = 50;
        break;
      case 'overnight':
        this.pricing.shippingCost = 100;
        break;
      case 'pickup':
        this.pricing.shippingCost = 0;
        break;
      default:
        this.pricing.shippingCost = 25;
    }
  }
};

CartSchema.methods.checkStockStatus = function() {
  this.items.forEach(item => {
    // Burada gerçek stok kontrolü yapılabilir
    // Şimdilik varsayılan değer
    if (!item.stockStatus) {
      item.stockStatus = 'in_stock';
    }
  });
};

CartSchema.methods.addItem = function(productData, quantity = 1) {
  const existingItem = this.items.find(item => 
    item.productId.toString() === productData.productId.toString()
  );
  
  if (existingItem) {
    existingItem.quantity += quantity;
    existingItem.totalPrice = existingItem.unitPrice * existingItem.quantity;
    existingItem.updatedAt = new Date();
  } else {
    this.items.push({
      productId: productData.productId,
      diaStockId: productData.diaStockId,
      quantity: quantity,
      unitPrice: productData.unitPrice,
      totalPrice: productData.unitPrice * quantity,
      productSnapshot: productData.productSnapshot,
      addedAt: new Date(),
      updatedAt: new Date()
    });
  }
  
  this.activity.itemAddCount += 1;
  this.addToHistory('item_added', { productId: productData.productId, quantity });
  
  return this.save();
};

CartSchema.methods.removeItem = function(productId) {
  const itemIndex = this.items.findIndex(item => 
    item.productId.toString() === productId.toString()
  );
  
  if (itemIndex > -1) {
    const removedItem = this.items[itemIndex];
    this.items.splice(itemIndex, 1);
    this.activity.itemRemoveCount += 1;
    this.addToHistory('item_removed', { productId, quantity: removedItem.quantity });
  }
  
  return this.save();
};

CartSchema.methods.updateItemQuantity = function(productId, quantity) {
  const item = this.items.find(item => 
    item.productId.toString() === productId.toString()
  );
  
  if (item) {
    const oldQuantity = item.quantity;
    item.quantity = quantity;
    item.totalPrice = item.unitPrice * quantity;
    item.updatedAt = new Date();
    
    this.addToHistory('quantity_changed', { 
      productId, 
      oldQuantity, 
      newQuantity: quantity 
    });
  }
  
  return this.save();
};

CartSchema.methods.applyCoupon = function(couponData) {
  // Kupon zaten uygulanmış mı kontrol et
  const existingCoupon = this.coupons.find(c => c.code === couponData.code);
  if (existingCoupon) {
    throw new Error('Bu kupon zaten uygulanmış');
  }
  
  this.coupons.push({
    code: couponData.code,
    type: couponData.type,
    value: couponData.value,
    discountAmount: couponData.discountAmount,
    expiresAt: couponData.expiresAt
  });
  
  this.addToHistory('coupon_applied', { code: couponData.code });
  
  return this.save();
};

CartSchema.methods.removeCoupon = function(couponCode) {
  const couponIndex = this.coupons.findIndex(c => c.code === couponCode);
  
  if (couponIndex > -1) {
    this.coupons.splice(couponIndex, 1);
    this.addToHistory('coupon_removed', { code: couponCode });
  }
  
  return this.save();
};

CartSchema.methods.abandon = function() {
  this.status = 'abandoned';
  this.activity.abandonedAt = new Date();
  this.addToHistory('abandoned');
  
  return this.save();
};

CartSchema.methods.complete = function() {
  this.status = 'completed';
  this.activity.completedAt = new Date();
  this.addToHistory('completed');
  
  return this.save();
};

CartSchema.methods.expire = function() {
  this.status = 'expired';
  this.activity.expiredAt = new Date();
  this.addToHistory('expired');
  
  return this.save();
};

CartSchema.methods.merge = function(otherCart) {
  // Diğer sepetteki ürünleri bu sepete ekle
  otherCart.items.forEach(otherItem => {
    const existingItem = this.items.find(item => 
      item.productId.toString() === otherItem.productId.toString()
    );
    
    if (existingItem) {
      existingItem.quantity += otherItem.quantity;
      existingItem.totalPrice = existingItem.unitPrice * existingItem.quantity;
      existingItem.updatedAt = new Date();
    } else {
      this.items.push({
        ...otherItem.toObject(),
        addedAt: new Date(),
        updatedAt: new Date()
      });
    }
  });
  
  // Merge bilgisini kaydet
  this.mergedFrom.push({
    cartId: otherCart._id,
    mergedAt: new Date()
  });
  
  // Diğer sepeti merged olarak işaretle
  otherCart.status = 'merged';
  
  this.addToHistory('merged', { fromCartId: otherCart._id });
  
  return Promise.all([this.save(), otherCart.save()]);
};

CartSchema.methods.addToHistory = function(action, details = {}, userId = null, adminId = null) {
  this.history.push({
    action,
    details,
    timestamp: new Date(),
    userId,
    adminId
  });
  
  // Son 100 history kaydını tut
  if (this.history.length > 100) {
    this.history = this.history.slice(-100);
  }
};

CartSchema.methods.incrementViewCount = function() {
  this.activity.viewCount += 1;
  this.activity.lastViewedAt = new Date();
  return this.save();
};

CartSchema.methods.reserveItems = function(reservationDuration = 15) {
  const reserveUntil = new Date(Date.now() + reservationDuration * 60 * 1000);
  
  this.items.forEach(item => {
    item.isReserved = true;
    item.reservedUntil = reserveUntil;
  });
  
  return this.save();
};

CartSchema.methods.releaseReservations = function() {
  this.items.forEach(item => {
    item.isReserved = false;
    item.reservedUntil = null;
  });
  
  return this.save();
};

// Static methods
CartSchema.statics.findByUser = function(userId) {
  return this.find({ userId: userId, status: { $ne: 'merged' } });
};

CartSchema.statics.findBySession = function(sessionId) {
  return this.find({ sessionId: sessionId, status: { $ne: 'merged' } });
};

CartSchema.statics.findActiveCart = function(userId, sessionId) {
  const query = { status: 'active' };
  
  if (userId) {
    query.userId = userId;
  } else if (sessionId) {
    query.sessionId = sessionId;
  }
  
  return this.findOne(query);
};

CartSchema.statics.findAbandonedCarts = function(daysSince = 1) {
  const cutoffDate = new Date(Date.now() - daysSince * 24 * 60 * 60 * 1000);
  return this.find({
    status: 'active',
    'activity.lastViewedAt': { $lt: cutoffDate }
  });
};

CartSchema.statics.findExpiredCarts = function() {
  return this.find({
    status: 'active',
    expiresAt: { $lt: new Date() }
  });
};

CartSchema.statics.getCartAnalytics = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalValue: { $sum: '$pricing.total' },
        averageValue: { $avg: '$pricing.total' },
        averageItems: { $avg: { $size: '$items' } }
      }
    }
  ]);
};

CartSchema.statics.getOrCreateForUser = async function(userId, sessionId = null) {
  try {
    // Önce mevcut aktif sepeti bul
    let cart = await this.findOne({ 
      userId: userId, 
      status: 'active' 
    });
    
    if (cart) {
      return cart;
    }
    
    // Sepet yoksa yeni oluştur
    cart = new this({
      userId: userId,
      sessionId: sessionId,
      status: 'active',
      items: [],
      pricing: {
        subtotal: 0,
        vatAmount: 0,
        discountAmount: 0,
        shippingCost: 0,
        total: 0,
        currency: 'TRY'
      },
      activity: {
        viewCount: 1,
        lastViewedAt: new Date(),
        createdAt: new Date()
      }
    });
    
    await cart.save();
    return cart;
  } catch (error) {
    throw error;
  }
};

module.exports = mongoose.model('Cart', CartSchema); 