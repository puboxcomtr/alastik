// apps/admin/src/types/apps/themeTypes.ts
export interface ThemeSettings {
    // Tab 1 - Genel Ayarlar
    brandDisplayType?: string
    // Gösterilecek fiyat: DIA stok kartı fiyat alanı (fiyat1..fiyat4) + indirim modu (none | b2c_oran)
    priceField?: string
    priceDiscountMode?: string
    // Havale ve Peşin Ödeme indirim oranları (%) — boş/0 ise kutu gösterilmez
    pickupCashDiscountNewTire?: string
    pickupCashDiscountSecondHand?: string
    showcaseDisplayCount?: string
    blogDisplayCount?: string
    isActive?: boolean
    isBrand?: boolean
    isTax?: boolean
    isFacebook?: boolean
    isGoogle?: boolean
    isLazyLoad?: boolean
    // Vitrinde hafif kar yağışı efekti (site bazlı)
    snowEffect?: boolean
    // Giriş ekranı duyuru popup'ı (yalnız giriş ekranı olan sitede; ziyaretçiye günde bir kez gösterilir)
    loginPopupEnabled?: boolean
    loginPopupImage?: string
    // Perakende plasiyere sıfır lastikte fiyatın altında gösterilen not (bayi sitesi)
    retailSalespersonPriceNote?: string
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
    showcaseFourth?: string
    showcasenameFourth?: string
    showcasesubFourth?: string
    showcaseFifth?: string
    showcasenameFifth?: string
    showcasesubFifth?: string

    // Vitrin altı banner grupları (slider key)
    showcasebannerFirst?: string
    showcasebannerSecond?: string
    showcasebannerThird?: string
    showcasebannerFourth?: string
    showcasebannerFifth?: string
}