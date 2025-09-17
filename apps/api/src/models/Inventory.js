const mongoose = require('mongoose');

const InventorySchema = new mongoose.Schema({
  // Ürün referansı
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Ürün ID gereklidir'],
    unique: true
  },
  
  // Stok miktarları
  quantity: {
    type: Number,
    required: [true, 'Stok miktarı gereklidir'],
    min: [0, 'Stok miktarı negatif olamaz'],
    default: 0
  },
  
  reservedQuantity: {
    type: Number,
    default: 0,
    min: [0, 'Rezerve miktar negatif olamaz']
  },
  
  availableQuantity: {
    type: Number,
    default: 0,
    min: [0, 'Mevcut miktar negatif olamaz']
  },
  
  // Stok seviyeleri
  minStockLevel: {
    type: Number,
    default: 5,
    min: [0, 'Minimum stok seviyesi negatif olamaz']
  },
  
  maxStockLevel: {
    type: Number,
    default: 1000,
    min: [1, 'Maksimum stok seviyesi 1\'den az olamaz']
  },
  
  reorderPoint: {
    type: Number,
    default: 10,
    min: [0, 'Yeniden sipariş noktası negatif olamaz']
  },
  
  reorderQuantity: {
    type: Number,
    default: 50,
    min: [1, 'Yeniden sipariş miktarı 1\'den az olamaz']
  },
  
  // Stok durumu
  status: {
    type: String,
    enum: ['in_stock', 'low_stock', 'out_of_stock', 'discontinued', 'backordered'],
    default: 'in_stock'
  },
  
  // Lokasyon bilgileri
  locations: [{
    warehouse: {
      type: String,
      required: true,
      trim: true
    },
    zone: {
      type: String,
      trim: true
    },
    shelf: {
      type: String,
      trim: true
    },
    bin: {
      type: String,
      trim: true
    },
    quantity: {
      type: Number,
      required: true,
      min: [0, 'Lokasyon miktarı negatif olamaz']
    }
  }],
  
  // Tedarikçi bilgileri
  supplier: {
    name: {
      type: String,
      required: [true, 'Tedarikçi adı gereklidir'],
      trim: true
    },
    code: {
      type: String,
      trim: true,
      uppercase: true
    },
    contact: {
      email: String,
      phone: String,
      address: String
    },
    leadTime: {
      type: Number,
      default: 7,
      min: [0, 'Tedarik süresi negatif olamaz']
    }
  },
  
  // Maliyet bilgileri
  cost: {
    unitCost: {
      type: Number,
      required: [true, 'Birim maliyet gereklidir'],
      min: [0, 'Birim maliyet negatif olamaz']
    },
    totalCost: {
      type: Number,
      default: 0,
      min: [0, 'Toplam maliyet negatif olamaz']
    },
    averageCost: {
      type: Number,
      default: 0,
      min: [0, 'Ortalama maliyet negatif olamaz']
    },
    lastCostUpdate: {
      type: Date,
      default: Date.now
    }
  },
  
  // Stok hareketleri
  lastMovement: {
    type: {
      type: String,
      enum: ['in', 'out', 'adjustment', 'transfer', 'return'],
      default: 'in'
    },
    quantity: {
      type: Number,
      default: 0
    },
    date: {
      type: Date,
      default: Date.now
    },
    reason: String,
    reference: String,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  
  // Otomatik yeniden sipariş
  autoReorder: {
    enabled: {
      type: Boolean,
      default: false
    },
    lastOrderDate: Date,
    nextOrderDate: Date,
    orderQuantity: {
      type: Number,
      default: 0
    }
  },
  
  // Kalite kontrol
  qualityControl: {
    lastInspectionDate: Date,
    inspectionStatus: {
      type: String,
      enum: ['pending', 'passed', 'failed', 'quarantined'],
      default: 'pending'
    },
    defectiveQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Hatalı miktar negatif olamaz']
    },
    notes: String
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
  },
  
  // Geçmiş stok seviyeleri (son 30 gün)
  stockHistory: [{
    date: {
      type: Date,
      default: Date.now
    },
    quantity: {
      type: Number,
      required: true
    },
    movement: {
      type: String,
      enum: ['in', 'out', 'adjustment'],
      required: true
    },
    reference: String
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
InventorySchema.index({ status: 1 });
InventorySchema.index({ quantity: 1 });
InventorySchema.index({ lastStockUpdate: -1 });
InventorySchema.index({ 'supplier.name': 1 });
InventorySchema.index({ 'locations.warehouse': 1 });

// Virtual fields
InventorySchema.virtual('isInStock').get(function() {
  return this.availableQuantity > 0;
});

InventorySchema.virtual('isLowStock').get(function() {
  return this.availableQuantity <= this.minStockLevel && this.availableQuantity > 0;
});

InventorySchema.virtual('needsReorder').get(function() {
  return this.availableQuantity <= this.reorderPoint;
});

InventorySchema.virtual('stockValue').get(function() {
  return this.quantity * this.cost.unitCost;
});

InventorySchema.virtual('turnoverRate').get(function() {
  // Basit bir hesaplama - daha karmaşık iş mantığı eklenebilir
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentMovements = this.stockHistory.filter(
    history => history.date >= thirtyDaysAgo && history.movement === 'out'
  );
  
  const totalOut = recentMovements.reduce((sum, movement) => sum + movement.quantity, 0);
  return this.quantity > 0 ? (totalOut / this.quantity) : 0;
});

// Middleware
InventorySchema.pre('save', function(next) {
  // Available quantity hesaplama
  this.availableQuantity = this.quantity - this.reservedQuantity;
  
  // Stok durumu güncelleme
  if (this.availableQuantity === 0) {
    this.status = 'out_of_stock';
  } else if (this.availableQuantity <= this.minStockLevel) {
    this.status = 'low_stock';
  } else {
    this.status = 'in_stock';
  }
  
  // Toplam maliyet hesaplama
  this.cost.totalCost = this.quantity * this.cost.unitCost;
  
  // Timestamp güncelleme
  this.updatedAt = Date.now();
  this.lastStockUpdate = Date.now();
  
  next();
});

// Static methods
InventorySchema.statics.findLowStock = function() {
  return this.find({ status: 'low_stock' });
};

InventorySchema.statics.findOutOfStock = function() {
  return this.find({ status: 'out_of_stock' });
};

InventorySchema.statics.findNeedsReorder = function() {
  return this.find({ $expr: { $lte: ['$availableQuantity', '$reorderPoint'] } });
};

InventorySchema.statics.findByWarehouse = function(warehouse) {
  return this.find({ 'locations.warehouse': warehouse });
};

InventorySchema.statics.getTotalStockValue = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalValue: { $sum: { $multiply: ['$quantity', '$cost.unitCost'] } },
        totalQuantity: { $sum: '$quantity' }
      }
    }
  ]);
};

