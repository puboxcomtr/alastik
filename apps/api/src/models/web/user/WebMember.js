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

    // Site bazlı sıra numarası (admin detay adresi /apps/user/view/<memberNo>) — utils/memberNo
    memberNo: { type: Number },

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
    // Bayi kendi şifresini belirlediyse true. false iken giriş için CARİ KODU YETER (şifre kontrol edilmez);
    // true olunca yalnız kendi şifresi kabul edilir. Şifre değiştirme ekranı zorunlu değildir (hatırlatma).
    customPasswordSet: { type: Boolean, default: false },
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
        // Premium cari: DIA cari kartındaki özel koddan (DiaSettings.b2bPremium) her senkronda yeniden belirlenir
        premium: { type: Boolean, default: false },
        premiumCode: { type: String, default: '' },
        // DIA cari kartının açılış tarihi (_cdate) — admin cari listesinde gösterilir
        diaCreatedAt: { type: Date },
        // DIA cari kartının son değişiklik tarihi (_date) — admin listesi varsayılan sıralaması
        diaUpdatedAt: { type: Date },
        // Carinin plasiyeri (DIA satış elemanı): satiselemani + _key_scf_satiselemani;
        // username = scf_satiselemani.kullaniciadi (küçük harf) → WebSalesperson.diaUsername eşlemesi
        salespersonKey: { type: String, default: '' },
        salespersonName: { type: String, default: '' },
        salespersonUsername: { type: String, default: '' },
        // DIA cari kartındaki ödeme planı (ör. "30 GUN VADE") ve planın vade günü (m_kalemler.gun) — sepette Cari Sipariş yanında gösterilir
        paymentPlanName: { type: String, default: '' },
        // Ödeme planının DIA _key'i — Cari Sipariş DIA'ya bu planla yazılır
        paymentPlanKey: { type: Number, default: 0 },
        paymentTermDays: { type: Number, default: null },
        // Fatura bilgileri (DIA cari kartı): firma türü KRLS→kurumsal, SHS→bireysel
        firmaTuru: { type: String, default: '' },
        vergiNo: { type: String, default: '' },
        vergiDairesi: { type: String, default: '' },
        tcKimlikNo: { type: String, default: '' },
        // Son 12 ayda kesilen satış faturası sayısı (b2b finans senkronu)
        invoiceCount12m: { type: Number, default: 0 },
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
webMemberSchema.index({ site: 1, memberNo: 1 }, { unique: true, partialFilterExpression: { memberNo: { $type: 'number' } } });
webMemberSchema.index({ phone: 1 });
webMemberSchema.index({ status: 1 });
webMemberSchema.index({ createdAt: -1 });
webMemberSchema.index({ resetPasswordToken: 1 });
webMemberSchema.index({ activationToken: 1 });

// Yeni üyeye site bazlı sıra numarası
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