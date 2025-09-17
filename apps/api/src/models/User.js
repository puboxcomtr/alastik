const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema({
  // Temel kimlik bilgileri
  email: {
    type: String,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Geçerli bir email adresi giriniz'],
    index: true,
    sparse: true,
    unique: true
  },
  
  password: {
    type: String,
    required: function() {
      // Google OAuth ile giriş yapan kullanıcılar için şifre zorunlu değil
      return !this.googleId;
    },
    minlength: [6, 'Şifre en az 6 karakter olmalıdır'],
    select: false // Varsayılan olarak şifre döndürülmez
  },

  // OAuth bilgileri
  googleId: {
    type: String,
    unique: true,
    sparse: true // Null değerler için unique constraint uygulanmaz
  },
  
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },

  // Düz seviye kişisel bilgiler (Google OAuth ile uyumluluk için)
  firstName: {
    type: String,
    trim: true,
    maxlength: [50, 'Ad 50 karakterden uzun olamaz']
  },
  lastName: {
    type: String,
    trim: true,
    maxlength: [50, 'Soyad 50 karakterden uzun olamaz']
  },
  username: {
    type: String,
    trim: true,
    unique: true,
    sparse: true,
    minlength: [3, 'Kullanıcı adı en az 3 karakter olmalıdır'],
    maxlength: [30, 'Kullanıcı adı 30 karakterden uzun olamaz']
  },
  profilePicture: {
    type: String,
    trim: true
  },
  
  // Kişisel bilgiler
  profile: {
    firstName: {
      type: String,
      trim: true,
      maxlength: [50, 'Ad 50 karakterden uzun olamaz'],
      default: ''
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: [50, 'Soyad 50 karakterden uzun olamaz'],
      default: ''
    },
      phone: {
        type: String,
        trim: true,
        set: function(v) { return v ? v.replace(/\D/g, '') : v; },
        match: [/^[0-9]{10,11}$/, 'Geçerli bir telefon numarası giriniz'],
        index: true,
        unique: true,
        sparse: true
      },
    birthDate: Date,
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
      default: 'prefer_not_to_say'
    },
    avatar: {
      url: String,
      publicId: String // Cloudinary için
    }
  },
  
  // Adres bilgileri
  addresses: [{
    type: {
      type: String,
      enum: ['home', 'work', 'other'],
      default: 'home'
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [50, 'Adres başlığı 50 karakterden uzun olamaz']
    },
    firstName: {
      type: String,
      required: true,
      trim: true
    },
    lastName: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    address: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Adres 200 karakterden uzun olamaz']
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    district: {
      type: String,
      required: true,
      trim: true
    },
    postalCode: {
      type: String,
      required: true,
      trim: true,
      match: [/^[0-9]{5}$/, 'Geçerli bir posta kodu giriniz']
    },
    country: {
      type: String,
      default: 'Turkey',
      trim: true
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Hesap durumu
  accountStatus: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending_verification'],
    default: 'active'
  },
  
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  
  // Doğrulama token'ları
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  phoneVerificationCode: String,
  phoneVerificationExpires: Date,
  
  // Güvenlik
  loginAttempts: {
    count: {
      type: Number,
      default: 0
    },
    lastAttempt: Date,
    lockedUntil: Date
  },
  
  lastLogin: {
    date: Date,
    ip: String,
    userAgent: String
  },
  
  // Kullanıcı tercihleri
  preferences: {
    language: {
      type: String,
      enum: ['tr', 'en'],
      default: 'tr'
    },
    currency: {
      type: String,
      enum: ['TRY', 'USD', 'EUR'],
      default: 'TRY'
    },
    notifications: {
      email: {
        marketing: {
          type: Boolean,
          default: true
        },
        orderUpdates: {
          type: Boolean,
          default: true
        },
        stockAlerts: {
          type: Boolean,
          default: false
        },
        priceAlerts: {
          type: Boolean,
          default: false
        }
      },
      sms: {
        marketing: {
          type: Boolean,
          default: false
        },
        orderUpdates: {
          type: Boolean,
          default: true
        }
      },
      push: {
        enabled: {
          type: Boolean,
          default: true
        },
        orderUpdates: {
          type: Boolean,
          default: true
        },
        marketing: {
          type: Boolean,
          default: false
        }
      }
    },
    privacy: {
      profileVisibility: {
        type: String,
        enum: ['public', 'private'],
        default: 'private'
      },
      dataCollection: {
        type: Boolean,
        default: true
      },
      personalizedAds: {
        type: Boolean,
        default: true
      }
    }
  },
  
  // Müşteri segmentasyonu
  customerSegment: {
    type: String,
    enum: ['new', 'regular', 'vip', 'premium'],
    default: 'new'
  },
  
  loyaltyPoints: {
    type: Number,
    default: 0,
    min: [0, 'Sadakat puanı negatif olamaz']
  },
  
  // İstatistikler
  statistics: {
    totalOrders: {
      type: Number,
      default: 0
    },
    totalSpent: {
      type: Number,
      default: 0
    },
    averageOrderValue: {
      type: Number,
      default: 0
    },
    lastOrderDate: Date,
    favoriteCategories: [String],
    favoriteBrands: [String],
    profileCompleteness: {
      type: Number,
      default: 0,
      min: [0, 'Profil tamamlama oranı negatif olamaz'],
      max: [100, 'Profil tamamlama oranı 100\'den fazla olamaz']
    }
  },
  
  // Favori ürünler
  favorites: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Garaj (kullanıcının araçları)
  garage: [{
    marka: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    yil: { type: Number, required: true },
    modifikasyon: { type: String, trim: true },
    nickname: { type: String, trim: true },
    plate: { type: String, trim: true },
    region: { type: String, trim: true, default: 'eudm' },
    createdAt: { type: Date, default: Date.now }
  }],
  
  // Aktif sepet bilgileri
  activeCart: {
    items: [{
      productId: {
        type: String,
        required: true
      },
      name: String,
      brand: String,
      sku: String,
      price: Number,
      originalPrice: Number,
      quantity: {
        type: Number,
        default: 1,
        min: 1
      },
      specifications: {
        size: String,
        width: Number,
        aspectRatio: Number,
        rimDiameter: Number,
        season: String,
        loadIndex: String,
        speedIndex: String
      },
      images: [{
        url: String,
        alt: String,
        isPrimary: Boolean
      }],
      addedAt: {
        type: Date,
        default: Date.now
      },
      updatedAt: {
        type: Date,
        default: Date.now
      }
    }],
    totalItems: {
      type: Number,
      default: 0
    },
    totalPrice: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'TRY'
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 gün
    }
  },

  // Sepet geçmişi özeti
  cartHistory: {
    totalCarts: {
      type: Number,
      default: 0
    },
    abandonedCarts: {
      type: Number,
      default: 0
    },
    completedCarts: {
      type: Number,
      default: 0
    },
    averageCartValue: {
      type: Number,
      default: 0
    },
    lastCartDate: Date
  },

  // JWT ve oturum yönetimi
  sessions: [{
    token: {
      type: String,
      required: true
    },
    refreshToken: String,
    deviceInfo: {
      userAgent: String,
      ip: String,
      device: String,
      browser: String,
      os: String
    },
    isActive: {
      type: Boolean,
      default: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    lastAccessedAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 gün
    }
  }],
  
  // Sosyal medya bağlantıları
  socialAccounts: {
    google: {
      id: String,
      email: String,
      verified: Boolean
    },
    facebook: {
      id: String,
      email: String,
      verified: Boolean
    },
    apple: {
      id: String,
      email: String,
      verified: Boolean
    }
  },
  
  // GDPR ve yasal
  gdprConsent: {
    given: {
      type: Boolean,
      default: false
    },
    givenAt: Date,
    version: String,
    ip: String
  },
  
  marketingConsent: {
    given: {
      type: Boolean,
      default: false
    },
    givenAt: Date,
    channels: {
      email: Boolean,
      sms: Boolean,
      push: Boolean
    }
  },
  
  // DIA entegrasyon alanları
  diaKey: {
    type: String,
    index: true
  },
  diaAddressKey: {
    type: String,
    index: true
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
  
  lastActiveAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.emailVerificationToken;
      delete ret.passwordResetToken;
      delete ret.phoneVerificationCode;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Indexes for performance
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ accountStatus: 1 });
UserSchema.index({ customerSegment: 1 });
UserSchema.index({ 'profile.firstName': 1, 'profile.lastName': 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ lastActiveAt: -1 });
UserSchema.index({ 'addresses.isDefault': 1 });

