const mongoose = require('mongoose');
const { SITE_SLUGS } = require('../../../config/sites');

// B2B bayi başvurusu — login sayfasındaki Yeni Başvuru Formu kayıtları.
// Başvuru yalnız FORMDUR: hesap/şifre oluşturmaz; bayilik DIA'da açılır (8 Eyl kararı).
const webB2BApplicationSchema = new mongoose.Schema({
    site: { type: String, enum: SITE_SLUGS, required: true, index: true },

    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, default: '', trim: true },
    city: { type: String, required: true, trim: true },
    district: { type: String, default: '', trim: true },
    address: { type: String, default: '', trim: true },
    companyName: { type: String, default: '', trim: true },
    taxOffice: { type: String, default: '', trim: true },
    taxNumber: { type: String, default: '', trim: true },
    message: { type: String, default: '', trim: true },

    // Bayilik bilgileri
    yearsOfExperience: { type: String, default: '', trim: true },  // sektör tecrübesi (yıl)
    monthlySalesVolume: { type: String, default: '', trim: true }, // aylık ortalama satış adeti
    brands: { type: [String], default: [] },                       // çalıştığı markalar
    wantsBrandedSignage: { type: Boolean, default: false },        // LastikJantAVM tabelalı bayilik
    termsAccepted: { type: Boolean, default: false },              // sözleşme koşulları onayı

    status: { type: String, enum: ['new', 'reviewed', 'approved', 'rejected'], default: 'new', index: true },
    adminNote: { type: String, default: '' },

    // İstek kaynağı (temel iz)
    ip: { type: String, default: '' }
}, {
    timestamps: true,
    collection: 'webb2bapplications'
});

webB2BApplicationSchema.index({ site: 1, createdAt: -1 });

module.exports = mongoose.model('WebB2BApplication', webB2BApplicationSchema);
