const mongoose = require('mongoose');
const { SITE_SLUGS } = require('../../../config/sites');
const bcrypt = require('bcrypt');

/**
 * Plasiyer (satış personeli) — DIA sistem kullanıcılarından (sis_kullanici) çekilir.
 * DIA senkronu adayları getirir; admin panelinden şifre atanan plasiyer giriş yapabilir
 * (şifresi olmayan giriş yapamaz). Şifre yalnız admin tarafından belirlenir
 * (bayi/cari akışından farklı). Upsert anahtarı: { site, diaUserKey }.
 */
const webSalespersonSchema = new mongoose.Schema({
    site: {
        type: String,
        enum: SITE_SLUGS,
        default: 'b2b',
        index: true
    },

    // DIA sis_kullanici kaynağı
    diaUserKey: { type: String, required: true, index: true }, // _key
    diaUsername: { type: String, trim: true },                 // kullaniciadi
    name: { type: String, trim: true },                        // gercekadi
    email: { type: String, lowercase: true, trim: true },      // eposta
    phone: { type: String, trim: true },                       // ceptel
    diaGroups: { type: String, trim: true },                   // uye_oldugu_gruplar
    diaTitle: { type: String, trim: true },                    // unvan
    diaStatus: { type: String, trim: true },                   // durum (A/P)

    // Admin tarafından belirlenen giriş şifresi (senkron dokunmaz).
    // Giriş kuralı basittir: şifresi atanmış plasiyer giriş yapabilir, atanmamış yapamaz.
    password: { type: String },
    // Admin sonradan görebilsin diye şifrenin geri-okunur kopyası (yalnız admin-gated uçtan döner).
    plainPassword: { type: String },
    // Varsayılan şifre (12345) ile giriş yapıldıysa true → zorunlu şifre değiştirme
    mustChangePassword: { type: Boolean, default: false },

    lastLoginAt: Date,
    diaSyncedAt: Date
}, { timestamps: true });

webSalespersonSchema.index({ site: 1, diaUserKey: 1 }, { unique: true });

webSalespersonSchema.pre('save', async function (next) {
    if (!this.isModified('password') || !this.password) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

webSalespersonSchema.methods.comparePassword = async function (candidatePassword) {
    if (!this.password) return false;
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('WebSalesperson', webSalespersonSchema);
