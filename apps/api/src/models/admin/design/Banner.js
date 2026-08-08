const mongoose = require('mongoose');
const { SITES, DEFAULT_SITE } = require('../../../config/sites');

const bannerSchema = new mongoose.Schema({
    // Her site için ayrı banner seti (site + variableKey benzersiz)
    site: {
        type: String,
        enum: Object.keys(SITES),
        default: DEFAULT_SITE,
        required: true,
        index: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    redirectUrl: {
        type: String,
        trim: true
    },
    altTag: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    openNewTab: {
        type: Boolean,
        default: false
    },
    image: {
        type: String,
        required: true
    },
    variableKey: {
        type: String,
        required: true,
        trim: true
    },
    order: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true,
    collection: 'banners'
});

bannerSchema.index({ site: 1, variableKey: 1 }, { unique: true });
bannerSchema.index({ status: 1, order: 1 });

module.exports = mongoose.model('Banner', bannerSchema);