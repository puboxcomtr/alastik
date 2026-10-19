const mongoose = require('mongoose');
const { SITE_SLUGS } = require('../../../config/sites');

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

    yearsOfExperience: { type: String, default: '', trim: true },
    monthlySalesVolume: { type: String, default: '', trim: true },
    brands: { type: [String], default: [] },
    wantsBrandedSignage: { type: Boolean, default: false },
    termsAccepted: { type: Boolean, default: false },

    status: { type: String, enum: ['new', 'reviewed', 'approved', 'rejected'], default: 'new', index: true },
    adminNote: { type: String, default: '' },

    ip: { type: String, default: '' }
}, {
    timestamps: true,
    collection: 'webb2bapplications'
});

webB2BApplicationSchema.index({ site: 1, createdAt: -1 });

module.exports = mongoose.model('WebB2BApplication', webB2BApplicationSchema);
