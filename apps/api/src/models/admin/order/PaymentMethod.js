const mongoose = require('mongoose');
const { SITES, DEFAULT_SITE } = require('../../../config/sites');

const paymentMethodSchema = new mongoose.Schema({
    site: {
        type: String,
        enum: Object.keys(SITES),
        default: DEFAULT_SITE,
        required: true,
        index: true
    },

    type: {
        type: String,
        required: true,
        enum: ['credit_card', 'bank_transfer', 'cash_on_delivery'],
        index: true
    },

    provider: {
        type: String,
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
        trim: true
    },

    isActive: {
        type: Boolean,
        default: false,
        index: true
    },

    isDeleted: {
        type: Boolean,
        default: false,
        index: true
    },

    deletedAt: Date,
    deletedBy: String,
    deleteReason: String,

    priority: {
        type: Number,
        default: 0,
        index: true
    },

    providerMeta: {
        displayName: String,
        logo: String,
        color: String,
        icon: String
    },

    apiCredentials: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },

    creditCardSettings: {
        mode: {
            type: String,
            enum: ['test', 'live', 'sandbox'],
            default: 'live'
        },
        apiUrl: String,
        has3DSecure: {
            type: Boolean,
            default: true
        },
        hasInstallment: {
            type: Boolean,
            default: true
        },
        installmentRates: [{
            installment: Number,
            rate: Number
        }],
        installmentBanks: [{
            _id: false,
            vPosId: Number,
            displayName: String,
            logo: String
        }],
        minInstallmentAmount: {
            type: Number,
            default: 100
        },
        maxInstallment: {
            type: Number,
            default: 12
        },
        supportedCurrency: [String],
        commission: {
            type: Number,
            default: 0
        }
    },

    bankTransferSettings: {
        accountName: String,
        accountNumber: String,
        branchName: String,
        branchCode: String,
        iban: {
            type: String,
            uppercase: true,
            trim: true
        },
        swift: String,
        instructions: String,
        confirmationRequired: {
            type: Boolean,
            default: true
        },
        processingTime: {
            type: String,
            default: '1-2 iş günü'
        }
    },

    stats: {
        totalOrders: {
            type: Number,
            default: 0
        },
        totalAmount: {
            type: Number,
            default: 0
        },
        successfulOrders: {
            type: Number,
            default: 0
        },
        failedOrders: {
            type: Number,
            default: 0
        },
        lastUsedAt: Date
    }

}, {
    timestamps: true,
    collection: 'paymentmethods'
});

paymentMethodSchema.index({ type: 1, provider: 1 });
paymentMethodSchema.index({ type: 1, isActive: 1, isDeleted: 1 });
paymentMethodSchema.index({ priority: 1, isActive: 1 });

paymentMethodSchema.virtual('isOperational').get(function () {
    return this.isActive && !this.isDeleted;
});

paymentMethodSchema.virtual('successRate').get(function () {
    const total = this.stats.successfulOrders + this.stats.failedOrders;
    if (total === 0) return 0;
    return ((this.stats.successfulOrders / total) * 100).toFixed(2);
});

paymentMethodSchema.statics.getActivePaymentMethods = function (type = null, site = DEFAULT_SITE) {
    const query = {
        isActive: true,
        isDeleted: false,
        site: SITES[site] ? site : DEFAULT_SITE
    };

    if (type) {
        query.type = type;
    }

    return this.find(query).sort({ priority: 1 });
};

paymentMethodSchema.statics.getCreditCardMethods = function (site = DEFAULT_SITE) {
    return this.find({
        type: 'credit_card',
        isActive: true,
        isDeleted: false,
        site: SITES[site] ? site : DEFAULT_SITE
    }).sort({ priority: 1 });
};

paymentMethodSchema.statics.getBankTransferMethods = function (site = DEFAULT_SITE) {
    return this.find({
        type: 'bank_transfer',
        isActive: true,
        isDeleted: false,
        site: SITES[site] ? site : DEFAULT_SITE
    }).sort({ priority: 1 });
};
paymentMethodSchema.pre('save', function (next) {
    if (this.bankTransferSettings?.iban) {
        this.bankTransferSettings.iban = this.bankTransferSettings.iban
            .replace(/\s/g, '')
            .toUpperCase();
    }
    next();
});

module.exports = mongoose.model('PaymentMethod', paymentMethodSchema);