const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  // Temel bilgiler
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  
  // Değerlendirme detayları
  rating: {
    overall: {
      type: Number,
      required: true,
      min: [1, 'Genel puan en az 1 olmalıdır'],
      max: [5, 'Genel puan en fazla 5 olabilir']
    },
    quality: {
      type: Number,
      min: [1, 'Kalite puanı en az 1 olmalıdır'],
      max: [5, 'Kalite puanı en fazla 5 olabilir']
    },
    value: {
      type: Number,
      min: [1, 'Fiyat/performans puanı en az 1 olmalıdır'],
      max: [5, 'Fiyat/performans puanı en fazla 5 olabilir']
    },
    durability: {
      type: Number,
      min: [1, 'Dayanıklılık puanı en az 1 olmalıdır'],
      max: [5, 'Dayanıklılık puanı en fazla 5 olabilir']
    },
    comfort: {
      type: Number,
      min: [1, 'Konfor puanı en az 1 olmalıdır'],
      max: [5, 'Konfor puanı en fazla 5 olabilir']
    }
  },
  
  // Yorum
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Başlık 100 karakterden uzun olamaz']
  },
  
  comment: {
    type: String,
    required: true,
    trim: true,
    minlength: [10, 'Yorum en az 10 karakter olmalıdır'],
    maxlength: [1000, 'Yorum 1000 karakterden uzun olamaz']
  },
  
  // Kullanım bilgileri
  usage: {
    vehicleType: {
      type: String,
      enum: ['sedan', 'hatchback', 'suv', 'truck', 'van', 'motorcycle', 'other']
    },
    vehicleBrand: String,
    vehicleModel: String,
    vehicleYear: Number,
    drivingStyle: {
      type: String,
      enum: ['city', 'highway', 'mixed', 'sport', 'off-road']
    },
    usagePeriod: {
      type: String,
      enum: ['less_than_month', '1-3_months', '3-6_months', '6-12_months', 'more_than_year']
    },
    mileage: Number // Kaç km kullandı
  },
  
  // Avantaj/Dezavantajlar
  pros: [{
    type: String,
    trim: true,
    maxlength: [100, 'Avantaj 100 karakterden uzun olamaz']
  }],
  
  cons: [{
    type: String,
    trim: true,
    maxlength: [100, 'Dezavantaj 100 karakterden uzun olamaz']
  }],
  
  // Fotoğraflar
  images: [{
    url: {
      type: String,
      required: true
    },
    caption: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Durum ve moderasyon
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'hidden'],
    default: 'pending'
  },
  
  isVerifiedPurchase: {
    type: Boolean,
    default: false
  },
  
  moderation: {
    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminUser'
    },
    moderatedAt: Date,
    reason: String,
    autoModerated: {
      type: Boolean,
      default: false
    },
    flags: [{
      type: String,
      enum: ['spam', 'inappropriate', 'fake', 'offensive', 'irrelevant']
    }]
  },
  
  // Etkileşim
  helpfulness: {
    helpful: {
      type: Number,
      default: 0
    },
    notHelpful: {
      type: Number,
      default: 0
    },
    votes: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      vote: {
        type: String,
        enum: ['helpful', 'not_helpful']
      },
      votedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  
  // Yanıtlar (mağaza yanıtı)
  response: {
    comment: String,
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminUser'
    },
    respondedAt: Date
  },
  
  // Meta bilgiler
  source: {
    type: String,
    enum: ['web', 'mobile', 'email_invite'],
    default: 'web'
  },
  
  language: {
    type: String,
    default: 'tr'
  },
  
  // Ürün snapshot (ürün silinse bile görünsün)
  productSnapshot: {
    name: String,
    brand: String,
    model: String,
    size: String,
    price: Number,
    image: String
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
  
  publishedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
ReviewSchema.index({ productId: 1, status: 1, createdAt: -1 });
ReviewSchema.index({ userId: 1, createdAt: -1 });
ReviewSchema.index({ 'rating.overall': 1 });
ReviewSchema.index({ status: 1, publishedAt: -1 });
ReviewSchema.index({ isVerifiedPurchase: 1 });

// Bir kullanıcı bir ürün için sadece bir değerlendirme yapabilir
ReviewSchema.index({ userId: 1, productId: 1 }, { unique: true });

// Virtual fields
ReviewSchema.virtual('averageRating').get(function() {
  const ratings = [
    this.rating.overall,
    this.rating.quality,
    this.rating.value,
    this.rating.durability,
    this.rating.comfort
  ].filter(r => r !== undefined);
  
  return ratings.length > 0 ? 
    ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : 
    this.rating.overall;
});

ReviewSchema.virtual('helpfulnessRatio').get(function() {
  const total = this.helpfulness.helpful + this.helpfulness.notHelpful;
  return total > 0 ? this.helpfulness.helpful / total : 0;
});

ReviewSchema.virtual('isHelpful').get(function() {
  return this.helpfulness.helpful > this.helpfulness.notHelpful;
});

ReviewSchema.virtual('daysSinceReview').get(function() {
  return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24));
});

