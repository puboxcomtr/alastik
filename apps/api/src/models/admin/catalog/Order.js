const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  // Sipariş temel bilgileri
  orderNumber: {
    type: String,
    required: true,
    uppercase: true
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },

  // Sipariş durumu
  status: {
    type: String,
    enum: [
      'pending',        // Beklemede
      'confirmed',      // Onaylandı
      'processing',     // Hazırlanıyor
      'shipped',        // Kargoya verildi
      'delivered',      // Teslim edildi
      'cancelled',      // İptal edildi
      'returned',       // İade edildi
      'refunded'        // Para iadesi yapıldı
    ],
    default: 'pending'
  },

  // Ödeme durumu
  paymentStatus: {
    type: String,
    enum: [
      'pending',        // Beklemede
      'paid',          // Ödendi
      'failed',        // Başarısız
      'refunded',      // İade edildi
      'partial_refund' // Kısmi iade
    ],
    default: 'pending'
  },

  // Sipariş kalemleri
  items: [{
    productId: {
      type: String, // Harici/DIA stok ID'leri için string kabul et
      required: true
    },
    diaStockId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DiaStock'
    },
    name: {
      type: String,
      required: true
    },
    brand: String,
    model: String,
    size: String, // Lastik ebatı
    specifications: {
      width: Number,
      profile: Number,
      diameter: Number,
      season: String,
      loadIndex: String,
      speedRating: String
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Miktar en az 1 olmalıdır']
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
    vatRate: {
      type: Number,
      default: 18
    },
    vatAmount: {
      type: Number,
      default: 0
    },
    discount: {
      type: Number,
      default: 0
    }
  }],

  // Fiyat bilgileri
  pricing: {
    subtotal: {
      type: Number,
      required: true,
      min: [0, 'Ara toplam negatif olamaz']
    },
    vatAmount: {
      type: Number,
      default: 0
    },
    discountAmount: {
      type: Number,
      default: 0
    },
    shippingCost: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      required: true,
      min: [0, 'Toplam negatif olamaz']
    },
    currency: {
      type: String,
      default: 'TRY'
    }
  },

  // Teslimat bilgileri
  shipping: {
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
    method: {
      type: String,
      enum: ['standard', 'express', 'pickup'],
      default: 'standard'
    },
    company: String, // Kargo şirketi
    trackingNumber: String,
    estimatedDelivery: Date,
    actualDelivery: Date,
    deliveryInstructions: String
  },

  // Fatura bilgileri
  billing: {
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
    taxNumber: String,
    companyName: String,
    isCompany: {
      type: Boolean,
      default: false
    }
  },

  // Ödeme bilgileri
  payment: {
    method: {
      type: String,
      enum: ['credit_card', 'credit_card_3d', 'debit_card', 'bank_transfer', 'cash_on_delivery', 'installment'],
      required: false
    },
    provider: String, // Ödeme sağlayıcısı (Iyzico, PayTR, vs)
    transactionId: String,
    installments: {
      count: { type: Number, default: 1 },
      amount: Number,
      monthlyAmount: Number
    },
    cardInfo: {
      lastFourDigits: String,
      cardType: String, // visa, mastercard, amex
      bankName: String,
      cardAssociation: String,
      cardFamily: String
    },
    // 3D Güvenli ödeme bilgileri
    threeDSecure: {
      isEnabled: {
        type: Boolean,
        default: true
      },
      status: {
        type: String,
        enum: ['pending', 'success', 'failed', 'not_enrolled', 'attempt'],
        default: 'pending'
      },
      authenticationValue: String,
      eci: String, // Electronic Commerce Indicator
      cavv: String, // Cardholder Authentication Verification Value
      xid: String,
      mdStatus: String,
      conversationId: String,
      returnUrl: String,
      callbackUrl: String,
      htmlContent: String // 3D form HTML'i
    },
    // Ödeme işlem detayları
    transaction: {
      status: {
        type: String,
        enum: ['pending', 'success', 'failed', 'cancelled', 'expired'],
        default: 'pending'
      },
      authCode: String,
      hostReference: String,
      paymentId: String,
      conversationId: String,
      fraudStatus: String,
      errorCode: String,
      errorMessage: String,
      errorGroup: String,
      locale: {
        type: String,
        default: 'tr'
      },
      systemTime: Date,
      processedAt: Date
    },
    paidAt: Date,
    refundedAt: Date,
    refundAmount: Number,
    refundTransactions: [{
      transactionId: String,
      amount: Number,
      reason: String,
      processedAt: Date,
      status: String
    }]
  },

  // Kupon ve indirimler
  discounts: [{
    type: {
      type: String,
      enum: ['coupon', 'campaign', 'loyalty', 'bulk', 'seasonal']
    },
    code: String,
    name: String,
    amount: Number,
    percentage: Number,
    appliedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Notlar ve özel talepler
  notes: {
    customer: String, // Müşteri notu
    internal: String, // İç not
    delivery: String  // Teslimat notu
  },

  // Sipariş geçmişi
  history: [{
    status: String,
    note: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'history.updatedByModel'
    },
    updatedByModel: {
      type: String,
      enum: ['User', 'AdminUser']
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],

  // İade bilgileri
  return: {
    requested: {
      type: Boolean,
      default: false
    },
    requestedAt: Date,
    reason: String,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'completed']
    },
    items: [{
      productId: mongoose.Schema.Types.ObjectId,
      quantity: Number,
      reason: String
    }],
    refundAmount: Number,
    processedAt: Date
  },

  // Müşteri değerlendirmesi
  review: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    reviewedAt: Date
  },

  // Entegrasyon bilgileri
  integration: {
    diaSync: {
      status: {
        type: String,
        enum: ['synced', 'pending_sync', 'not_in_dia', 'error'],
        default: 'synced'
      },
      diaOrderKey: {
        type: String,
        unique: true,
        sparse: true 
      },
      diaOrderNumber: String,
      diaCustomerKey: String,
      syncedAt: Date,
      syncErrors: [String]
    }
  },

  // Meta bilgiler
  source: {
    type: String,
    enum: ['web', 'mobile', 'admin', 'api', 'dia_sync'],
    default: 'web'
  },

  device: {
    userAgent: String,
    ip: String
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

  confirmedAt: Date,
  shippedAt: Date,
  deliveredAt: Date,
  cancelledAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ orderNumber: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ paymentStatus: 1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ 'items.productId': 1 });
