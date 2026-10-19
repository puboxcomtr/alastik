const mongoose = require('mongoose');

const webDiaSchema = new mongoose.Schema({
    site: { type: String, default: 'alastik', index: true },

    baseURL: { type: String, default: '' },
    apiKey: { type: String, default: '' },
    username: { type: String, default: '' },
    password: { type: String, default: '' },
    firmaKodu: { type: Number, default: 1 },
    donemKodu: { type: Number, default: 2 },

    webStokDepolari: { type: String, default: '' },

    b2bVarsayilanSegment: { type: String, default: '' },

    b2bPremium: {
        customCodeNo: { type: Number, default: 9 },
        matchValue: { type: String, default: 'PREMIUM' }
    },

    b2bNetPrice: {
        fields: { type: [String], default: ['ekalan7', 'ekalan9'] },
        matchValue: { type: String, default: 'NetFiyat' }
    },

    b2bOverdue: {
        blockThresholdKurus: { type: Number, default: 100000, min: 0 }
    },

    siparis: {
        aktif: { type: Boolean, default: false },

        firmaKodu: { type: Number, default: 0 },
        donemKodu: { type: Number, default: 0 },

        subeKey: { type: Number, default: 0 },
        depoKey: { type: Number, default: 0 },
        siparisDepoKeys: { type: String, default: '' },

        cariModu: { type: String, enum: ['musteri', 'tekCari'], default: 'musteri' },
        genelCariKodu: { type: String, default: '' },

        cariKodOnek: { type: String, default: '' },

        cariKodSayac: { type: Number, default: 0 },

        cariOzelKod1Key: { type: Number, default: 0 },

        cariSeviyeKodKey: { type: Number, default: 0 },

        satisElemaniKey: { type: Number, default: 0 },

        kargoFirmaKey: { type: Number, default: 0 },
        kargoHizmetKartKey: { type: Number, default: 0 },

        siparisSeviyeKodKey: { type: Number, default: 0 },

        odemePlaniTekCekimKey: { type: Number, default: 0 },
        odemePlaniTaksitliKey: { type: Number, default: 0 },
        odemePlaniHavaleKey: { type: Number, default: 0 },
        odemePlaniCariKey: { type: Number, default: 0 },
        odemePlaniCariGelAlKey: { type: Number, default: 0 },
        odemePlaniHavaleGelAlKey: { type: Number, default: 0 },
        odemePlaniTekCekimGelAlKey: { type: Number, default: 0 },
        odemePlaniTaksitliGelAlKey: { type: Number, default: 0 },
        siparisYetkiKodu: { type: String, default: '' },

        sirketlerArasiAktif: { type: Boolean, default: false },
        kaynakFirmaKodu: { type: Number, default: 0 },
        kaynakDonemKodu: { type: Number, default: 0 },
        kaynakSubeKey: { type: Number, default: 0 },
        kaynakDepoKeys: { type: String, default: '' },
        kaynakCikisDepoKey: { type: Number, default: 0 },
        kaynakSatisElemaniKey: { type: Number, default: 0 },
        kaynakOdemePlaniKey: { type: Number, default: 0 },
        kaynakSeviyeKodKey: { type: Number, default: 0 },
        araCariKodu: { type: String, default: '' },
        tedarikciCariKodu: { type: String, default: '' },
        tedarikciOdemePlaniKey: { type: Number, default: 0 },
        sirketlerArasiFiyatNo: { type: Number, default: 5 },
        sirketlerArasiHaricKategoriler: { type: [String], default: [] },

        faturaOtomatik: { type: Boolean, default: false },
        faturaDepoKeys: { type: String, default: '' },
        faturaSeviyeKodKey: { type: Number, default: 0 },

        faturaSiparisiKapatsin: { type: Boolean, default: false },

        tetikleme: {
            type: String,
            enum: ['odemeAlininca', 'siparisOlusunca'],
            default: 'odemeAlininca'
        }
    },

    aktarim: {
        mode: { type: String, enum: ['tumu', 'dahil', 'haric'], default: 'tumu' },
        filterType: { type: String, enum: ['urun', 'kategori', 'marka'], default: 'urun' },
        products: [{ _id: false, id: String, name: String, sku: String, brand: String }],
        categories: [{ _id: false, id: String, name: String }],
        brands: [{ _id: false, id: String, name: String }]
    },

    zorunluDahil: {
        filterType: { type: String, enum: ['urun', 'kategori', 'marka'], default: 'kategori' },
        products: [{ _id: false, id: String, name: String, sku: String, brand: String }],
        categories: [{ _id: false, id: String, name: String }],
        brands: [{ _id: false, id: String, name: String }]
    },

    sync: {
        urunAdlariniGuncelle: { type: Boolean, default: true },
        fiyatGuncellemeKapat: { type: Boolean, default: false },
        urunAciklamalari: { type: Boolean, default: true },
        kategoriGuncellemeKapat: { type: Boolean, default: false },
        fullSyncSaat: { type: String, default: '05:00' },
        lightSyncAraligi: { type: Number, default: 15 },
        durumFiltre: { type: String, default: 'A' },
        ozelkod11Filtre: { type: String, default: 'E' },
        b2cFiltre: { type: String, default: '' },
        b2bFiltre: { type: String, default: '' },
        cariOzelKod2Filtre: { type: String, default: '' },
        hashKontrol: { type: Boolean, default: true },
        manuelGorselKoru: { type: Boolean, default: true },
        lastCardSyncAt: { type: Date, default: null }
    },
    vitrinDepolari: {
        type: [{ ad: String, key: Number }],
        default: []
    },

    kritikStok: {
        kontrolAktif: { type: Boolean, default: false },
        esik: { type: Number, default: 5 },
        rezervasyonGun: { type: Number, default: 30 }
    }
}, {
    timestamps: true,
    collection: 'webdia'
});

webDiaSchema.statics.getSettings = async function (site = 'alastik') {
    let settings = await this.findOne({ site });

    if (!settings && site === 'alastik') {
        settings = await this.findOneAndUpdate(
            { site: { $exists: false } },
            { $set: { site: 'alastik' } },
            { new: true }
        );
    }

    if (!settings) {
        settings = await this.create({ site });
    }

    return settings;
};

webDiaSchema.statics.updateSettings = async function (data, site = 'alastik') {
    delete data.site;

    let settings = await this.getSettings(site);

    Object.assign(settings, data);

    if (data.siparis) {
        settings.siparis = { ...settings.siparis.toObject(), ...data.siparis };
    }

    if (data.sync) {
        settings.sync = { ...settings.sync.toObject(), ...data.sync };
    }

    await settings.save();

    return settings;
};

module.exports = mongoose.model('WebDia', webDiaSchema);