// Virtual fields
UserSchema.virtual('fullName').get(function() {
  return `${this.profile.firstName} ${this.profile.lastName}`;
});

UserSchema.virtual('isLocked').get(function() {
  return !!(this.loginAttempts.lockedUntil && this.loginAttempts.lockedUntil > Date.now());
});

UserSchema.virtual('defaultAddress').get(function() {
  return this.addresses.find(addr => addr.isDefault) || this.addresses[0];
});

// Middleware
UserSchema.pre('save', async function(next) {
  // Şifre hashleme
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  
  // Profil tamamlama oranı hesaplama
  this.calculateProfileCompleteness();
  
  // Güncelleme tarihi
  this.updatedAt = Date.now();
  
  // Varsayılan adres kontrolü
  if (this.addresses.length > 0) {
    const defaultAddresses = this.addresses.filter(addr => addr.isDefault);
    if (defaultAddresses.length === 0) {
      this.addresses[0].isDefault = true;
    } else if (defaultAddresses.length > 1) {
      // Sadece ilk varsayılan adresi bırak
      this.addresses.forEach((addr, index) => {
        if (index > 0) addr.isDefault = false;
      });
    }
  }
  
  next();
});

// Instance methods
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.generateEmailVerificationToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = crypto.createHash('sha256').update(token).digest('hex');
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 saat
  return token;
};

