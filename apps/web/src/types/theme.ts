// apps/web/src/types/theme.ts
export interface ThemeSettings {
    // Görsel Ayarları
    logo?: string;
    defaultCatalogImage?: string;

    // Marka ve Vitrin Ayarları
    brandDisplayType?: 'image' | 'text';
    showcaseDisplayCount?: string;
    blogDisplayCount?: string;

    // Genel Ayarlar
    isActive?: boolean;
    isBrand?: boolean;
    isTax?: boolean;
    isFacebook?: boolean;
    isGoogle?: boolean;
    isLazyLoad?: boolean;

    // Footer Ayarları
    footerMobile?: 'list' | 'grid';

    // SEO & Newsletter
    seoTitle?: string;
    newsletterTitle?: string;
    newsletterContent?: string;

    // Sosyal Medya
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
    linkedin?: string;
    whatsapp?: string;

    // E-ticaret Platformları
    trendyol?: string;
    hepsiburada?: string;
    pttavm?: string;
    pazarama?: string;
    n11?: string;
    idefix?: string;

    // Anasayfa Ayarları
    homepage?: boolean;
    sliderSelect?: string;
    mobileSelect?: string;
    autostart?: boolean;

    // Vitrin 1
    showcaseFirst?: string;
    showcasenameFirst?: string;
    showcasesubFirst?: string;

    // Vitrin 2
    showcaseSecond?: string;
    showcasenameSecond?: string;
    showcasesubSecond?: string;

    // Vitrin 3
    showcaseThird?: string;
    showcasenameThird?: string;
    showcasesubThird?: string;
}