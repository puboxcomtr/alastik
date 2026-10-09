// Montaj Noktası (Bayi) Bilgi ve Fiyat Formu cevapları.
// Bayi başına TEK kayıt: aynı (site + birinci telefon) ile yeniden gönderilirse üzerine yazılır; fiyat geçmişi tutulmaz.
// Mevcut montaj noktası kayıtlarından (webmontagepoints) bağımsızdır; sitedeki fiyatlara yansımaz.
const mongoose = require('mongoose');

const webDealerFormSchema = new mongoose.Schema({
    site: { type: String, required: true, index: true },
    telefonAnahtar: { type: String, required: true },          // birinci telefonun yalnız rakamları
    bayiAdi: { type: String, required: true, trim: true },
    cityId: { type: String, default: '' },
    cityName: { type: String, default: '' },
    districtId: { type: String, default: '' },
    districtName: { type: String, default: '' },
    adres: { type: String, default: '' },
    telefon1: { type: String, default: '' },
    telefon2: { type: String, default: '' },
    saatler: { type: mongoose.Schema.Types.Mixed, default: {} },
    fiyatlar: { type: mongoose.Schema.Types.Mixed, default: {} },   // { anahtar (kod, nokta yerine _): sayı | 'vermiyorum' }
    tesis: { type: mongoose.Schema.Types.Mixed, default: {} },
    gonderimSayisi: { type: Number, default: 1 },
    ilkGonderim: { type: Date, default: Date.now },
    sonGuncelleme: { type: Date, default: Date.now, index: true },
    ip: { type: String, default: '' }
}, { timestamps: true, collection: 'webdealerforms', minimize: false });

webDealerFormSchema.index({ site: 1, telefonAnahtar: 1 }, { unique: true });

module.exports = mongoose.model('WebDealerForm', webDealerFormSchema);
