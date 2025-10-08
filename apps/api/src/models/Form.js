const mongoose = require('mongoose');

const formSchema = new mongoose.Schema({
    // Form Bilgileri
    formType: {
        type: String,
        enum: ['contact', 'quote', 'support', 'newsletter', 'custom'],
        default: 'contact'
    },

    // Kişisel Bilgiler
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

    // Mesaj
    subject: {
        type: String,
        trim: true,
        default: ''
    },
    message: {
        type: String,
        required: true
    },

    // İstek Bilgileri
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

    // Extra Data (özel form alanları için)
    extraData: {
        type: Map,
        of: String,
        default: {}
    },

    // Durum
    status: {
        type: String,
        enum: ['new', 'read', 'replied', 'archived'],
        default: 'new'
    },

    // Notlar (admin için)
    adminNotes: {
        type: String,
        default: ''
    },

    // Okunma tarihi
    readAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Indexes
formSchema.index({ email: 1 });
formSchema.index({ status: 1 });
formSchema.index({ formType: 1 });
formSchema.index({ createdAt: -1 });
formSchema.index({ sourceUrl: 1 });

module.exports = mongoose.model('Form', formSchema);