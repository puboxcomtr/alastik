const mongoose = require('mongoose')
const { SITES, DEFAULT_SITE } = require('../../../config/sites')

const mailGroupSchema = new mongoose.Schema({
    // Her site için ayrı alıcı grupları
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
    description: {
        type: String,
        trim: true,
        default: ''
    },
    emails: {
        type: [String],
        default: []
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    collection: 'mailgroups'
})

mailGroupSchema.index({ name: 1 })
mailGroupSchema.index({ isActive: 1, createdAt: -1 })

module.exports = mongoose.model('MailGroup', mailGroupSchema)