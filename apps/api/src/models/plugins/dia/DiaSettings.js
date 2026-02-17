const mongoose = require('mongoose');

const webDiaSchema = new mongoose.Schema({
    // Bağlantı Ayarları
    baseURL: { type: String, default: '' },
    apiKey: { type: String, default: '' },
    username: { type: String, default: '' },
    password: { type: String, default: '' },
    firmaKodu: { type: Number, default: 1 },
    donemKodu: { type: Number, default: 2 },

    // Sipariş Entegrasyonu
    siparis: {
        subeKodu: { type: String, default: '' },
        depoKodu: { type: String, default: '' },
        cariGrubu: { type: String, default: '' },
        stopajOdemeTuru: { type: String, default: '' },
        faturaTuru: { type: String, default: '' },
        odemePlaniKodu: { type: String, default: '' },
        seviyeKoduCari: { type: String, default: '' },
        seviyeKoduSiparis: { type: String, default: '' },
        ozelKod1Cari: { type: String, default: '' },
        masrafMerkeziKodu: { type: String, default: '' },
        projeKodu: { type: String, default: '' }
    },

    // Senkronizasyon Ayarları
    sync: {
        urunAdlariniGuncelle: { type: Boolean, default: true },
        fiyatGuncellemeKapat: { type: Boolean, default: false },
        urunAciklamalari: { type: Boolean, default: true },
        kategoriGuncellemeKapat: { type: Boolean, default: false },
        fullSyncSaat: { type: String, default: '05:00' },
        lightSyncAraligi: { type: Number, default: 15 }
    }
}, {
    timestamps: true,
    collection: 'webdia'
});

// Tek kayıt olacak, her zaman ilk kaydı döndür veya oluştur
webDiaSchema.statics.getSettings = async function () {
    let settings = await this.findOne();

    if (!settings) {
        settings = await this.create({});
    }

    return settings;
};

webDiaSchema.statics.updateSettings = async function (data) {
    let settings = await this.findOne();

    if (!settings) {
        settings = await this.create(data);
    } else {
        Object.assign(settings, data);

        if (data.siparis) {
            settings.siparis = { ...settings.siparis.toObject(), ...data.siparis };
        }

        if (data.sync) {
            settings.sync = { ...settings.sync.toObject(), ...data.sync };
        }

        await settings.save();
    }

    return settings;
};

module.exports = mongoose.model('WebDia', webDiaSchema);