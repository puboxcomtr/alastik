// DİA Sipariş Entegrasyonu Ayarları
export interface DiaSiparisSettings {
    // Vitrin siparişinin DİA'ya gönderilmesi açık mı
    aktif: boolean
    // Siparişin yazılacağı firma/dönem — 0 ise bağlantı ayarındakiler kullanılır
    firmaKodu: number
    donemKodu: number
    // DİA iç kayıt anahtarları (_key); kod alanlarından farklıdır
    subeKey: number
    depoKey: number
    // Her müşteri için ayrı cari mi, tek genel cari mi
    cariModu: 'musteri' | 'tekCari'
    genelCariKodu: string
    // Cari hesap kodu öneki (örn. 'LJA-120.01.'); doluysa kod '<önek><ay>.<rastgele>' üretilir
    cariKodOnek: string
    // Yeni cari kartına yazılacak Özel Kod 1 (_key) — firma ayarında zorunlu olabilir
    cariOzelKod1Key: number
    // Yeni cari kartına yazılacak Yetki/Seviye Kodu (_key) — firma ayarında zorunlu olabilir
    cariSeviyeKodKey: number
    // Sipariş başlığına yazılacak Satış Elemanı (_key)
    satisElemaniKey: number
    // Siparişe yazılacak kargo firması (krg_firma _key)
    kargoFirmaKey: number
    // Kargo bedeli hizmet kartı (_key): doluysa kargo ücreti siparişe ayrı satır olarak yazılır
    kargoHizmetKartKey: number
    // Sipariş başlığına yazılacak Yetki/Seviye Kodu (_key) — cari yetki kodundan ayrıdır
    siparisSeviyeKodKey: number
    // Ödeme şekline göre DIA Ödeme Planı anahtarları (_key)
    odemePlaniTekCekimKey: number
    odemePlaniTaksitliKey: number
    odemePlaniHavaleKey: number
    // Şirketler arası akış (fiziki stok kaynak firmada olan siteler için)
    sirketlerArasiAktif: boolean
    kaynakFirmaKodu: number
    kaynakDonemKodu: number
    kaynakSubeKey: number
    kaynakDepoKeys: string
    kaynakCikisDepoKey: number
    kaynakSatisElemaniKey: number
    kaynakOdemePlaniKey: number
    kaynakSeviyeKodKey: number
    araCariKodu: string
    tedarikciCariKodu: string
    tedarikciOdemePlaniKey: number
    sirketlerArasiFiyatNo: number
    // Sipariş aktarımından sonra otomatik satış faturası kes (stok çıkışı faturayla oluşur)
    faturaOtomatik: boolean
    // Faturanın stok düşeceği depolar (_key, virgülle, öncelik sırasına göre)
    faturaDepoKeys: string
    // Fatura başlığına yazılacak Yetki/Seviye Kodu (_key)
    faturaSeviyeKodKey: number
    // Fatura kalemleri siparişi kapatsın mı (Tamamı Sevk Edilmiş)
    faturaSiparisiKapatsin: boolean
    // Aktarımın tetikleneceği an
    tetikleme: 'odemeAlininca' | 'siparisOlusunca'
}

// DİA Senkronizasyon Ayarları
export interface DiaSyncSettings {
    urunAdlariniGuncelle: boolean
    fiyatGuncellemeKapat: boolean
    urunAciklamalari: boolean
    kategoriGuncellemeKapat: boolean
    fullSyncSaat: string
    lightSyncAraligi: number
    durumFiltre: string
    ozelkod11Filtre: string
    b2cFiltre: string
    b2bFiltre: string
    hashKontrol: boolean
}

// Aktarım Ayarları (ürün gösterim filtresi)
export type DiaAktarimMode = 'tumu' | 'dahil' | 'haric'
export type DiaAktarimFilterType = 'urun' | 'kategori' | 'marka'

export interface DiaAktarimProduct {
    id: string
    name: string
    sku: string
    brand: string
}

