const mongoose = require('mongoose');
const crypto = require('crypto');

const SessionSchema = new mongoose.Schema({
  // Session ID
  sessionId: {
    type: String,
    required: true
  },
  
  // Kullanıcı referansı
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    sparse: true
  },
  
  // Session durumu
  status: {
    type: String,
    enum: ['active', 'expired', 'terminated', 'merged'],
    default: 'active'
  },
  
  // Session tipi
  type: {
    type: String,
    enum: ['guest', 'authenticated', 'admin'],
    default: 'guest'
  },
  
  // Session metadata
  metadata: {
    ipAddress: {
      type: String,
      required: true
    },
    userAgent: {
      type: String,
      required: true
    },
    browser: {
      name: String,
      version: String
    },
    device: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet'],
      default: 'desktop'
    },
    os: {
      name: String,
      version: String
    },
    location: {
      country: String,
      city: String,
      region: String,
      timezone: String
    },
    referrer: String,
    utm: {
      source: String,
      medium: String,
      campaign: String,
      term: String,
      content: String
    }
  },
  
  // Session aktivitesi
  activity: {
    pageViews: {
      type: Number,
      default: 0
    },
    lastPageView: {
      url: String,
      timestamp: Date
    },
    totalDuration: {
      type: Number,
      default: 0 // milliseconds
    },
    lastActivity: {
      type: Date,
      default: Date.now
    },
    actions: [{
      type: {
        type: String,
        enum: ['page_view', 'product_view', 'cart_add', 'cart_remove', 'search', 'login', 'logout', 'checkout'],
        required: true
      },
      details: mongoose.Schema.Types.Mixed,
      timestamp: {
        type: Date,
        default: Date.now
      }
    }]
  },
  
  // Session verileri
  data: {
    // Shopping cart ID
    cartId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cart'
    },
    
    // Wishlist items
    wishlist: [{
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
      },
      addedAt: {
        type: Date,
        default: Date.now
      }
    }],
    
    // Recently viewed products
    recentlyViewed: [{
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
      },
      viewedAt: {
        type: Date,
        default: Date.now
      }
    }],
    
    // Search history
    searchHistory: [{
      query: String,
      results: Number,
      timestamp: {
        type: Date,
        default: Date.now
      }
    }],
    
    // Custom data
    custom: mongoose.Schema.Types.Mixed
  },
  
  // Session preferences
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
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'light'
    },
    notifications: {
      enabled: {
        type: Boolean,
        default: true
      },
      sound: {
        type: Boolean,
        default: false
      }
    }
  },
  
  // Session security
  security: {
    fingerprint: String,
    isSecure: {
      type: Boolean,
      default: false
    },
    isTrusted: {
      type: Boolean,
      default: false
    },
    riskScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    flags: [{
      type: String,
      enum: ['suspicious_activity', 'multiple_locations', 'bot_detected', 'fraud_risk'],
      timestamp: {
        type: Date,
        default: Date.now
      }
    }]
  },
  
  // Session expiration
  expiresAt: {
    type: Date,
    default: function() {
      // Guest sessions expire after 24 hours
      return new Date(Date.now() + 24 * 60 * 60 * 1000);
    }
  },
  
  // Merge information
  mergedTo: {
    sessionId: String,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    mergedAt: Date
  },
  
  // Conversion tracking
  conversion: {
    hasConverted: {
      type: Boolean,
      default: false
    },
    conversionType: {
      type: String,
      enum: ['purchase', 'signup', 'newsletter', 'download']
    },
    conversionValue: Number,
    conversionDate: Date,
    touchpoints: [{
      channel: String,
      source: String,
      medium: String,
      campaign: String,
      timestamp: Date
    }]
  },
  
  // Session analytics
  analytics: {
    bounceRate: Number,
    sessionDepth: Number,
    engagementScore: Number,
    conversionProbability: Number,
    customerLifetimeValue: Number
  },
  
  // Oturumun açıldığı site (ziyaret istatistikleri site bazlı tutulur)
  site: {
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
  
  terminatedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
SessionSchema.index({ sessionId: 1 }, { unique: true });
SessionSchema.index({ userId: 1 });
SessionSchema.index({ status: 1 });
SessionSchema.index({ type: 1 });
SessionSchema.index({ expiresAt: 1 });
SessionSchema.index({ 'activity.lastActivity': -1 });
SessionSchema.index({ 'metadata.ipAddress': 1 });
SessionSchema.index({ createdAt: -1 });

// Virtual fields
SessionSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

SessionSchema.virtual('isActive').get(function() {
  return this.status === 'active' && !this.isExpired;
});

SessionSchema.virtual('duration').get(function() {
  if (this.terminatedAt) {
    return this.terminatedAt - this.createdAt;
  }
  return Date.now() - this.createdAt;
});

SessionSchema.virtual('isAuthenticated').get(function() {
  return this.type === 'authenticated' && this.userId;
});

SessionSchema.virtual('recentActivity').get(function() {
  return this.activity.actions.slice(-10);
});

// Middleware
SessionSchema.pre('save', function(next) {
  // Update timestamp
  this.updatedAt = Date.now();
  
  // Update last activity
  this.activity.lastActivity = new Date();
  
  // Calculate session duration
  if (this.terminatedAt) {
    this.activity.totalDuration = this.terminatedAt - this.createdAt;
  }
  
  // Limit activity history
  if (this.activity.actions.length > 100) {
    this.activity.actions = this.activity.actions.slice(-100);
  }
  
  // Limit recently viewed
  if (this.data.recentlyViewed.length > 20) {
    this.data.recentlyViewed = this.data.recentlyViewed.slice(-20);
  }
  
  // Limit search history
  if (this.data.searchHistory.length > 50) {
    this.data.searchHistory = this.data.searchHistory.slice(-50);
  }
  
  next();
});

// Instance methods
SessionSchema.methods.generateSessionId = function() {
  this.sessionId = crypto.randomBytes(32).toString('hex');
  return this.sessionId;
};

SessionSchema.methods.updateActivity = function(actionType, details = {}) {
  this.activity.actions.push({
    type: actionType,
    details: details,
    timestamp: new Date()
  });
  
  this.activity.lastActivity = new Date();
  this.activity.pageViews += actionType === 'page_view' ? 1 : 0;
  
  return this.save();
};

SessionSchema.methods.addToWishlist = function(productId) {
  const exists = this.data.wishlist.find(item => 
    item.productId.toString() === productId.toString()
  );
  
  if (!exists) {
    this.data.wishlist.push({ productId });
    return this.save();
  }
  
  return Promise.resolve(this);
};

SessionSchema.methods.removeFromWishlist = function(productId) {
  this.data.wishlist = this.data.wishlist.filter(item => 
    item.productId.toString() !== productId.toString()
  );
  
  return this.save();
};

SessionSchema.methods.addToRecentlyViewed = function(productId) {
  // Remove if already exists
  this.data.recentlyViewed = this.data.recentlyViewed.filter(item => 
    item.productId.toString() !== productId.toString()
  );
  
  // Add to beginning
  this.data.recentlyViewed.unshift({ productId });
  
  // Keep only last 20
  if (this.data.recentlyViewed.length > 20) {
    this.data.recentlyViewed = this.data.recentlyViewed.slice(0, 20);
  }
  
  return this.save();
};

SessionSchema.methods.addToSearchHistory = function(query, results) {
  this.data.searchHistory.push({
    query: query,
    results: results,
    timestamp: new Date()
  });
  
  // Keep only last 50
  if (this.data.searchHistory.length > 50) {
    this.data.searchHistory = this.data.searchHistory.slice(-50);
  }
  
  return this.save();
};

SessionSchema.methods.authenticate = function(userId) {
  this.userId = userId;
  this.type = 'authenticated';
  
  // Extend session for authenticated users
  this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  
  // Tek save: updateActivity zaten save çağırır
  return this.updateActivity('login', { userId });
};

SessionSchema.methods.terminate = function() {
  this.status = 'terminated';
  this.terminatedAt = new Date();
  
  // Tek save: updateActivity zaten save çağırır
  return this.updateActivity('logout');
};

SessionSchema.methods.expire = function() {
  this.status = 'expired';
  this.terminatedAt = new Date();
  
  return this.save();
};

SessionSchema.methods.merge = function(targetSession) {
  // Merge cart
  if (this.data.cartId && targetSession.data.cartId) {
    // Cart merge logic will be handled by Cart model
  } else if (this.data.cartId) {
    targetSession.data.cartId = this.data.cartId;
  }
  
  // Merge wishlist
  this.data.wishlist.forEach(item => {
    const exists = targetSession.data.wishlist.find(w => 
      w.productId.toString() === item.productId.toString()
    );
    if (!exists) {
      targetSession.data.wishlist.push(item);
    }
  });
  
  // Merge recently viewed
  this.data.recentlyViewed.forEach(item => {
    targetSession.addToRecentlyViewed(item.productId);
  });
  
  // Merge search history
  targetSession.data.searchHistory.push(...this.data.searchHistory);
  
  // Mark this session as merged
  this.status = 'merged';
  this.mergedTo = {
    sessionId: targetSession.sessionId,
    userId: targetSession.userId,
    mergedAt: new Date()
  };
  
  return Promise.all([this.save(), targetSession.save()]);
};

SessionSchema.methods.calculateRiskScore = function() {
  let riskScore = 0;
  
  // Multiple locations
  if (this.security.flags.includes('multiple_locations')) {
    riskScore += 30;
  }
  
  // Bot detection
  if (this.security.flags.includes('bot_detected')) {
    riskScore += 50;
  }
  
  // Suspicious activity
  if (this.security.flags.includes('suspicious_activity')) {
    riskScore += 40;
  }
  
  // High activity in short time
  if (this.activity.pageViews > 100 && this.duration < 60000) {
    riskScore += 20;
  }
  
  this.security.riskScore = Math.min(riskScore, 100);
  
  return this.save();
};

SessionSchema.methods.markConversion = function(type, value = 0) {
  this.conversion.hasConverted = true;
  this.conversion.conversionType = type;
  this.conversion.conversionValue = value;
  this.conversion.conversionDate = new Date();
  
  // Tek save: updateActivity zaten save çağırır
  return this.updateActivity('conversion', { type, value });
};

SessionSchema.methods.addTouchpoint = function(channel, source, medium, campaign) {
  this.conversion.touchpoints.push({
    channel,
    source,
    medium,
    campaign,
    timestamp: new Date()
  });
  
  return this.save();
};

SessionSchema.methods.extendSession = function(hours = 24) {
  this.expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  return this.save();
};

// Static methods
SessionSchema.statics.findBySessionId = function(sessionId) {
  return this.findOne({ sessionId: sessionId, status: 'active' });
};

SessionSchema.statics.findByUserId = function(userId) {
  return this.find({ userId: userId, status: 'active' });
};

SessionSchema.statics.findExpiredSessions = function() {
  return this.find({
    status: 'active',
    expiresAt: { $lt: new Date() }
  });
};

SessionSchema.statics.findAbandonedSessions = function(hours = 24) {
  const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);
  return this.find({
    status: 'active',
    'activity.lastActivity': { $lt: cutoffDate }
  });
};

SessionSchema.statics.findHighRiskSessions = function(riskThreshold = 70) {
  return this.find({
    status: 'active',
    'security.riskScore': { $gte: riskThreshold }
  });
};

SessionSchema.statics.getSessionAnalytics = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        averageDuration: { $avg: '$activity.totalDuration' },
        averagePageViews: { $avg: '$activity.pageViews' },
        conversionRate: {
          $avg: {
            $cond: ['$conversion.hasConverted', 1, 0]
          }
        }
      }
    }
  ]);
};

SessionSchema.statics.createGuestSession = function(sessionData) {
  const session = new this({
    sessionId: crypto.randomBytes(32).toString('hex'),
    type: 'guest',
    metadata: sessionData.metadata,
    preferences: sessionData.preferences || {}
  });
  
  return session.save();
};

module.exports = mongoose.model('Session', SessionSchema); 