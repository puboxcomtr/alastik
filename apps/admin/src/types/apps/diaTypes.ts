export interface DiaSiparisSettings {
    aktif: boolean
    firmaKodu: number
    donemKodu: number
    subeKey: number
    depoKey: number
    cariModu: 'musteri' | 'tekCari'
    genelCariKodu: string
    cariKodOnek: string
    cariOzelKod1Key: number
    cariSeviyeKodKey: number
    satisElemaniKey: number
    kargoFirmaKey: number
    kargoHizmetKartKey: number
    siparisSeviyeKodKey: number
    odemePlaniTekCekimKey: number
    odemePlaniTaksitliKey: number
    odemePlaniHavaleKey: number
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
    faturaOtomatik: boolean
    faturaDepoKeys: string
    faturaSeviyeKodKey: number
    faturaSiparisiKapatsin: boolean
    tetikleme: 'odemeAlininca' | 'siparisOlusunca'
}

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

export interface DiaZorunluDahilSettings {
    filterType: DiaAktarimFilterType
    products: DiaAktarimProduct[]
    categories: DiaAktarimNamedItem[]
    brands: DiaAktarimNamedItem[]
}

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

export type DiaConnectionStatus = 'idle' | 'success' | 'error'

export interface DiaSettingsResponse {
    success: boolean
    data?: DiaSettings
    message?: string
}

export interface DiaTestConnectionPayload {
    baseURL: string
    apiKey: string
    username: string
    password: string
    firmaKodu: number
    donemKodu: number
}

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