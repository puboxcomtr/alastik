const mongoose = require('mongoose');
const { SITE_SLUGS } = require('../../../config/sites');

const sliderItemSchema = new mongoose.Schema({
    image: {
        type: String,
        required: true
    },
    order: {
        type: Number,
        default: 0
    },
    description: String,
    link: String,
    isActive: {
        type: Boolean,
        default: true
    },
    openNewTab: {
        type: Boolean,
        default: false
    }
}, { _id: false });

const sliderSchema = new mongoose.Schema({
    site: { type: String, enum: SITE_SLUGS, default: 'alastik', index: true },
    site: { type: String, enum: SITE_SLUGS, default: 'alastik', index: true },
    name: {
        type: String,
        required: true
    },
    sliders: [sliderItemSchema],
    settings: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true,
    collection: 'sliders'
});

module.exports = mongoose.model('WebSlider', sliderSchema);