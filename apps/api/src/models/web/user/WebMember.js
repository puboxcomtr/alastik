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
    // Varsayılan şifre (12345) ile giriş yapıldıysa true → panelde zorunlu şifre değiştirme
    mustChangePassword: { type: Boolean, default: false },
    lastLoginAt: Date,
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockedUntil: Date,

    // Şifre Sıfırlama
    resetPasswordToken: String,
    resetPasswordExpire: Date,

    // E-posta Aktivasyonu
    activationToken: String,
    activationTokenExpire: Date,

    // DIA cari eşleşmesi (ilk sipariş aktarımında doldurulur)
    diaCustomerKey: String,
    diaCustomerCode: String,

    // DIA cari bilgileri — worker'da periyodik sync ile DIA'dan çekilir (b2b).
    // Uçlar (cari-özet, segment) canlı DIA yerine buradan okur.
    diaCari: {
        bakiyeKurus: { type: Number, default: 0 },
        borcKurus: { type: Number, default: 0 },
        alacakKurus: { type: Number, default: 0 },
        riskLimitiKurus: { type: Number, default: 0 },
        segment: { type: String, default: '' }, // ozelkod2 (ör. F4)
        syncedAt: { type: Date },
        // Faturadan türetilen finansal veri (b2b finans senkronu, günlük) — uçlar
        // (/alim-adet, /vade-takvimi, /cari-ozet overdue) canlı DIA yerine bunu okur.
        purchaseStats: { type: mongoose.Schema.Types.Mixed }, // { revenue, quantity, totals, years }
        dueItems: {
            type: [{ date: String, amount: Number, invoiceNo: String }],
            default: undefined
        },
        // Fatura bazlı vade durumu (yaşlandırma) — /vade-durumu ucu buradan okur
        agingItems: {
            type: [{
                issueDate: String, dueDate: String, invoiceNo: String,
                totalKurus: Number, paidKurus: Number, remainingKurus: Number
            }],
            default: undefined
        },
        overdueKurus: { type: Number }, // vadesi geçen borç (FIFO)
        financeSyncedAt: { type: Date },
        // Cari adresleri (fatura + teslimat) — mapDiaAddresses biçiminde; /adresler buradan okur
        addresses: {
            type: [{
                id: String, baslik: String, teslimat: Boolean, ana: Boolean,
                adres: String, il: String, ilce: String, telefon: String
            }],
            default: undefined
        },
        addressesSyncedAt: { type: Date }
    },

    // Panelden verilen etiketler ve not (Üyeler sayfası)
    adminTags: { type: [String], default: [] },
    adminNote: { type: String, default: '' }

}, {
    timestamps: true,
    collection: 'webmembers'
});
// Index'ler
webMemberSchema.index({ email: 1, site: 1 }, { unique: true });
webMemberSchema.index({ phone: 1 });
webMemberSchema.index({ status: 1 });
webMemberSchema.index({ createdAt: -1 });
webMemberSchema.index({ resetPasswordToken: 1 });
webMemberSchema.index({ activationToken: 1 });

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