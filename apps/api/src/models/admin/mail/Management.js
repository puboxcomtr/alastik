const mongoose = require('mongoose')

const managementSchema = new mongoose.Schema({
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

managementSchema.index({ isActive: 1, createdAt: -1 })
managementSchema.index({ recipientType: 1 })

module.exports = mongoose.model('MailManagement', managementSchema)