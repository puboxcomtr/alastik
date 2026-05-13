/**
 * WebXml Model
 * Dosya: apps/api/src/models/plugins/xml/WebXml.js
 */

const mongoose = require('mongoose');

// Credentials Schema
const credentialsSchema = new mongoose.Schema({
    apiKey: { type: String, default: '' },
    appKey: { type: String, default: '' },
    secretKey: { type: String, default: '' },
    token: { type: String, default: '' },
    userName: { type: String, default: '' },
    password: { type: String, default: '' },
    companyCode: { type: String, default: '' }
}, { _id: false });

// Sync Info Schema
const syncInfoSchema = new mongoose.Schema({
    lastSyncAt: { type: Date, default: null },
    lastSyncStatus: {
        type: String,
        enum: ['success', 'error', 'pending', null],
        default: null
    },
    lastSyncType: {
        type: String,
        enum: ['auto', 'manual', null],
        default: null
    },
    lastSyncMessage: { type: String, default: '' },
    lastSyncDuration: { type: Number, default: 0 },
    productCount: { type: Number, default: 0 }
}, { _id: false });

// ============================================
// RULES - Filtreleme ve Eşleştirme Kuralları
// (Ana schema'dan ÖNCE tanımlanmalı!)
// ============================================

// Field Mapping Schema
const fieldMappingSchema = new mongoose.Schema({
    source: { type: String, required: true },
    target: { type: String, required: true }
}, { _id: false });

// Filters Schema  
const filtersSchema = new mongoose.Schema({
    onlyInStock: { type: Boolean, default: false },
    onlyActive: { type: Boolean, default: false },
    onlyWithImage: { type: Boolean, default: false },
    onlyWithPrice: { type: Boolean, default: false }
}, { _id: false });

// Rules Schema
const rulesSchema = new mongoose.Schema({
    fieldMappings: [fieldMappingSchema],
    excludedCategories: [{ type: String }],
    excludedBrands: [{ type: String }],
    excludedYears: [{ type: String }],
    minStock: { type: Number, default: 0 },
    filters: filtersSchema
}, { _id: false });

// ============================================
// Ana WebXml Schema
// ============================================
const webXmlSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    code: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    apiUrl: {
        type: String,
        required: true
    },
    format: {
        type: String,
        enum: ['json', 'xml', 'csv'],
        default: 'json'
    },
    credentials: credentialsSchema,
    isActive: {
        type: Boolean,
        default: false
    },
    syncInterval: {
        type: Number,
        default: 180,
        min: 15,
        max: 900
    },
    syncInfo: {
        type: syncInfoSchema,
        default: () => ({})
    },
    dataPath: {
        type: String,
        default: ''
    },
    rules: {
        type: rulesSchema,
        default: () => ({})
    },
    notes: {
        type: String,
        default: ''
    },
    excludeFromWebSync: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    collection: 'webxml'
});

// Index'ler
webXmlSchema.index({ code: 1 }, { unique: true });
webXmlSchema.index({ isActive: 1 });
webXmlSchema.index({ 'syncInfo.lastSyncAt': -1 });

// Virtual: Sonraki sync zamanı
webXmlSchema.virtual('nextSyncAt').get(function () {
    if (!this.syncInfo.lastSyncAt || !this.isActive) return null;
    const next = new Date(this.syncInfo.lastSyncAt);
    next.setMinutes(next.getMinutes() + this.syncInterval);
    return next;
});

// Static: Aktif entegrasyonları getir
webXmlSchema.statics.getActiveIntegrations = function () {
    return this.find({ isActive: true });
};

// Static: Sync zamanı gelmiş entegrasyonları getir
webXmlSchema.statics.getDueForSync = function () {
    const now = new Date();
    return this.find({
        isActive: true,
        $or: [
            { 'syncInfo.lastSyncAt': null },
            {
                $expr: {
                    $lt: [
                        { $add: ['$syncInfo.lastSyncAt', { $multiply: ['$syncInterval', 60000] }] },
                        now
                    ]
                }
            }
        ]
    });
};

module.exports = mongoose.model('WebXml', webXmlSchema);