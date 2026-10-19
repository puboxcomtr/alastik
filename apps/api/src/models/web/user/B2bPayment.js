const mongoose = require('mongoose');

const b2bPaymentSchema = new mongoose.Schema({
    site: { type: String, required: true, index: true },
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'WebMember', required: true, index: true },
    diaCustomerKey: { type: String },
    cariKodu: { type: String },

    amountKurus: { type: Number, required: true },
    reference: { type: String, required: true, unique: true },
    paymentGuid: { type: String },

    gateway: { type: String, default: 'paynet' },
    type: { type: String, default: 'tekcekim' },
    status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending', index: true },

    installment: { type: Number },
    referenceCode: { type: String, index: true },
    transactionId: { type: String },
    authCode: { type: String },
    cardInfo: {
        lastFourDigits: { type: String },
        bankName: { type: String }
    },
    errorMessage: { type: String },
    errorCode: { type: String },
    paidAt: { type: Date },
    returnOrigin: { type: String },

    diaPosted: { type: Boolean, default: false },
    mailSent: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.models.B2bPayment || mongoose.model('B2bPayment', b2bPaymentSchema);
