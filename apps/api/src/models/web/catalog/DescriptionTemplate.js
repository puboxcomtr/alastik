const mongoose = require('mongoose');
const { SITE_SLUGS } = require('../../../config/sites');

const descriptionTemplateSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },

    content: {
        type: String,
        default: ''
    },

    models: {
        type: [String],
        default: []
    },

    isActive: {
        type: Boolean,
        default: true
    },

    lastAppliedAt: {
        type: Date,
        default: null
    },
    appliedCount: {
        type: Number,
        default: 0
    },

    site: {
        type: String,
        enum: SITE_SLUGS,
        default: 'alastik',
        required: true,
        index: true
    }
}, {
    timestamps: true,
    collection: 'descriptiontemplates'
});

descriptionTemplateSchema.index({ site: 1, name: 1 });
descriptionTemplateSchema.index({ site: 1, models: 1 });
descriptionTemplateSchema.index({ site: 1, isActive: 1 });

module.exports = mongoose.model('DescriptionTemplate', descriptionTemplateSchema);