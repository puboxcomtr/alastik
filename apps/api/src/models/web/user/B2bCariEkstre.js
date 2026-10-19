const mongoose = require('mongoose');

const movementSchema = new mongoose.Schema({
    tarih: String,
    tur: String,
    aciklama: String,
    fisno: String,
    belgeNo: String,
    vade: String,
    borc: Number,
    alacak: Number,
    odeme: Boolean,
    bakiye: Number
}, { _id: false });

const b2bCariEkstreSchema = new mongoose.Schema({
    memberId: { type: mongoose.Schema.Types.ObjectId, index: true },
    site: { type: String, default: 'b2b' },
    diaCustomerKey: { type: String },
    movements: { type: [movementSchema], default: [] },
    summary: {
        count: Number,
        openingKurus: Number,
        debitKurus: Number,
        creditKurus: Number,
        balanceKurus: Number
    },
    syncedAt: { type: Date }
}, { collection: 'b2bcariekstre' });

b2bCariEkstreSchema.index({ memberId: 1, site: 1 }, { unique: true });

module.exports = mongoose.models.B2bCariEkstre || mongoose.model('B2bCariEkstre', b2bCariEkstreSchema);
