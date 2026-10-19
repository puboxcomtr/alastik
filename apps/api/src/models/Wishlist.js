const mongoose = require('mongoose');

const WishlistSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Liste adı 100 karakterden uzun olamaz'],
    default: 'Favorilerim'
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Açıklama 500 karakterden uzun olamaz']
  },
  
  isDefault: {
    type: Boolean,
    default: false
  },
  
  isPublic: {
    type: Boolean,
    default: false
  },
  
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
    addedAt: {
      type: Date,
      default: Date.now
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    note: {
      type: String,
      maxlength: [200, 'Not 200 karakterden uzun olamaz']
    },
    snapshot: {
      name: String,
      brand: String,
      model: String,
      size: String,
      price: Number,
      image: String
    }
  }],
  
  sharing: {
    shareCode: {
      type: String,
      sparse: true
    },
    sharedAt: Date,
    viewCount: {
      type: Number,
      default: 0
    },
    allowComments: {
      type: Boolean,
      default: false
    }
  },
  
  stats: {
    totalItems: {
      type: Number,
      default: 0
    },
    totalValue: {
      type: Number,
      default: 0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  
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

WishlistSchema.index({ userId: 1, createdAt: -1 });
WishlistSchema.index({ 'items.productId': 1 });
WishlistSchema.index({ 'sharing.shareCode': 1 }, { unique: true, sparse: true });
WishlistSchema.index({ isPublic: 1, createdAt: -1 });

WishlistSchema.index({ userId: 1, isDefault: 1 }, { 
  unique: true, 
  partialFilterExpression: { isDefault: true } 
});

WishlistSchema.virtual('itemCount').get(function() {
  return this.items.length;
});

WishlistSchema.virtual('totalValue').get(function() {
  return this.items.reduce((total, item) => {
    return total + (item.snapshot?.price || 0);
  }, 0);
});

WishlistSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  this.stats.totalItems = this.items.length;
  this.stats.totalValue = this.items.reduce((total, item) => {
    return total + (item.snapshot?.price || 0);
  }, 0);
  this.stats.lastUpdated = Date.now();
  
  if (this.isPublic && !this.sharing.shareCode) {
    this.sharing.shareCode = this.generateShareCode();
  }
  
  next();
});

WishlistSchema.pre('save', function(next) {
  if (this.isDefault) {
    this.constructor.updateMany(
      { userId: this.userId, _id: { $ne: this._id } },
      { isDefault: false }
    ).exec();
  }
  next();
});

WishlistSchema.statics.getOrCreateDefault = async function(userId) {
  let wishlist = await this.findOne({ userId, isDefault: true });
  
  if (!wishlist) {
    wishlist = await this.create({
      userId,
      name: 'Favorilerim',
      isDefault: true
    });
  }
  
  return wishlist;
};

WishlistSchema.statics.getUserWishlists = function(userId, options = {}) {
  const { includeItems = true, page = 1, limit = 10 } = options;
  
  let query = this.find({ userId }).sort({ isDefault: -1, createdAt: -1 });
  
  if (includeItems) {
    query = query.populate('items.productId', 'name brand model images price specifications');
  }
  
  return query
    .limit(limit * 1)
    .skip((page - 1) * limit);
};

WishlistSchema.statics.getPublicWishlists = function(options = {}) {
  const { page = 1, limit = 10 } = options;
  
  return this.find({ isPublic: true })
    .populate('userId', 'profile.firstName profile.lastName')
    .populate('items.productId', 'name brand model images price')
    .sort({ 'stats.totalItems': -1, createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
};

WishlistSchema.statics.findByShareCode = function(shareCode) {
  return this.findOne({ 'sharing.shareCode': shareCode, isPublic: true })
    .populate('userId', 'profile.firstName profile.lastName')
    .populate('items.productId', 'name brand model images price specifications');
};

WishlistSchema.methods.addItem = async function(productId, options = {}) {
  const { diaStockId, priority = 'medium', note } = options;
  
  const existingItem = this.items.find(item => 
    item.productId.toString() === productId.toString()
  );
  
  if (existingItem) {
    throw new Error('Bu ürün zaten listede mevcut');
  }
  
  const Product = mongoose.model('Product');
  const product = await Product.findById(productId);
  
  if (!product) {
    throw new Error('Ürün bulunamadı');
  }
  
  this.items.push({
    productId,
    diaStockId,
    priority,
    note,
    snapshot: {
      name: product.name,
      brand: product.brand,
      model: product.model,
      size: product.specifications?.size,
      price: product.price,
      image: product.images?.[0]?.url
    }
  });
  
  return this.save();
};

WishlistSchema.methods.removeItem = function(productId) {
  this.items = this.items.filter(item => 
    item.productId.toString() !== productId.toString()
  );
  return this.save();
};

WishlistSchema.methods.moveToCart = async function(productId, quantity = 1) {
  const Cart = mongoose.model('Cart');
  const item = this.items.find(item => 
    item.productId.toString() === productId.toString()
  );
  
  if (!item) {
    throw new Error('Ürün listede bulunamadı');
  }
  
  const cart = await Cart.getOrCreateForUser(this.userId);
  await cart.addItem(productId, quantity);
  
  await this.removeItem(productId);
  
  return cart;
};

WishlistSchema.methods.generateShareCode = function() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

WishlistSchema.methods.incrementViewCount = function() {
  this.sharing.viewCount += 1;
  return this.save();
};

module.exports = mongoose.model('Wishlist', WishlistSchema);