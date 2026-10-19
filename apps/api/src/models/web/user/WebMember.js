const mongoose = require('mongoose');
const { SITE_SLUGS } = require('../../../config/sites');
const bcrypt = require('bcrypt');

const webMemberSchema = new mongoose.Schema({

    site: {
        type: String,
        enum: SITE_SLUGS,
        default: 'alastik',
        index: true
    },

    memberNo: { type: Number },

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
        lowercase: true,    
        required: true,
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

    marketingConsent: {
        type: Boolean,
        default: false
    },
    termsAccepted: {
        type: Boolean,
        required: true,
        default: false
    },

    status: {
        type: String,
        enum: ['pending', 'active', 'suspended', 'deleted'],
        default: 'pending'
    },
    activationCode: String,
    activatedAt: Date,

    mustChangePassword: { type: Boolean, default: false },
    customPasswordSet: { type: Boolean, default: false },
    lastLoginAt: Date,
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockedUntil: Date,

    resetPasswordToken: String,
    resetPasswordExpire: Date,

    activationToken: String,
    activationTokenExpire: Date,

    diaCustomerKey: String,
    diaCustomerCode: String,

    diaCari: {
        bakiyeKurus: { type: Number, default: 0 },
        borcKurus: { type: Number, default: 0 },
        alacakKurus: { type: Number, default: 0 },
        riskLimitiKurus: { type: Number, default: 0 },
        segment: { type: String, default: '' },
        premium: { type: Boolean, default: false },
        premiumCode: { type: String, default: '' },
        diaCreatedAt: { type: Date },
        diaUpdatedAt: { type: Date },
        salespersonKey: { type: String, default: '' },
        salespersonName: { type: String, default: '' },
        salespersonUsername: { type: String, default: '' },
        paymentPlanName: { type: String, default: '' },
        paymentPlanKey: { type: Number, default: 0 },
        paymentTermDays: { type: Number, default: null },
        firmaTuru: { type: String, default: '' },
        vergiNo: { type: String, default: '' },
        vergiDairesi: { type: String, default: '' },
        tcKimlikNo: { type: String, default: '' },
        invoiceCount12m: { type: Number, default: 0 },
        syncedAt: { type: Date },
        purchaseStats: { type: mongoose.Schema.Types.Mixed },
        dueItems: {
            type: [{ date: String, amount: Number, invoiceNo: String }],
            default: undefined
        },
        agingItems: {
            type: [{
                issueDate: String, dueDate: String, invoiceNo: String,
                totalKurus: Number, paidKurus: Number, remainingKurus: Number
            }],
            default: undefined
        },
        overdueKurus: { type: Number },
        financeSyncedAt: { type: Date },
        addresses: {
            type: [{
                id: String, baslik: String, teslimat: Boolean, ana: Boolean,
                adres: String, il: String, ilce: String, telefon: String
            }],
            default: undefined
        },
        addressesSyncedAt: { type: Date }
    },

    adminTags: { type: [String], default: [] },
    adminNote: { type: String, default: '' }

}, {
    timestamps: true,
    collection: 'webmembers'
});
webMemberSchema.index({ email: 1, site: 1 }, { unique: true });
webMemberSchema.index({ site: 1, memberNo: 1 }, { unique: true, partialFilterExpression: { memberNo: { $type: 'number' } } });
webMemberSchema.index({ phone: 1 });
webMemberSchema.index({ status: 1 });
webMemberSchema.index({ createdAt: -1 });
webMemberSchema.index({ resetPasswordToken: 1 });
webMemberSchema.index({ activationToken: 1 });

webMemberSchema.pre('save', async function (next) {
    if (!this.isNew || typeof this.memberNo === 'number') return next();
    try {
        const { reserveMemberNos } = require('../../../utils/memberNo');
        this.memberNo = await reserveMemberNos(this.site, 1);
        next();
    } catch (error) {
        next(error);
    }
});

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

webMemberSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

webMemberSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`;
});

module.exports = mongoose.model('WebMember', webMemberSchema);