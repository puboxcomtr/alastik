const mongoose = require('mongoose');

const WebMontageCommissionSchema = new mongoose.Schema({
    site: { type: String, required: true, unique: true, trim: true },
    degisim: { type: Number, default: 0, min: 0, max: 200 },
    diger: { type: Number, default: 0, min: 0, max: 200 },
    updatedBy: { type: String, default: '' }
}, { timestamps: true, collection: 'webmontagecommissions' });

module.exports = mongoose.models.WebMontageCommission || mongoose.model('WebMontageCommission', WebMontageCommissionSchema);