export interface DiaAktarimNamedItem {
    id: string
    name: string
}

export interface DiaAktarimSettings {
    mode: DiaAktarimMode
    filterType: DiaAktarimFilterType
    products: DiaAktarimProduct[]
    categories: DiaAktarimNamedItem[]
    brands: DiaAktarimNamedItem[]
}

// Her Zaman Dahil — durum dışındaki kurallara ve "Hariç Bırak" listesine bakılmaksızın
// aktarılacak kalemler. Aktarım Ayarları'ndan farkı: mode yoktur (her zaman dahil eder) ve
// ürün / kategori / marka listelerinin hepsi birlikte değerlendirilir.
export interface DiaZorunluDahilSettings {
    filterType: DiaAktarimFilterType
    products: DiaAktarimProduct[]
    categories: DiaAktarimNamedItem[]
    brands: DiaAktarimNamedItem[]
}

// DİA Ana Ayarlar
export interface DiaSettings {
    baseURL: string
    apiKey: string
    username: string
    password: string
    firmaKodu: number
    donemKodu: number
    siparis: DiaSiparisSettings
    aktarim: DiaAktarimSettings
    zorunluDahil: DiaZorunluDahilSettings
    sync: DiaSyncSettings
}

// Bağlantı Durumu
export type DiaConnectionStatus = 'idle' | 'success' | 'error'

// API Yanıt Tipi
export interface DiaSettingsResponse {
    success: boolean
    data?: DiaSettings
    message?: string
}

// Bağlantı Test İsteği
export interface DiaTestConnectionPayload {
    baseURL: string
    apiKey: string
    username: string
    password: string
    firmaKodu: number
    donemKodu: number
}

// Varsayılan Ayarlar
export const defaultDiaSettings: DiaSettings = {
    baseURL: '',
    apiKey: '',
    username: '',
    password: '',
    firmaKodu: 1,
    donemKodu: 2,
    siparis: {
        aktif: false,
        firmaKodu: 0,
        donemKodu: 0,
        subeKey: 0,
        depoKey: 0,
        cariModu: 'musteri',
        genelCariKodu: '',
        cariKodOnek: '',
        cariOzelKod1Key: 0,
        cariSeviyeKodKey: 0,
        satisElemaniKey: 0,
        kargoFirmaKey: 0,
        kargoHizmetKartKey: 0,
        siparisSeviyeKodKey: 0,
        odemePlaniTekCekimKey: 0,
        odemePlaniTaksitliKey: 0,
        odemePlaniHavaleKey: 0,
        sirketlerArasiAktif: false,
        kaynakFirmaKodu: 0,
        kaynakDonemKodu: 0,
        kaynakSubeKey: 0,
        kaynakDepoKeys: '',
        kaynakCikisDepoKey: 0,
        kaynakSatisElemaniKey: 0,
        kaynakOdemePlaniKey: 0,
        kaynakSeviyeKodKey: 0,
        araCariKodu: '',
        tedarikciCariKodu: '',
        tedarikciOdemePlaniKey: 0,
        sirketlerArasiFiyatNo: 5,
        faturaOtomatik: false,
        faturaDepoKeys: '',
        faturaSeviyeKodKey: 0,
        faturaSiparisiKapatsin: false,
        tetikleme: 'odemeAlininca'
    },
    aktarim: {
        mode: 'tumu',
        filterType: 'urun',
        products: [],
        categories: [],
        brands: []
    },
    zorunluDahil: {
        filterType: 'kategori',
        products: [],
        categories: [],
        brands: []
    },
    sync: {
        urunAdlariniGuncelle: true,
        fiyatGuncellemeKapat: false,
        urunAciklamalari: true,
        kategoriGuncellemeKapat: false,
        fullSyncSaat: '05:00',
        lightSyncAraligi: 15,
        durumFiltre: 'A',
        ozelkod11Filtre: 'E',
        b2cFiltre: '',
        b2bFiltre: '',
        hashKontrol: true
    }
}