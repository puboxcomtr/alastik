const mongoose = require('mongoose');

const webWheelSizeSchema = new mongoose.Schema({
    patternSlug: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    patternName: {
        type: String,
        required: true
    },
    brandSlug: {
        type: String,
        required: true,
        index: true
    },

    productKeys: [{
        type: String
    }],

    wheelsizeData: {
        ratings: { type: mongoose.Schema.Types.Mixed, default: null },
        buyNotBuy: { type: mongoose.Schema.Types.Mixed, default: null },
        materials: { type: mongoose.Schema.Types.Mixed, default: null }
    },

    syncStatus: {
        type: String,
        enum: ['pending', 'synced', 'error'],
        default: 'pending'
    },
    lastSync: Date

}, {
    timestamps: true,
    collection: 'webwheelsize'
});

webWheelSizeSchema.index({ patternSlug: 1 }, { unique: true });
webWheelSizeSchema.index({ syncStatus: 1 });

module.exports = mongoose.model('WebWheelSize', webWheelSizeSchema);