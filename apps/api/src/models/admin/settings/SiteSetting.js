const mongoose = require('mongoose');
const { SITE_SLUGS } = require('../../../config/sites');

const siteSettingSchema = new mongoose.Schema({
    site: {
        type: String,
        enum: SITE_SLUGS,
        default: 'alastik',
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
    category: {
        type: String,
        default: 'general'
    },
    description: {
        type: String,
        default: ''
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    collection: 'sitesettings'
});
siteSettingSchema.index({ key: 1, site: 1 }, { unique: true });
module.exports = mongoose.model('SiteSetting', siteSettingSchema);