UserSchema.methods.generatePasswordResetToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 dakika
  return token;
};

UserSchema.methods.generatePhoneVerificationCode = function() {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  this.phoneVerificationCode = crypto.createHash('sha256').update(code).digest('hex');
  this.phoneVerificationExpires = Date.now() + 5 * 60 * 1000; // 5 dakika
  return code;
};

UserSchema.methods.incrementLoginAttempts = function() {
  // Eğer önceki kilitlenme süresi geçmişse sıfırla
  if (this.loginAttempts.lockedUntil && this.loginAttempts.lockedUntil < Date.now()) {
    return this.updateOne({
      $unset: { 'loginAttempts.lockedUntil': 1 },
      $set: { 'loginAttempts.count': 1, 'loginAttempts.lastAttempt': Date.now() }
    });
  }
  
  const updates = { 
    $inc: { 'loginAttempts.count': 1 },
    $set: { 'loginAttempts.lastAttempt': Date.now() }
  };
  
  // 5 başarısız denemeden sonra 2 saat kilitle
  if (this.loginAttempts.count + 1 >= 5 && !this.isLocked) {
    updates.$set['loginAttempts.lockedUntil'] = Date.now() + 2 * 60 * 60 * 1000;
  }
  
  return this.updateOne(updates);
};

UserSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { 
      'loginAttempts.count': 1,
      'loginAttempts.lastAttempt': 1,
      'loginAttempts.lockedUntil': 1
    }
  });
};

UserSchema.methods.updateLastLogin = function(ip, userAgent) {
  this.lastLogin = {
    date: new Date(),
    ip: ip,
    userAgent: userAgent
  };
  this.lastActiveAt = new Date();
  return this.save();
};

UserSchema.methods.addToFavorites = function(productId) {
  const exists = this.favorites.find(fav => fav.productId.toString() === productId.toString());
  if (!exists) {
    this.favorites.push({ productId });
    return this.save();
  }
  return Promise.resolve(this);
};

UserSchema.methods.removeFromFavorites = function(productId) {
  this.favorites = this.favorites.filter(fav => fav.productId.toString() !== productId.toString());
  return this.save();
};

UserSchema.methods.addAddress = function(addressData) {
  // Eğer bu ilk adres ise varsayılan yap
  if (this.addresses.length === 0) {
    addressData.isDefault = true;
  }
  
  // Eğer yeni adres varsayılan ise diğerlerini kaldır
  if (addressData.isDefault) {
    this.addresses.forEach(addr => addr.isDefault = false);
  }
  
  this.addresses.push(addressData);
  return this.save();
};

