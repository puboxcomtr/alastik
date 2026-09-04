// Türkiye'nin 81 ili: il merkezi koordinatları + eşleştirme için ASCII adlar.
// Geo-ip servisleri "Istanbul", sipariş adresleri "İstanbul" der; normalize() ikisini de aynı anahtara indirger.

export type TurkeyProvince = {
    /** Türkçe resmi ad */
    name: string
    /** ASCII (İngilizce/geo-ip) ad */
    ascii: string
    /** Alternatif yazımlar (eski ad, kısaltma vb.) */
    aliases?: string[]
    lat: number
    lng: number
}

const TURKISH_CHAR_MAP: Record<string, string> = {
    ç: 'c',
    Ç: 'c',
    ğ: 'g',
    Ğ: 'g',
    ı: 'i',
    I: 'i',
    İ: 'i',
    i: 'i',
    ö: 'o',
    Ö: 'o',
    ş: 's',
    Ş: 's',
    ü: 'u',
    Ü: 'u',
    â: 'a',
    Â: 'a',
    î: 'i',
    Î: 'i',
    û: 'u',
    Û: 'u'
}

/**
 * Şehir adını eşleştirme anahtarına çevirir:
 * küçük harf, Türkçe karakterler ASCII'ye, boşluk/tire/noktalama temizlenir.
 * normalize('İstanbul') === normalize('Istanbul') === 'istanbul'
 */
export const normalize = (value: string): string => {
    if (!value) return ''

    const mapped = Array.from(value)
        .map(ch => TURKISH_CHAR_MAP[ch] ?? ch)
        .join('')

    return mapped
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
}

