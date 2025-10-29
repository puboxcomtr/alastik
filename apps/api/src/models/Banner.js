const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
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
        unique: true,
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

bannerSchema.index({ variableKey: 1 }, { unique: true });
bannerSchema.index({ status: 1, order: 1 });

module.exports = mongoose.model('Banner', bannerSchema);