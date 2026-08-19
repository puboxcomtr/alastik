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
        // Vitrinde oluşan siparişin DIA'ya gönderilmesi açık mı
        aktif: { type: Boolean, default: false },

        // Siparişin yazılacağı DIA firması/dönemi. Bağlantı ayarındaki firmaKodu
        // stok senkronu içindir; sipariş farklı bir firmaya düşebilir.
        // Boş (0) bırakılırsa bağlantı ayarındaki değerler kullanılır.
        firmaKodu: { type: Number, default: 0 },
        donemKodu: { type: Number, default: 0 },

        // DIA'nın iç kayıt anahtarları (_key). Kod alanlarından farklıdır.
        subeKey: { type: Number, default: 0 },
        depoKey: { type: Number, default: 0 },

        // Cari politikası: her müşteri için ayrı cari mi açılsın, yoksa
        // tüm siparişler tek bir genel cariye mi yazılsın
        cariModu: { type: String, enum: ['musteri', 'tekCari'], default: 'musteri' },
        genelCariKodu: { type: String, default: '' },

        // Cari hesap kodu öneki (örn. 'LJA-120.01.'). Doluysa cari kodu
        // '<önek><ay>.<6 haneli sıra no>' biçiminde üretilir; boşsa telefon
        // tabanlı eski üretim kullanılır.
        cariKodOnek: { type: String, default: '' },

        // Cari kod sıra sayacı: her yeni cari için atomik olarak 1 artırılır
        // (findOneAndUpdate $inc). Son üretilen sıra numarasını tutar.
        cariKodSayac: { type: Number, default: 0 },

        // Yeni açılan cari kartına yazılacak Özel Kod 1 (DIA _key değeri).
        // Firma ayarında zorunluysa boş bırakılamaz (örn. PERAKENDE)
        cariOzelKod1Key: { type: Number, default: 0 },

        // Yeni açılan cari kartına yazılacak Yetki/Seviye Kodu (DIA _key değeri).
        // Firma ayarında zorunluysa boş bırakılamaz (örn. 2026E-TİCARET)
        cariSeviyeKodKey: { type: Number, default: 0 },

        // Sipariş başlığına yazılacak Satış Elemanı (DIA _key değeri, örn. B2C)
        satisElemaniKey: { type: Number, default: 0 },

        // Siparişe yazılacak kargo firması (DIA krg_firma _key, örn. ARAS KARGO)
        kargoFirmaKey: { type: Number, default: 0 },

        // Sipariş başlığına yazılacak Yetki/Seviye Kodu (DIA _key değeri).
        // Cari yetki kodundan farklı bir kayıttır (örn. sipariş 2026E-TİCARET)
        siparisSeviyeKodKey: { type: Number, default: 0 },

        // Ödeme şekline göre DIA Ödeme Planı anahtarları (_key):
        // kredi kartı tek çekim / kredi kartı taksitli / banka havalesi
        odemePlaniTekCekimKey: { type: Number, default: 0 },
        odemePlaniTaksitliKey: { type: Number, default: 0 },
        odemePlaniHavaleKey: { type: Number, default: 0 },

        // ŞİRKETLER ARASI AKIŞ — fiziki stok kaynak firmada olan siteler için
        // (örn. ALastik/firma 2: mal Artvin Ticaret/firma 1'den alınır).
        // Zincir: kaynak firmada depo transferi → kaynak firmadan ara cariye satış
        // faturası (fiyatNo ile) → bu firmaya tedarikçiden alış faturası → müşteri faturası
        sirketlerArasiAktif: { type: Boolean, default: false },
        kaynakFirmaKodu: { type: Number, default: 0 },
        kaynakDonemKodu: { type: Number, default: 0 },
        kaynakSubeKey: { type: Number, default: 0 },
        // Transfer kaynak depoları (öncelik sırasıyla, virgülle) ve hedef/çıkış deposu
        kaynakDepoKeys: { type: String, default: '' },
        kaynakCikisDepoKey: { type: Number, default: 0 },
        kaynakSatisElemaniKey: { type: Number, default: 0 },
        kaynakOdemePlaniKey: { type: Number, default: 0 },
        kaynakSeviyeKodKey: { type: Number, default: 0 },
        // Kaynak firmadaki alıcı cari (bu şirketin kendisi) ve bu firmadaki satıcı cari
        araCariKodu: { type: String, default: '' },
        tedarikciCariKodu: { type: String, default: '' },
        tedarikciOdemePlaniKey: { type: Number, default: 0 },
        // Şirketler arası faturada kullanılacak fiyat alanı (stok kartı birimlerindeki fiyatN)
        sirketlerArasiFiyatNo: { type: Number, default: 5 },

        // Sipariş aktarımından sonra otomatik satış faturası kes (stok çıkışı faturayla oluşur)
        faturaOtomatik: { type: Boolean, default: false },
        // Faturanın stok düşeceği depolar (_key, virgülle, öncelik sırasına göre).
        // Her kalem için sırayla stok bakılır; yeterli stoğu olan ilk depo kullanılır
        faturaDepoKeys: { type: String, default: '' },
        // Fatura başlığına yazılacak Yetki/Seviye Kodu (_key)
        faturaSeviyeKodKey: { type: Number, default: 0 },

        // Fatura kalemleri sipariş kalemlerine bağlansın mı: açıksa DIA siparişi
        // "Tamamı Sevk Edilmiş" olur (alastik); kapalıysa açık kalır (lastikjantavm)
        faturaSiparisiKapatsin: { type: Boolean, default: false },

        // Aktarımın tetikleneceği an
        tetikleme: {
            type: String,
            enum: ['odemeAlininca', 'siparisOlusunca'],
            default: 'odemeAlininca'
        }
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