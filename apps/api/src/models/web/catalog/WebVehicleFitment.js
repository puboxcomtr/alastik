// Araç uyumluluk verisi (marka + model başına bir kayıt) — kaynak: Wheel-Size API (Avrupa pazarı, eudm).
// scripts/wheelsize-fitment-sync.js ile doldurulur; /api/vehicles rotaları ve web'deki /arac sayfaları okur.
// Siteden bağımsızdır (araç verisi iki site için ortaktır; stok/uyum hesabı site bazında yapılır).
const mongoose = require('mongoose');

const tireSchema = new mongoose.Schema({
    tire: String,          // "205/55R16"
    tireFull: String,      // "205/55R16 91V"
    width: Number,
    aspect: Number,
    diameter: Number,      // jant çapı (inç)
    loadIndex: Number,
    speedIndex: String,
    rim: String,           // "6.5Jx16 ET39"
    rimWidth: Number,
    rimOffset: Number,
    pressureBar: Number
}, { _id: false });

const wheelSchema = new mongoose.Schema({
    oe: Boolean,           // fabrika çıkışı (orijinal) ebat mı
    winter: Boolean,       // kış için önerilen
    runflat: Boolean,
    steel: Boolean,        // sac (çelik) jant
    front: tireSchema,
    rear: { type: tireSchema, default: null } // arka farklıysa
}, { _id: false });

const modificationSchema = new mongoose.Schema({
    slug: String,
    trim: String,          // "1.3 MultiJet"
    startYear: Number,
    endYear: Number,
    fuel: String,
    powerHp: Number,
    engineCode: String,
    tireType: String,      // Passenger / SUV / LT ...
    boltPattern: String,   // "5x98"
    studHoles: Number,
    pcd: Number,
    centreBore: Number,
    threadSize: String,
    fastenerType: String,
    wheels: [wheelSchema]
}, { _id: false });

const generationSchema = new mongoose.Schema({
    slug: String,
    name: String,          // "VI"
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
    // Sayfalarda ve aramada hızlı kullanım için özet
    summary: {
        yearFrom: Number,
        yearTo: Number,
        oeTireSizes: [String],        // fabrika ebatları, en yaygından aza
        optionalTireSizes: [String],  // alternatif (uyumlu) ebatlar
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
