/**
 * B2bPayment — bayi cari borç tahsilatı (kredi kartı ile tek çekim).
 *
 * Sipariş DEĞİLDİR; carinin açık borcuna karşılık kart tahsilatıdır. Para Paynet
 * ile alınır, kayıt burada tutulur. DIA tahsilat fişi muhasebe tarafından girilir
 * (diaPosted ile takip). Kart bilgisi bu koleksiyona HİÇ yazılmaz; yalnız maskeli
 * son 4 hane + banka adı saklanır.
 */
const mongoose = require('mongoose');

const b2bPaymentSchema = new mongoose.Schema({
    site: { type: String, required: true, index: true },
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'WebMember', required: true, index: true },
    diaCustomerKey: { type: String },
    cariKodu: { type: String },

    amountKurus: { type: Number, required: true },
    reference: { type: String, required: true, unique: true }, // Paynet referenceNo
    paymentGuid: { type: String }, // dönüş doğrulaması için tek kullanımlık nonce

    gateway: { type: String, default: 'paynet' }, // paynet (peşin) | netahsilat (taksit)
    type: { type: String, default: 'tekcekim' }, // tekcekim (peşin) | taksit
    status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending', index: true },

    installment: { type: Number }, // taksit sayısı (netahsilat)
    referenceCode: { type: String, index: true }, // sağlayıcı referans (netahsilat callback eşleşmesi)
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

    // DIA tahsilat fişi işlendi mi (muhasebe) — panel takibi
    diaPosted: { type: Boolean, default: false },
    // Ödeme makbuzu maili gönderildi mi (tekrar gönderimi önler)
    mailSent: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.models.B2bPayment || mongoose.model('B2bPayment', b2bPaymentSchema);
