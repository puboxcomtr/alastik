// Site bazlı Google Tag Manager container'ları
export const GTM_IDS: Record<string, string> = {
    alastik: 'GTM-NVV296LW',
    lastikjantavm: 'GTM-MWVF56WW'
};

export const getGtmId = (site?: string | null): string => GTM_IDS[site || ''] || GTM_IDS.alastik;

// Site bazlı Google Ads (gtag) hesapları
export const ADS_IDS: Record<string, string> = {
    alastik: 'AW-18022245202',
    lastikjantavm: 'AW-666191332'
};

export const getAdsId = (site?: string | null): string => ADS_IDS[site || ''] || ADS_IDS.alastik;

// Site bazlı Google etiketi (Merchant Center izleme vb. — gtag "GT-xxx" kimlikleri).
// Tanımlı olmayan sitede etiket yüklenmez.
export const GOOGLE_TAG_IDS: Record<string, string> = {
    alastik: 'GT-T5377LNX'
};

export const getGoogleTagId = (site?: string | null): string => GOOGLE_TAG_IDS[site || ''] || '';

export type AdsConversionEvent = 'purchase' | 'signUp' | 'addToCart' | 'beginCheckout';

// Google Ads dönüşüm etiketleri (send_to) — site ve olay bazlı.
// Yeni bir dönüşüm kurulduğunda Ads'in verdiği "AW-xxx/etiket" değeri buraya eklenir.
export const ADS_CONVERSION_LABELS: Record<string, Partial<Record<AdsConversionEvent, string>>> = {
    alastik: {
        purchase: 'AW-18022245202/qJixCKjJ8LscENLG1pFD',
        signUp: 'AW-18022245202/Pp35COy98bscENLG1pFD'
    },
    lastikjantavm: {
        addToCart: 'AW-666191332/-As1CNiy6OscEOSL1b0C',
        purchase: 'AW-666191332/1EbGCOSF6OscEOSL1b0C'
    }
};