// Instance methods
InventorySchema.methods.addStock = function(quantity, reason = 'stock_in', reference = '', userId = null) {
  this.quantity += quantity;
  
  // Stok geçmişine ekle
  this.stockHistory.push({
    date: new Date(),
    quantity: quantity,
    movement: 'in',
    reference: reference
  });
  
  // Son hareket güncelle
  this.lastMovement = {
    type: 'in',
    quantity: quantity,
    date: new Date(),
    reason: reason,
    reference: reference,
    userId: userId
  };
  
  // Geçmiş 30 günle sınırla
  if (this.stockHistory.length > 30) {
    this.stockHistory = this.stockHistory.slice(-30);
  }
  
  return this.save();
};

InventorySchema.methods.removeStock = function(quantity, reason = 'stock_out', reference = '', userId = null) {
  if (this.availableQuantity < quantity) {
    throw new Error('Yetersiz stok miktarı');
  }
  
  this.quantity -= quantity;
  
  // Stok geçmişine ekle
  this.stockHistory.push({
    date: new Date(),
    quantity: -quantity,
    movement: 'out',
    reference: reference
  });
  
  // Son hareket güncelle
  this.lastMovement = {
    type: 'out',
    quantity: quantity,
    date: new Date(),
    reason: reason,
    reference: reference,
    userId: userId
  };
  
  // Geçmiş 30 günle sınırla
  if (this.stockHistory.length > 30) {
    this.stockHistory = this.stockHistory.slice(-30);
  }
  
  return this.save();
};

InventorySchema.methods.reserveStock = function(quantity) {
  if (this.availableQuantity < quantity) {
    throw new Error('Yetersiz stok miktarı');
  }
  
  this.reservedQuantity += quantity;
  return this.save();
};

InventorySchema.methods.releaseReservedStock = function(quantity) {
  this.reservedQuantity = Math.max(0, this.reservedQuantity - quantity);
  return this.save();
};

InventorySchema.methods.adjustStock = function(newQuantity, reason = 'adjustment', reference = '', userId = null) {
  const difference = newQuantity - this.quantity;
  this.quantity = newQuantity;
  
  // Stok geçmişine ekle
  this.stockHistory.push({
    date: new Date(),
    quantity: difference,
    movement: 'adjustment',
    reference: reference
  });
  
  // Son hareket güncelle
  this.lastMovement = {
    type: 'adjustment',
    quantity: Math.abs(difference),
    date: new Date(),
    reason: reason,
    reference: reference,
    userId: userId
  };
  
  return this.save();
};

module.exports = mongoose.model('Inventory', InventorySchema); 