UserSchema.methods.updateAddress = function(addressId, addressData) {
  const address = this.addresses.id(addressId);
  if (!address) {
    throw new Error('Adres bulunamadı');
  }
  
  // Eğer varsayılan adres değişiyorsa diğerlerini güncelle
  if (addressData.isDefault && !address.isDefault) {
    this.addresses.forEach(addr => addr.isDefault = false);
  }
  
  Object.assign(address, addressData);
  return this.save();
};

UserSchema.methods.removeAddress = function(addressId) {
  const address = this.addresses.id(addressId);
  if (!address) {
    throw new Error('Adres bulunamadı');
  }
  
  const wasDefault = address.isDefault;
  this.addresses.pull(addressId);
  
  // Eğer varsayılan adres silindiyse ve başka adres varsa ilkini varsayılan yap
  if (wasDefault && this.addresses.length > 0) {
    this.addresses[0].isDefault = true;
  }
  
  return this.save();
};

UserSchema.methods.updateStatistics = function(orderData) {
  this.statistics.totalOrders += 1;
  this.statistics.totalSpent += orderData.total;
  this.statistics.averageOrderValue = this.statistics.totalSpent / this.statistics.totalOrders;
  this.statistics.lastOrderDate = new Date();
  
  // Kategori ve marka tercihlerini güncelle
  if (orderData.categories) {
    orderData.categories.forEach(category => {
      if (!this.statistics.favoriteCategories.includes(category)) {
        this.statistics.favoriteCategories.push(category);
      }
    });
  }
  
  if (orderData.brands) {
    orderData.brands.forEach(brand => {
      if (!this.statistics.favoriteBrands.includes(brand)) {
        this.statistics.favoriteBrands.push(brand);
      }
    });
  }
  
  // Müşteri segmentini güncelle
  this.updateCustomerSegment();
  
  return this.save();
};

UserSchema.methods.updateCustomerSegment = function() {
  const { totalOrders, totalSpent } = this.statistics;
  
  if (totalOrders === 0) {
    this.customerSegment = 'new';
  } else if (totalOrders >= 10 && totalSpent >= 5000) {
    this.customerSegment = 'premium';
  } else if (totalOrders >= 5 && totalSpent >= 2000) {
    this.customerSegment = 'vip';
  } else if (totalOrders >= 2) {
    this.customerSegment = 'regular';
  } else {
    this.customerSegment = 'new';
  }
};

UserSchema.methods.calculateProfileCompleteness = function() {
  let completeness = 0;
  
  // Temel bilgiler (40%)
  if (this.profile.firstName) completeness += 10;
  if (this.profile.lastName) completeness += 10;
  if (this.profile.phone) completeness += 10;
  if (this.isEmailVerified) completeness += 10;
  
  // Adres bilgisi (20%)
  if (this.addresses.length > 0) completeness += 20;
  
  // Profil detayları (20%)
  if (this.profile.birthDate) completeness += 10;
  if (this.profile.avatar.url) completeness += 10;
  
  // Tercihler (20%)
  if (this.preferences.notifications.email.marketing !== undefined) completeness += 10;
  if (this.gdprConsent.given) completeness += 10;
  
  this.statistics.profileCompleteness = completeness;
};

UserSchema.methods.updateCartHistory = function(cartData) {
  this.cartHistory.totalCarts += 1;
  this.cartHistory.lastCartDate = new Date();
  
  if (cartData.status === 'abandoned') {
    this.cartHistory.abandonedCarts += 1;
  } else if (cartData.status === 'completed') {
    this.cartHistory.completedCarts += 1;
  }
  
  // Ortalama sepet değeri hesapla
  if (cartData.total) {
    const totalValue = (this.cartHistory.averageCartValue * (this.cartHistory.totalCarts - 1)) + cartData.total;
    this.cartHistory.averageCartValue = totalValue / this.cartHistory.totalCarts;
  }
  
  return this.save();
};

// Static methods
UserSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

UserSchema.statics.findActiveUsers = function() {
  return this.find({ accountStatus: 'active' });
};

UserSchema.statics.findBySegment = function(segment) {
  return this.find({ customerSegment: segment });
};

UserSchema.statics.findRecentUsers = function(days = 30) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return this.find({ createdAt: { $gte: date } });
};

UserSchema.statics.findInactiveUsers = function(days = 90) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return this.find({ lastActiveAt: { $lt: date } });
};

module.exports = mongoose.model('User', UserSchema); 