const mongoose = require('mongoose');

const webReviewSchema = new mongoose.Schema({
    // Ürün
    productKey: {
        type: String,
        required: true,
        index: true
    },

    // Kullanıcı
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WebMember',
        required: true,
        index: true
    },

    // Sipariş Bilgisi
    orderDate: {
        type: Date,
        default: null
    },

    // Değerlendirmeler
    overallRating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },

    drivingComfort: {
        type: Number,
        min: 1,
        max: 5
    },

    noise: {
        type: Number,
        min: 1,
        max: 5
    },

    braking: {
        type: Number,
        min: 1,
        max: 5
    },

    quality: {
        type: Number,
        min: 1,
        max: 5
    },

    fuelEfficiency: {
        type: Number,
        min: 1,
        max: 5
    },

    wetGrip: {
        type: Number,
        min: 1,
        max: 5
    },
    // Kar Paleti Değerlendirmeleri
    snowGrip: {
        type: Number,
        min: 1,
        max: 5
    },
    iceGrip: {
        type: Number,
        min: 1,
        max: 5
    },
    easyMount: {
        type: Number,
        min: 1,
        max: 5
    },
    hillPerformance: {
        type: Number,
        min: 1,
        max: 5
    },
    chainComfort: {
        type: Number,
        min: 1,
        max: 5
    },
    chainQuality: {
        type: Number,
        min: 1,
        max: 5
    },

    // İçerik
    comment: {
        type: String,
        required: true,
        minlength: 10,
        maxlength: 2000
    },
    // Fake Yorum için
    displayName: {
        type: String,
        default: null
    },
    source: {
        type: String,
        default: 'ALastik'
    },

    tireSize: {
        type: String,
        required: false
    },

    mileage: {
        type: Number,
        required: false,
        min: 0
    },

    // Durum
    status: {
        type: String,
        enum: ['active', 'pending', 'rejected'],
        default: 'pending'
    }

}, {
    timestamps: true,
    collection: 'webreviews'
});

// Compound Index
webReviewSchema.index({ productKey: 1, status: 1 });
webReviewSchema.index({ userId: 1, productKey: 1 });

// Virtual - Kullanıcı bilgisi populate için
webReviewSchema.virtual('user', {
    ref: 'WebMember',
    localField: 'userId',
    foreignField: '_id',
    justOne: true
});

// JSON çıktısında virtuals'ı dahil et
webReviewSchema.set('toJSON', { virtuals: true });
webReviewSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('WebReview', webReviewSchema);