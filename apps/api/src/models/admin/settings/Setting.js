const mongoose = require('mongoose');
const { SITES, DEFAULT_SITE } = require('../../../config/sites');

const settingSchema = new mongoose.Schema({
    site: {
        type: String,
        enum: Object.keys(SITES),
        default: DEFAULT_SITE,
        required: true,
        index: true
    },
    key: {
        type: String,
        required: true,
        trim: true
    },
    value: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    group: {
        type: String,
        enum: ['order', 'showcase', 'member', 'campaign', 'connections'],
        default: 'general'
    },
    type: {
        type: String,
        enum: ['string', 'number', 'boolean', 'json'],
        default: 'string'
    },
    description: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

settingSchema.index({ site: 1, key: 1 }, { unique: true });
settingSchema.index({ site: 1, group: 1 });

module.exports = mongoose.model('Setting', settingSchema);