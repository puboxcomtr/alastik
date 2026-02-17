// DİA Sipariş Entegrasyonu Ayarları
export interface DiaSiparisSettings {
    subeKodu: string
    depoKodu: string
    cariGrubu: string
    stopajOdemeTuru: string
    faturaTuru: string
    odemePlaniKodu: string
    seviyeKoduCari: string
    seviyeKoduSiparis: string
    ozelKod1Cari: string
    masrafMerkeziKodu: string
    projeKodu: string
}

// DİA Senkronizasyon Ayarları
export interface DiaSyncSettings {
    urunAdlariniGuncelle: boolean
    fiyatGuncellemeKapat: boolean
    urunAciklamalari: boolean
    kategoriGuncellemeKapat: boolean
    fullSyncSaat: string
    lightSyncAraligi: number
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
        subeKodu: '',
        depoKodu: '',
        cariGrubu: '',
        stopajOdemeTuru: '',
        faturaTuru: '',
        odemePlaniKodu: '',
        seviyeKoduCari: '',
        seviyeKoduSiparis: '',
        ozelKod1Cari: '',
        masrafMerkeziKodu: '',
        projeKodu: ''
    },
    sync: {
        urunAdlariniGuncelle: true,
        fiyatGuncellemeKapat: false,
        urunAciklamalari: true,
        kategoriGuncellemeKapat: false,
        fullSyncSaat: '05:00',
        lightSyncAraligi: 15
    }
}