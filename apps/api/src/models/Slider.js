const mongoose = require('mongoose');

const sliderItemSchema = new mongoose.Schema({
    image: String,
    order: { type: Number, default: 0 },
    description: String,
    link: String,
    isActive: { type: Boolean, default: true },
    openNewTab: { type: Boolean, default: false }
}, { _id: false });

const sliderSettingsSchema = new mongoose.Schema({
    width: String,
    height: String,
    changeSpeed: String,
    displayDuration: String,
    showDescription: Boolean,
    showNavButtons: Boolean,
    showDots: Boolean,
    isActive: Boolean,
    autoStart: Boolean,
    notes: String
}, { _id: false });

const sliderSchema = new mongoose.Schema({
    name: { type: String, required: true },
    sliders: [sliderItemSchema],
    settings: sliderSettingsSchema
}, {
    timestamps: true,
    collection: 'sliders'
});

module.exports = mongoose.model('Slider', sliderSchema);