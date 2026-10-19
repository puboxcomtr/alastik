export interface ThemeSettings {
    logo?: string;
    defaultCatalogImage?: string;

    brandDisplayType?: 'image' | 'text';
    pickupCashDiscountNewTire?: string | number;
    pickupCashDiscountSecondHand?: string | number;
    showcaseDisplayCount?: string;
    blogDisplayCount?: string;

    isActive?: boolean;
    isBrand?: boolean;
    isTax?: boolean;
    isFacebook?: boolean;
    isGoogle?: boolean;
    isLazyLoad?: boolean;
    snowEffect?: boolean;

    footerMobile?: 'list' | 'grid';

    seoTitle?: string;
    newsletterTitle?: string;
    newsletterContent?: string;

    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
    linkedin?: string;
    whatsapp?: string;

    trendyol?: string;
    hepsiburada?: string;
    pttavm?: string;
    pazarama?: string;
    n11?: string;
    idefix?: string;

    homepage?: boolean;
    sliderSelect?: string;
    mobileSelect?: string;
    autostart?: boolean;

    showcaseFirst?: string;
    showcasenameFirst?: string;
    showcasesubFirst?: string;

    showcaseSecond?: string;
    showcasenameSecond?: string;
    showcasesubSecond?: string;

    showcaseThird?: string;
    showcasenameThird?: string;
    showcasesubThird?: string;

    showcaseFourth?: string;
    showcasenameFourth?: string;
    showcasesubFourth?: string;

    showcaseFifth?: string;
    showcasenameFifth?: string;
    showcasesubFifth?: string;

    showcasebannerFirst?: string;
    showcasebannerSecond?: string;
    showcasebannerThird?: string;
    showcasebannerFourth?: string;
    showcasebannerFifth?: string;
}