// Middleware
ReviewSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Onaylandığında publish date'i set et
  if (this.status === 'approved' && !this.publishedAt) {
    this.publishedAt = Date.now();
  }
  
  next();
});

// Ürün snapshot'ını kaydet
ReviewSchema.pre('save', async function(next) {
  if (this.isNew && this.productId) {
    try {
      const Product = mongoose.model('Product');
      const product = await Product.findById(this.productId);
      
      if (product) {
        this.productSnapshot = {
          name: product.name,
          brand: product.brand,
          model: product.model,
          size: product.specifications?.size,
          price: product.price,
          image: product.images?.[0]?.url
        };
      }
    } catch (error) {
      console.error('Error saving product snapshot:', error);
    }
  }
  next();
});

// Static methods
ReviewSchema.statics.getProductReviews = function(productId, options = {}) {
  const { 
    page = 1, 
    limit = 10, 
    sortBy = 'newest',
    rating,
    verified = null 
  } = options;
  
  const query = { 
    productId, 
    status: 'approved' 
  };
  
  if (rating) {
    query['rating.overall'] = rating;
  }
  
  if (verified !== null) {
    query.isVerifiedPurchase = verified;
  }
  
  let sort = {};
  switch (sortBy) {
    case 'newest':
      sort = { publishedAt: -1 };
      break;
    case 'oldest':
      sort = { publishedAt: 1 };
      break;
    case 'highest_rating':
      sort = { 'rating.overall': -1, publishedAt: -1 };
      break;
    case 'lowest_rating':
      sort = { 'rating.overall': 1, publishedAt: -1 };
      break;
    case 'most_helpful':
      sort = { 'helpfulness.helpful': -1, publishedAt: -1 };
      break;
  }
  
  return this.find(query)
    .populate('userId', 'profile.firstName profile.lastName profile.avatar')
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit);
};

ReviewSchema.statics.getProductRatingStats = function(productId) {
  return this.aggregate([
    { 
      $match: { 
        productId: mongoose.Types.ObjectId(productId), 
        status: 'approved' 
      } 
    },
    {
      $group: {
        _id: null,
        totalReviews: { $sum: 1 },
        averageRating: { $avg: '$rating.overall' },
        ratingDistribution: {
          $push: '$rating.overall'
        }
      }
    },
    {
      $project: {
        totalReviews: 1,
        averageRating: { $round: ['$averageRating', 1] },
        ratingCounts: {
          5: {
            $size: {
              $filter: {
                input: '$ratingDistribution',
                cond: { $eq: ['$$this', 5] }
              }
            }
          },
          4: {
            $size: {
              $filter: {
                input: '$ratingDistribution',
                cond: { $eq: ['$$this', 4] }
              }
            }
          },
          3: {
            $size: {
              $filter: {
                input: '$ratingDistribution',
                cond: { $eq: ['$$this', 3] }
              }
            }
          },
          2: {
            $size: {
              $filter: {
                input: '$ratingDistribution',
                cond: { $eq: ['$$this', 2] }
              }
            }
          },
          1: {
            $size: {
              $filter: {
                input: '$ratingDistribution',
                cond: { $eq: ['$$this', 1] }
              }
            }
          }
        }
      }
    }
  ]);
};

ReviewSchema.statics.getUserReviews = function(userId, options = {}) {
  const { page = 1, limit = 10 } = options;
  
  return this.find({ userId })
    .populate('productId', 'name brand model images')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
};

// Instance methods
ReviewSchema.methods.addHelpfulVote = function(userId, vote) {
  // Önceki oyunu kaldır
  this.helpfulness.votes = this.helpfulness.votes.filter(
    v => v.userId.toString() !== userId.toString()
  );
  
  // Yeni oyunu ekle
  this.helpfulness.votes.push({
    userId,
    vote,
    votedAt: new Date()
  });
  
  // Sayıları güncelle
  const helpfulVotes = this.helpfulness.votes.filter(v => v.vote === 'helpful').length;
  const notHelpfulVotes = this.helpfulness.votes.filter(v => v.vote === 'not_helpful').length;
  
  this.helpfulness.helpful = helpfulVotes;
  this.helpfulness.notHelpful = notHelpfulVotes;
  
  return this.save();
};

ReviewSchema.methods.addResponse = function(comment, respondedBy) {
  this.response = {
    comment,
    respondedBy,
    respondedAt: new Date()
  };
  return this.save();
};

ReviewSchema.methods.moderate = function(status, reason, moderatedBy) {
  this.status = status;
  this.moderation.moderatedBy = moderatedBy;
  this.moderation.moderatedAt = new Date();
  this.moderation.reason = reason;
  
  return this.save();
};

module.exports = mongoose.model('Review', ReviewSchema);