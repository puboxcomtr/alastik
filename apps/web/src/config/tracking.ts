export const GTM_IDS: Record<string, string> = {
    alastik: 'GTM-NVV296LW',
    lastikjantavm: 'GTM-MWVF56WW'
};

export const getGtmId = (site?: string | null): string => GTM_IDS[site || ''] || '';

export const ADS_IDS: Record<string, string> = {
    alastik: 'AW-18022245202',
    lastikjantavm: 'AW-666191332'
};

export const getAdsId = (site?: string | null): string => ADS_IDS[site || ''] || '';

export const GOOGLE_TAG_IDS: Record<string, string> = {
    alastik: 'GT-T5377LNX'
};

export const getGoogleTagId = (site?: string | null): string => GOOGLE_TAG_IDS[site || ''] || '';

export const ADS_PHONE_CONVERSIONS: Record<string, { sendTo: string; phoneNumber: string }[]> = {
    alastik: [
        { sendTo: 'AW-18022245202/SzATCI-DipIdENLG1pFD', phoneNumber: '0212 216 01 02' },
        { sendTo: 'AW-18022245202/JL-oCJKDipIdENLG1pFD', phoneNumber: '0546 767 95 92' }
    ]
};

export const getAdsPhoneConversions = (site?: string | null) => ADS_PHONE_CONVERSIONS[site || ''] || [];

export type AdsConversionEvent = 'purchase' | 'signUp' | 'addToCart' | 'beginCheckout';

export const ADS_CONVERSION_LABELS: Record<string, Partial<Record<AdsConversionEvent, string>>> = {
    alastik: {
        purchase: 'AW-18022245202/qJixCKjJ8LscENLG1pFD',
        signUp: 'AW-18022245202/fK_rCIrHiZIdENLG1pFD'
    },
    lastikjantavm: {
        addToCart: 'AW-666191332/-As1CNiy6OscEOSL1b0C',
        purchase: 'AW-666191332/1EbGCOSF6OscEOSL1b0C'
    }
};
