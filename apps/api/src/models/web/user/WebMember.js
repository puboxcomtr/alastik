const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const webMemberSchema = new mongoose.Schema({
    // Kişisel Bilgiler
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },

    // Onaylar
    marketingConsent: {
        type: Boolean,
        default: false
    },
    termsAccepted: {
        type: Boolean,
        required: true,
        default: false
    },

    // Durum Bilgileri
    status: {
        type: String,
        enum: ['pending', 'active', 'suspended', 'deleted'],
        default: 'pending'
    },
    activationCode: String,
    activatedAt: Date,

    // Güvenlik
    lastLoginAt: Date,
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockedUntil: Date

}, {
    timestamps: true,
    collection: 'webmembers'
});

// Index'ler
webMemberSchema.index({ email: 1 }, { unique: true });
webMemberSchema.index({ phone: 1 });
webMemberSchema.index({ status: 1 });
webMemberSchema.index({ createdAt: -1 });

// Şifre hashleme
webMemberSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Şifre karşılaştırma
webMemberSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Virtual - Tam Ad
webMemberSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`;
});

module.exports = mongoose.model('WebMember', webMemberSchema);