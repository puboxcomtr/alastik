const mongoose = require('mongoose');

const webDealerFormSchema = new mongoose.Schema({
    site: { type: String, required: true, index: true },
    telefonAnahtar: { type: String, required: true },
    bayiAdi: { type: String, required: true, trim: true },
    cityId: { type: String, default: '' },
    cityName: { type: String, default: '' },
    districtId: { type: String, default: '' },
    districtName: { type: String, default: '' },
    adres: { type: String, default: '' },
    telefon1: { type: String, default: '' },
    telefon2: { type: String, default: '' },
    saatler: { type: mongoose.Schema.Types.Mixed, default: {} },
    fiyatlar: { type: mongoose.Schema.Types.Mixed, default: {} },
    tesis: { type: mongoose.Schema.Types.Mixed, default: {} },
    ekHizmetler: { type: String, default: '' },
    gorseller: { type: mongoose.Schema.Types.Mixed, default: {} },
    gonderimSayisi: { type: Number, default: 1 },
    ilkGonderim: { type: Date, default: Date.now },
    sonGuncelleme: { type: Date, default: Date.now, index: true },
    ip: { type: String, default: '' },
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'WebMember', index: true },
    cariKodu: { type: String, default: '' }
}, { timestamps: true, collection: 'webdealerforms', minimize: false });

webDealerFormSchema.index({ site: 1, telefonAnahtar: 1 }, { unique: true });

module.exports = mongoose.model('WebDealerForm', webDealerFormSchema);