OrderSchema.index({ 'payment.transactionId': 1 });
OrderSchema.index({ 'shipping.trackingNumber': 1 });
OrderSchema.index({ 'integration.diaSync.diaOrderKey': 1 }, { unique: true, sparse: true });
OrderSchema.index({ 'integration.diaSync.status': 1 });
OrderSchema.index({ source: 1 });

// Virtual fields
OrderSchema.virtual('totalItems').get(function () {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

OrderSchema.virtual('isCompleted').get(function () {
  return ['delivered', 'returned', 'refunded'].includes(this.status);
});

OrderSchema.virtual('canBeCancelled').get(function () {
  return ['pending', 'confirmed'].includes(this.status);
});

OrderSchema.virtual('daysSinceOrder').get(function () {
  return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24));
});

// Middleware
OrderSchema.pre('save', function (next) {
  this.updatedAt = Date.now();

  // Sipariş numarası oluştur
  if (!this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.orderNumber = `ALT${year}${month}${day}${random}`;
  }

  // Fiyat hesaplamaları
  if (this.items && this.items.length > 0) {
    this.pricing.subtotal = this.items.reduce((total, item) => total + item.totalPrice, 0);
    this.pricing.vatAmount = this.items.reduce((total, item) => total + item.vatAmount, 0);
    this.pricing.total = this.pricing.subtotal + this.pricing.shippingCost - this.pricing.discountAmount;
  }

  next();
});

// Sipariş durumu değiştiğinde history'ye ekle
OrderSchema.pre('save', function (next) {
  if (this.isModified('status') && !this.isNew) {
    this.history.push({
      status: this.status,
      note: `Sipariş durumu ${this.status} olarak güncellendi`,
      timestamp: new Date()
    });

    // Durum tarihlerini güncelle
    switch (this.status) {
      case 'confirmed':
        this.confirmedAt = new Date();
        break;
      case 'shipped':
        this.shippedAt = new Date();
        break;
      case 'delivered':
        this.deliveredAt = new Date();
        break;
      case 'cancelled':
        this.cancelledAt = new Date();
        break;
    }
  }
  next();
});

// Static methods
OrderSchema.statics.generateOrderNumber = function () {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ALT${year}${month}${day}${random}`;
};

OrderSchema.statics.getOrdersByUser = function (userId, options = {}) {
  const { page = 1, limit = 10, status } = options;
  const query = { userId };

  if (status) {
    query.status = status;
  }

  return this.find(query)
    .populate('items.productId', 'name brand model images')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
};

OrderSchema.statics.getOrderStats = function (userId) {
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalSpent: { $sum: '$pricing.total' },
        averageOrderValue: { $avg: '$pricing.total' },
        lastOrderDate: { $max: '$createdAt' }
      }
    }
  ]);
};

// Instance methods
OrderSchema.methods.addToHistory = function (status, note, updatedBy = null) {
  this.history.push({
    status,
    note,
    updatedBy,
    timestamp: new Date()
  });
  return this.save();
};

OrderSchema.methods.calculateTotals = function () {
  this.pricing.subtotal = this.items.reduce((total, item) => total + item.totalPrice, 0);
  this.pricing.vatAmount = this.items.reduce((total, item) => total + item.vatAmount, 0);
  this.pricing.total = this.pricing.subtotal + this.pricing.shippingCost - this.pricing.discountAmount;
  return this;
};

module.exports = mongoose.model('Order', OrderSchema);