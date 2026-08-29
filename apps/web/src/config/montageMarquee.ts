import { ROUTES } from '@/src/config/routes';

// LJA üst bar kayan yazısı (siyah şerit); tıklanınca montaj noktalarına gider
export const MONTAGE_MARQUEE = {
    text: "Türkiye'nin 81 İlinde Montaj Hizmeti",
    href: ROUTES.MONTAGE,
    gapPx: 18,        // tekrarlar arası boşluk
    repeat: 12,       // bir turdaki tekrar sayısı (geniş ekranlarda boşluk kalmaması için)
    durationSec: 40,  // bir turun süresi (masaüstü)
    durationSecMobile: 22,
};
