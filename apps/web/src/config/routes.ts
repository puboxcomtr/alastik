export const ROUTES = {
    HOME: '/',
    LOGIN: '/giris-yap',
    REGISTER: '/kayit-ol',
    FORGOT_PASSWORD: '/sifremi-unuttum',
    ACCOUNT: '/hesabim',
    ACCOUNT_INFORMATIONS: '/hesabim/kisisel-bilgilerim',
    ACCOUNT_VEHICLES: '/hesabim/araclarim',
    ACCOUNT_ORDERS: '/hesabim/siparislerim',
    ACCOUNT_COMMENTS: '/hesabim/yorumlarim',
    ACCOUNT_FAVORITES: '/hesabim/favorilerim',
    ACCOUNT_ADDRESSES: '/hesabim/adreslerim',
    ACCOUNT_NOTIFICATIONS: '/hesabim/bildirimlerim',
    ACCOUNT_SETTINGS: '/hesabim/ayarlar',
    SUPPORT_MAIN: '/destek/',
    SUPPORT_TICKET: '/destek/talep-olustur',
    PRODUCT: '/urun',
    BRAND: '/marka',
    CATEGORY: '/kategori',
    TAG: '/etiket',
    CART: '/sepet',
    CHECKOUT: '/odeme'
} as const;

export type RouteKey = keyof typeof ROUTES;