export const TURKEY_PROVINCES: TurkeyProvince[] = [
    { name: 'Adana', ascii: 'Adana', lat: 37.0, lng: 35.3213 },
    { name: 'Adıyaman', ascii: 'Adiyaman', lat: 37.7648, lng: 38.2786 },
    { name: 'Afyonkarahisar', ascii: 'Afyonkarahisar', aliases: ['Afyon'], lat: 38.7507, lng: 30.5567 },
    { name: 'Ağrı', ascii: 'Agri', lat: 39.7191, lng: 43.0503 },
    { name: 'Aksaray', ascii: 'Aksaray', lat: 38.3687, lng: 34.037 },
    { name: 'Amasya', ascii: 'Amasya', lat: 40.6499, lng: 35.8353 },
    { name: 'Ankara', ascii: 'Ankara', lat: 39.9208, lng: 32.8541 },
    { name: 'Antalya', ascii: 'Antalya', lat: 36.8969, lng: 30.7133 },
    { name: 'Ardahan', ascii: 'Ardahan', lat: 41.1105, lng: 42.7022 },
    { name: 'Artvin', ascii: 'Artvin', lat: 41.1828, lng: 41.8183 },
    { name: 'Aydın', ascii: 'Aydin', lat: 37.856, lng: 27.8416 },
    { name: 'Balıkesir', ascii: 'Balikesir', lat: 39.6484, lng: 27.8826 },
    { name: 'Bartın', ascii: 'Bartin', lat: 41.5811, lng: 32.461 },
    { name: 'Batman', ascii: 'Batman', lat: 37.8812, lng: 41.1351 },
    { name: 'Bayburt', ascii: 'Bayburt', lat: 40.2552, lng: 40.2249 },
    { name: 'Bilecik', ascii: 'Bilecik', lat: 40.1451, lng: 29.9798 },
    { name: 'Bingöl', ascii: 'Bingol', lat: 38.8854, lng: 40.498 },
    { name: 'Bitlis', ascii: 'Bitlis', lat: 38.3938, lng: 42.1232 },
    { name: 'Bolu', ascii: 'Bolu', lat: 40.7392, lng: 31.6089 },
    { name: 'Burdur', ascii: 'Burdur', lat: 37.7203, lng: 30.2908 },
    { name: 'Bursa', ascii: 'Bursa', lat: 40.1885, lng: 29.061 },
    { name: 'Çanakkale', ascii: 'Canakkale', lat: 40.1553, lng: 26.4142 },
    { name: 'Çankırı', ascii: 'Cankiri', lat: 40.6013, lng: 33.6134 },
    { name: 'Çorum', ascii: 'Corum', lat: 40.5506, lng: 34.9556 },
    { name: 'Denizli', ascii: 'Denizli', lat: 37.7765, lng: 29.0864 },
    { name: 'Diyarbakır', ascii: 'Diyarbakir', lat: 37.9144, lng: 40.2306 },
    { name: 'Düzce', ascii: 'Duzce', lat: 40.8438, lng: 31.1565 },
    { name: 'Edirne', ascii: 'Edirne', lat: 41.6818, lng: 26.5623 },
    { name: 'Elazığ', ascii: 'Elazig', lat: 38.681, lng: 39.2264 },
    { name: 'Erzincan', ascii: 'Erzincan', lat: 39.75, lng: 39.5 },
    { name: 'Erzurum', ascii: 'Erzurum', lat: 39.9, lng: 41.27 },
    { name: 'Eskişehir', ascii: 'Eskisehir', lat: 39.7767, lng: 30.5206 },
    { name: 'Gaziantep', ascii: 'Gaziantep', aliases: ['Antep'], lat: 37.0662, lng: 37.3833 },
    { name: 'Giresun', ascii: 'Giresun', lat: 40.9128, lng: 38.3895 },
    { name: 'Gümüşhane', ascii: 'Gumushane', lat: 40.4386, lng: 39.5086 },
    { name: 'Hakkari', ascii: 'Hakkari', aliases: ['Hakkâri'], lat: 37.5744, lng: 43.7408 },
    { name: 'Hatay', ascii: 'Hatay', aliases: ['Antakya'], lat: 36.4018, lng: 36.3498 },
    { name: 'Iğdır', ascii: 'Igdir', lat: 39.888, lng: 44.0048 },
    { name: 'Isparta', ascii: 'Isparta', lat: 37.7648, lng: 30.5566 },
    { name: 'İstanbul', ascii: 'Istanbul', lat: 41.0082, lng: 28.9784 },
    { name: 'İzmir', ascii: 'Izmir', lat: 38.4192, lng: 27.1287 },
    { name: 'Kahramanmaraş', ascii: 'Kahramanmaras', aliases: ['Maraş', 'Maras'], lat: 37.5858, lng: 36.9371 },
    { name: 'Karabük', ascii: 'Karabuk', lat: 41.2061, lng: 32.6204 },
    { name: 'Karaman', ascii: 'Karaman', lat: 37.1759, lng: 33.2287 },
    { name: 'Kars', ascii: 'Kars', lat: 40.6167, lng: 43.1 },
    { name: 'Kastamonu', ascii: 'Kastamonu', lat: 41.3887, lng: 33.7827 },
    { name: 'Kayseri', ascii: 'Kayseri', lat: 38.7312, lng: 35.4787 },
    { name: 'Kırıkkale', ascii: 'Kirikkale', lat: 39.8468, lng: 33.5153 },
    { name: 'Kırklareli', ascii: 'Kirklareli', lat: 41.7333, lng: 27.2167 },
    { name: 'Kırşehir', ascii: 'Kirsehir', lat: 39.1425, lng: 34.1709 },
    { name: 'Kilis', ascii: 'Kilis', lat: 36.7184, lng: 37.1212 },
    { name: 'Kocaeli', ascii: 'Kocaeli', aliases: ['İzmit', 'Izmit'], lat: 40.8533, lng: 29.8815 },
    { name: 'Konya', ascii: 'Konya', lat: 37.8667, lng: 32.4833 },
    { name: 'Kütahya', ascii: 'Kutahya', lat: 39.4167, lng: 29.9833 },
    { name: 'Malatya', ascii: 'Malatya', lat: 38.3552, lng: 38.3095 },
    { name: 'Manisa', ascii: 'Manisa', lat: 38.6191, lng: 27.4289 },
    { name: 'Mardin', ascii: 'Mardin', lat: 37.3212, lng: 40.7245 },
    { name: 'Mersin', ascii: 'Mersin', aliases: ['İçel', 'Icel'], lat: 36.8, lng: 34.6333 },
    { name: 'Muğla', ascii: 'Mugla', lat: 37.2153, lng: 28.3636 },
    { name: 'Muş', ascii: 'Mus', lat: 38.9462, lng: 41.7539 },
    { name: 'Nevşehir', ascii: 'Nevsehir', lat: 38.6939, lng: 34.6857 },
    { name: 'Niğde', ascii: 'Nigde', lat: 37.9667, lng: 34.6833 },
    { name: 'Ordu', ascii: 'Ordu', lat: 40.9839, lng: 37.8764 },
    { name: 'Osmaniye', ascii: 'Osmaniye', lat: 37.0742, lng: 36.2478 },
    { name: 'Rize', ascii: 'Rize', lat: 41.0201, lng: 40.5234 },
    { name: 'Sakarya', ascii: 'Sakarya', aliases: ['Adapazarı', 'Adapazari'], lat: 40.694, lng: 30.4358 },
    { name: 'Samsun', ascii: 'Samsun', lat: 41.2867, lng: 36.33 },
    { name: 'Siirt', ascii: 'Siirt', lat: 37.9333, lng: 41.95 },
    { name: 'Sinop', ascii: 'Sinop', lat: 42.0231, lng: 35.1531 },
    { name: 'Sivas', ascii: 'Sivas', lat: 39.7477, lng: 37.0179 },
    { name: 'Şanlıurfa', ascii: 'Sanliurfa', aliases: ['Urfa'], lat: 37.1591, lng: 38.7969 },
    { name: 'Şırnak', ascii: 'Sirnak', lat: 37.4187, lng: 42.4918 },
    { name: 'Tekirdağ', ascii: 'Tekirdag', lat: 40.9833, lng: 27.5167 },
    { name: 'Tokat', ascii: 'Tokat', lat: 40.3167, lng: 36.55 },
    { name: 'Trabzon', ascii: 'Trabzon', lat: 41.0015, lng: 39.7178 },
    { name: 'Tunceli', ascii: 'Tunceli', lat: 39.1079, lng: 39.5401 },
    { name: 'Uşak', ascii: 'Usak', lat: 38.6823, lng: 29.4082 },
    { name: 'Van', ascii: 'Van', lat: 38.4891, lng: 43.4089 },
    { name: 'Yalova', ascii: 'Yalova', lat: 40.65, lng: 29.2667 },
    { name: 'Yozgat', ascii: 'Yozgat', lat: 39.8181, lng: 34.8147 },
    { name: 'Zonguldak', ascii: 'Zonguldak', lat: 41.4564, lng: 31.7987 }
]

// Normalize edilmiş ad -> il (ad, ascii ad ve alias'ların tümü anahtar olur)
const PROVINCE_INDEX: Map<string, TurkeyProvince> = (() => {
    const index = new Map<string, TurkeyProvince>()

    for (const province of TURKEY_PROVINCES) {
        const keys = [province.name, province.ascii, ...(province.aliases ?? [])]

        for (const key of keys) {
            const normalized = normalize(key)

            if (normalized && !index.has(normalized)) index.set(normalized, province)
        }
    }

    return index
})()

/** Şehir adına göre ili bulur; eşleşme yoksa undefined döner (çökme yok). */
export const findProvince = (cityName: string | null | undefined): TurkeyProvince | undefined => {
    if (!cityName) return undefined

    const key = normalize(cityName)

    if (!key) return undefined

    const direct = PROVINCE_INDEX.get(key)

    if (direct) return direct

    // "İstanbul İli", "Ankara Province" gibi ekleri temizle
    const stripped = key.replace(/(ili|province|il)$/, '')

    return stripped !== key ? PROVINCE_INDEX.get(stripped) : undefined
}
