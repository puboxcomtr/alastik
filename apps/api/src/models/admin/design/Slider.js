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
    notes: String,
    slidesPerView: { type: Number, default: 4 },
    slidesPerViewMobile: { type: Number, default: 2 },
    slidesPerViewTablet: { type: Number, default: 2 },
    spaceBetween: { type: Number, default: 20 },
    loop: { type: Boolean, default: false }
}, { _id: false });

const sliderSchema = new mongoose.Schema({
    site: { type: String, enum: ['alastik', 'lastikjantavm'], default: 'alastik', index: true },
    name: { type: String, required: true },
    key: {
        type: String,
        unique: true,
        immutable: true,
        index: true
    },
    sliders: [sliderItemSchema],
    settings: sliderSettingsSchema
}, {
    timestamps: true,
    collection: 'sliders'
});

sliderSchema.pre('save', async function (next) {
    if (this.isNew && !this.key) {
        let baseKey = this.name
            .toLowerCase()
            .replace(/ğ/g, 'g')
            .replace(/ü/g, 'u')
            .replace(/ş/g, 's')
            .replace(/ı/g, 'i')
            .replace(/ö/g, 'o')
            .replace(/ç/g, 'c')
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '_')
            .replace(/-+/g, '_')
            .replace(/^_|_$/g, '')
            .trim();

        let finalKey = baseKey;
        let counter = 1;

        while (await mongoose.model('Slider').findOne({ key: finalKey })) {
            finalKey = `${baseKey}_${counter}`;
            counter++;
        }

        this.key = finalKey;
    }
    next();
});

module.exports = mongoose.model('Slider', sliderSchema);