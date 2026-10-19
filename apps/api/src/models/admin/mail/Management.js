const mongoose = require('mongoose')
const { SITES, DEFAULT_SITE } = require('../../../config/sites')

const managementSchema = new mongoose.Schema({
    site: {
        type: String,
        enum: Object.keys(SITES),
        default: DEFAULT_SITE,
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    subject: {
        type: String,
        required: true,
        trim: true
    },
    body: {
        type: String,
        required: true
    },
    recipientType: {
        type: String,
        enum: ['mail_group', 'user', 'single_email'],
        required: true,
        default: 'single_email'
    },
    recipientValue: {
        type: [String],
        required: true,
        default: []
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastSentAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true,
    collection: 'webcustommail'
})

managementSchema.index({ site: 1, isActive: 1, createdAt: -1 })
managementSchema.index({ recipientType: 1 })

module.exports = mongoose.model('MailManagement', managementSchema)