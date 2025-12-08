// apps/admin/src/types/apps/themeTypes.ts
export interface ThemeSettings {
    // Tab 1 - Genel Ayarlar
    brandDisplayType?: string
    showcaseDisplayCount?: string
    blogDisplayCount?: string
    isActive?: boolean
    isBrand?: boolean
    isTax?: boolean
    isFacebook?: boolean
    isGoogle?: boolean
    isLazyLoad?: boolean
    logo?: string
    defaultCatalogImage?: string

    // Tab 2 - Footer
    footerLogo?: string
    footerSslImage?: string
    footerMobile?: string
    seoTitle?: string
    newsletterTitle?: string
    newsletterContent?: string

    // Tab 3 - Sosyal Medya
    facebook?: string
    instagram?: string
    twitter?: string
    youtube?: string
    linkedin?: string
    whatsapp?: string
    trendyol?: string
    hepsiburada?: string
    pttavm?: string
    pazarama?: string
    n11?: string
    idefix?: string

    // Tab 4 - Slider
    homepage?: boolean
    sliderSelect?: string
    mobileSelect?: string
    autostart?: boolean

    // Tab 5 - Vitrin
    showcaseFirst?: string
    showcasenameFirst?: string
    showcasesubFirst?: string
    showcaseSecond?: string
    showcasenameSecond?: string
    showcasesubSecond?: string
    showcaseThird?: string
    showcasenameThird?: string
    showcasesubThird?: string
}