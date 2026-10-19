const mongoose = require('mongoose');
const { SITE_SLUGS } = require('../../../config/sites');

const webReviewSchema = new mongoose.Schema({
    site: { type: String, enum: SITE_SLUGS, default: 'alastik', index: true },

    productKey: {
        type: String,
        required: true,
        index: true
    },

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WebMember',
        required: true,
        index: true
    },

    orderDate: {
        type: Date,
        default: null
    },

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

    comment: {
        type: String,
        required: true,
        minlength: 10,
        maxlength: 2000
    },
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

    status: {
        type: String,
        enum: ['active', 'pending', 'rejected'],
        default: 'pending'
    }

}, {
    timestamps: true,
    collection: 'webreviews'
});

webReviewSchema.index({ productKey: 1, status: 1 });
webReviewSchema.index({ userId: 1, productKey: 1 });

webReviewSchema.virtual('user', {
    ref: 'WebMember',
    localField: 'userId',
    foreignField: '_id',
    justOne: true
});

webReviewSchema.set('toJSON', { virtuals: true });
webReviewSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('WebReview', webReviewSchema);