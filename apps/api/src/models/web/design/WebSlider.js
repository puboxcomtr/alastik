const mongoose = require('mongoose');

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