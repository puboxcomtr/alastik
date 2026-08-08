const mongoose = require('mongoose');

const webDiaSchema = new mongoose.Schema({
    // Site (tenant) — her site için ayrı ayar kaydı tutulur
    site: { type: String, default: 'alastik', index: true },

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

    // Aktarım Ayarları (ürün gösterim filtresi)
    aktarim: {
        mode: { type: String, enum: ['tumu', 'dahil', 'haric'], default: 'tumu' },
        filterType: { type: String, enum: ['urun', 'kategori', 'marka'], default: 'urun' },
        products: [{ _id: false, id: String, name: String, sku: String, brand: String }],
        categories: [{ _id: false, id: String, name: String }],
        brands: [{ _id: false, id: String, name: String }]
    },

    // Senkronizasyon Ayarları
    sync: {
        urunAdlariniGuncelle: { type: Boolean, default: true },
        fiyatGuncellemeKapat: { type: Boolean, default: false },
        urunAciklamalari: { type: Boolean, default: true },
        kategoriGuncellemeKapat: { type: Boolean, default: false },
        fullSyncSaat: { type: String, default: '05:00' },
        lightSyncAraligi: { type: Number, default: 15 },
        // DIA'dan çekim kuralları (eski hardcoded filtrelerin DB karşılığı)
        durumFiltre: { type: String, default: 'A' },        // boş = durum filtresi yok
        ozelkod11Filtre: { type: String, default: 'E' },    // boş = ozelkod11 filtresi yok
        b2cFiltre: { type: String, default: '' },           // boş = b2c_gonder filtresi yok (DIA "B2C Göster")
        hashKontrol: { type: Boolean, default: true },      // değişmeyen ürünleri hash ile atla
        lastCardSyncAt: { type: Date, default: null }       // tarih filtreli kart senkronunun son başarılı başlangıç zamanı
    }
}, {
    timestamps: true,
    collection: 'webdia'
});

// Site başına tek kayıt; yoksa oluştur. Eski (site alanı olmayan) kayıt alastik'e devredilir.
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