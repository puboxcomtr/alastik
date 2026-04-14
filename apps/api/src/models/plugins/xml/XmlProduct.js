const mongoose = require('mongoose');

const xmlProductSchema = new mongoose.Schema({
    source: { type: String, required: true, index: true },
    sourceProductId: { type: String, required: true },
    rawData: { type: mongoose.Schema.Types.Mixed, required: true },
    mappedData: { type: mongoose.Schema.Types.Mixed, default: null },
    status: { type: String, enum: ['pending', 'mapped', 'dia_matched', 'error'], default: 'pending' },
    syncHash: { type: String, default: null },
    errorMessage: { type: String, default: null },
    lastFetchedAt: { type: Date, default: Date.now },
    lastMappedAt: { type: Date, default: null },
    lastSyncedToDiaAt: { type: Date, default: null },
    diaKey: { type: String, default: null },
    diaDataHash: { type: String, default: null },

    diaData: { type: mongoose.Schema.Types.Mixed, default: null }
}, { timestamps: true, collection: 'xmlproducts' });

xmlProductSchema.index({ source: 1, sourceProductId: 1 }, { unique: true });
xmlProductSchema.index({ status: 1 });
xmlProductSchema.index({ lastFetchedAt: -1 });

module.exports = mongoose.model('XmlProduct', xmlProductSchema);
