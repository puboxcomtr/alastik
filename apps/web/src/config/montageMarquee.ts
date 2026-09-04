import { ROUTES } from '@/src/config/routes';

// ALastik üst bar efektli yazısı (kaymaz, parıltı efekti); tıklanınca montaj noktası seçimine gider
export const ALASTIK_MONTAGE_BANNER = {
    text: 'ALastik Güvencesiyle Montaj Hizmetlerinden Yararlanabilirsiniz',
    href: ROUTES.MONTAGE_SELECT,
    durationSec: 8, // parıltının bir geçiş süresi
};

// LJA üst bar kayan yazısı (siyah şerit); tıklanınca montaj noktalarına gider
export const MONTAGE_MARQUEE = {
    text: "Türkiye'nin 81 İlinde Montaj Hizmeti",
    href: ROUTES.MONTAGE,
    gapPx: 18,        // tekrarlar arası boşluk
    repeat: 12,       // bir turdaki tekrar sayısı (geniş ekranlarda boşluk kalmaması için)
    durationSec: 40,  // bir turun süresi (masaüstü)
    durationSecMobile: 22,
};
