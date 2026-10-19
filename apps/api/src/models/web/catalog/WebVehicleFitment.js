const mongoose = require('mongoose');

const tireSchema = new mongoose.Schema({
    tire: String,
    tireFull: String,
    width: Number,
    aspect: Number,
    diameter: Number,
    loadIndex: Number,
    speedIndex: String,
    rim: String,
    rimWidth: Number,
    rimOffset: Number,
    pressureBar: Number
}, { _id: false });

const wheelSchema = new mongoose.Schema({
    oe: Boolean,
    winter: Boolean,
    runflat: Boolean,
    steel: Boolean,
    front: tireSchema,
    rear: { type: tireSchema, default: null }
}, { _id: false });

const modificationSchema = new mongoose.Schema({
    slug: String,
    trim: String,
    startYear: Number,
    endYear: Number,
    fuel: String,
    powerHp: Number,
    engineCode: String,
    tireType: String,
    boltPattern: String,
    studHoles: Number,
    pcd: Number,
    centreBore: Number,
    threadSize: String,
    fastenerType: String,
    wheels: [wheelSchema]
}, { _id: false });

const generationSchema = new mongoose.Schema({
    slug: String,
    name: String,
    platform: String,
    start: Number,
    end: Number,
    bodies: [String],
    modifications: [modificationSchema]
}, { _id: false });

const webVehicleFitmentSchema = new mongoose.Schema({
    makeSlug: { type: String, required: true, index: true },
    makeName: { type: String, required: true },
    modelSlug: { type: String, required: true },
    modelName: { type: String, required: true },
    generations: [generationSchema],
    summary: {
        yearFrom: Number,
        yearTo: Number,
        oeTireSizes: [String],
        optionalTireSizes: [String],
        rimDiameters: [Number],
        boltPatterns: [String],
        centreBores: [Number],
        fuels: [String],
        bodies: [String],
        modificationCount: Number
    },
    source: { type: String, default: 'wheel-size.com/eudm' },
    syncedAt: Date
}, {
    timestamps: true,
    collection: 'vehiclefitments'
});

webVehicleFitmentSchema.index({ makeSlug: 1, modelSlug: 1 }, { unique: true });
webVehicleFitmentSchema.index({ 'summary.oeTireSizes': 1 });
webVehicleFitmentSchema.index({ 'summary.optionalTireSizes': 1 });

module.exports = mongoose.models.WebVehicleFitment || mongoose.model('WebVehicleFitment', webVehicleFitmentSchema);
