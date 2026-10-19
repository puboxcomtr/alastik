const mongoose = require('mongoose');

const formSchema = new mongoose.Schema({
    formType: {
        type: String,
        enum: ['contact', 'quote', 'support', 'newsletter', 'custom'],
        default: 'contact'
    },

    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    phone: {
        type: String,
        trim: true,
        default: ''
    },
    company: {
        type: String,
        trim: true,
        default: ''
    },

    subject: {
        type: String,
        trim: true,
        default: ''
    },
    message: {
        type: String,
        required: true
    },

    sourceUrl: {
        type: String,
        required: true
    },
    referrerUrl: {
        type: String,
        default: ''
    },
    userAgent: {
        type: String,
        default: ''
    },
    ipAddress: {
        type: String,
        default: ''
    },

    extraData: {
        type: Map,
        of: String,
        default: {}
    },

    status: {
        type: String,
        enum: ['new', 'read', 'replied', 'archived'],
        default: 'new'
    },

    adminNotes: {
        type: String,
        default: ''
    },

    readAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

formSchema.index({ email: 1 });
formSchema.index({ status: 1 });
formSchema.index({ formType: 1 });
formSchema.index({ createdAt: -1 });
formSchema.index({ sourceUrl: 1 });

module.exports = mongoose.model('Form', formSchema);