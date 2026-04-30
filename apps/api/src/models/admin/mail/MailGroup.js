const mongoose = require('mongoose')

const mailGroupSchema = new mongoose.Schema({
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