const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    value: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    group: {
        type: String,
        enum: ['order', 'general', 'seo', 'payment', 'email'],
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

settingSchema.index({ key: 1 }, { unique: true });
settingSchema.index({ group: 1 });

module.exports = mongoose.model('Setting', settingSchema);