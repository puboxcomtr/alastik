const mongoose = require('mongoose');
const { SITES, DEFAULT_SITE } = require('../../../config/sites');

const cargoSchema = new mongoose.Schema({
    // Her site için ayrı kargo tanımı (site + code benzersiz)
    site: {
        type: String,
        enum: Object.keys(SITES),
        default: DEFAULT_SITE,
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    code: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    logo: {
        type: String,
        default: ''
    },
    isActive: {
        type: Boolean,
        default: true
    },
    webOrder: {
        type: Number,
        default: 0
    },
    memberGroups: {
        type: [String],
        enum: ['member', 'guest', 'all'],
        default: []
    },
    productType: {
        type: String,
        enum: ['dia_api', 'xml_integration'],
        default: 'dia_api'
    },
    paymentType: {
        type: String,
        enum: ['sender', 'receiver'],
        default: 'sender'
    },
    fixedPrice: {
        type: Number,
        default: 0,
        min: 0
    },
    freeShippingThreshold: {
        type: Number,
        default: 0,
        min: 0
    },
    freeShippingDesiLimit: {
        type: Number,
        default: 0,
        min: 0
    },
    desiPricing: {
        ranges: {
            type: [{
                min: { type: Number, required: true, min: 0 },
                max: { type: Number, required: true, min: 0 },
                price: { type: Number, required: true, min: 0 }
            }],
            default: []
        },
        extraPerDesi: {
            type: Number,
            default: 0,
            min: 0
        }
    }
}, {
    timestamps: true,
    collection: 'webcargo'
});

cargoSchema.index({ site: 1, code: 1 }, { unique: true });
cargoSchema.index({ isActive: 1, webOrder: -1 });

module.exports = mongoose.model('Cargo', cargoSchema);