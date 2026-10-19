const mongoose = require('mongoose');
const { SITES, DEFAULT_SITE } = require('../../../config/sites');

const webMontagePointSchema = new mongoose.Schema({
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
    city: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    cityId: {
        type: String,
        default: ''
    },
    district: {
        type: String,
        default: '',
        trim: true
    },
    districtId: {
        type: String,
        default: ''
    },
    address: {
        type: String,
        default: '',
        trim: true
    },
    phone: {
        type: String,
        default: '',
        trim: true
    },
    workingHours: {
        type: String,
        default: '',
        trim: true
    },
    workingSchedule: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        .reduce((acc, day) => {
            acc[day] = {
                open: { type: String, default: '' },
                close: { type: String, default: '' }
            };
            return acc;
        }, {}),
    services: {
        type: [{
            _id: false,
            productKey: { type: String, default: '' },
            sku: { type: String, default: '' },
            name: { type: String, required: true, trim: true },
            defaultPrice: { type: Number, default: 0 },
            price: { type: Number, default: null }
        }],
        default: []
    },
    amenities: {
        type: [String],
        enum: ['wc', 'waiting_room', 'wifi', 'air_conditioning', 'refreshments', 'oil_change', 'headlight_check'],
        default: []
    },
    image: {
        type: String,
        default: ''
    },
    documents: {
        type: [{
            _id: false,
            name: { type: String, required: true, trim: true },
            url: { type: String, required: true, trim: true },
            originalName: { type: String, default: '', trim: true },
            uploadedAt: { type: Date, default: Date.now }
        }],
        default: []
    },
    reviews: {
        type: [{
            memberName: { type: String, default: 'sistem', trim: true },
            comment: { type: String, default: '', trim: true },
            processRating: { type: Number, min: 1, max: 5, default: 5 },
            locationRating: { type: Number, min: 1, max: 5, default: 5 },
            createdAt: { type: Date, default: Date.now }
        }],
        default: []
    },
    location: {
        lat: { type: Number, default: null },
        lng: { type: Number, default: null }
    },
    showPublicInfo: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    order: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true,
    collection: 'webmontagepoints'
});

webMontagePointSchema.index({ site: 1, isActive: 1, city: 1, order: 1 });

module.exports = mongoose.model('WebMontagePoint', webMontagePointSchema);
