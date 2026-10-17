/**
 * B2bLoginFailure — bayi girişinde başarısız denemeler (destek için: "giremiyorum" diyen bayinin
 * ne yazdığını görmek). Girilen bayi kodu / e-posta / telefon olduğu gibi saklanır, ŞİFRE HİÇ YAZILMAZ.
 * Kayıtlar RETENTION_DAYS sonra MongoDB TTL ile kendiliğinden silinir.
 */
const mongoose = require('mongoose');

const RETENTION_DAYS = 90;
const FAILURE_REASONS = ['not_found', 'wrong_password', 'suspended', 'inactive'];

const b2bLoginFailureSchema = new mongoose.Schema({
    site: { type: String, required: true, index: true },
    identifier: { type: String, default: '' }, // giriş kutusuna yazılan (bayi kodu / e-posta / telefon)
    reason: { type: String, enum: FAILURE_REASONS, required: true },
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'WebMember', index: true }, // eşleşen bayi (bulunamadıysa boş)
    cariKodu: { type: String },
    ip: { type: String },
    userAgent: { type: String },
    createdAt: { type: Date, default: Date.now, expires: RETENTION_DAYS * 24 * 60 * 60 }
}, { collection: 'b2bloginfailures', versionKey: false });

b2bLoginFailureSchema.index({ site: 1, createdAt: -1 });

const B2bLoginFailure = mongoose.model('B2bLoginFailure', b2bLoginFailureSchema);
B2bLoginFailure.FAILURE_REASONS = FAILURE_REASONS;

module.exports = B2bLoginFailure;
