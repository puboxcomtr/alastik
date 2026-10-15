const mongoose = require('mongoose');

// Montaj noktası komisyon oranları (site başına tek kayıt). Anlaşmalı noktanın girdiği fiyatın ÜSTÜNE eklenir;
// kendi şubelerimize (showPublicInfo) uygulanmaz. Hesap: utils/montagePricing.js
const WebMontageCommissionSchema = new mongoose.Schema({
    site: { type: String, required: true, unique: true, trim: true },
    // Değişim ücretleri: lastik montajı, yazlık-kışlık / yerinde / mobil değişim
    degisim: { type: Number, default: 0, min: 0, max: 200 },
    // Diğer hizmetler: sibop, rot, pres, depolama, far, nitrojen…
    diger: { type: Number, default: 0, min: 0, max: 200 },
    updatedBy: { type: String, default: '' }
}, { timestamps: true, collection: 'webmontagecommissions' });

module.exports = mongoose.models.WebMontageCommission || mongoose.model('WebMontageCommission', WebMontageCommissionSchema);
