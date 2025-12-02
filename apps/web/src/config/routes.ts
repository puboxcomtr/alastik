// apps/web/src/config/routes.ts
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

// ============================================
// DYNAMIC ROUTE BUILDERS
// ============================================

/**
 * Ürün detay URL'i
 */
export const buildProductUrl = (seoUrl: string): string => {
    return `${ROUTES.PRODUCT}/${seoUrl}`;
};

/**
 * Marka sayfası URL'i
 */
export const buildBrandUrl = (seoUrl: string): string => {
    return `${ROUTES.BRAND}/${seoUrl}`;
};

/**
 * Kategori sayfası URL'i (sadece kategori)
 */
export const buildCategoryUrl = (categorySlug: string): string => {
    return `${ROUTES.CATEGORY}/${categorySlug}`;
};

/**
 * Lastik arama URL'i (Kategori + Ebat)
 * @example buildTireSearchUrl("4-mevsim-lastikler", "205", "55", "16")
 * @returns /kategori/4-mevsim-lastikler/205-55-r16
 */
export const buildTireSearchUrl = (
    categorySlug: string,
    genislik: string,
    yukseklik: string,
    cap: string,
    extraFilters?: Record<string, string>
): string => {
    const sizeSlug = `${genislik}-${yukseklik}-r${cap}`;
    const baseUrl = `${ROUTES.CATEGORY}/${categorySlug}/${sizeSlug}`;

    if (!extraFilters || Object.keys(extraFilters).length === 0) {
        return baseUrl;
    }

    const queryString = new URLSearchParams(extraFilters).toString();
    return `${baseUrl}?${queryString}`;
};

/**
 * Mevsim değerinden kategori slug'ı al
 */
export const getSeasonSlugFromValue = (mevsimValue: string): string => {
    const mevsimMap: Record<string, string> = {
        "1": "lastik",
        "2": "yaz-lastikleri",
        "3": "kis-lastikleri",
        "4": "4-mevsim-lastikler"
    };
    return mevsimMap[mevsimValue] || "tum-lastikler";
};

/**
 * Ebat slug'ını parse et
 * @param ebatSlug
 * @returns { genislik: "205", yukseklik: "55", cap: "16", formatted: "205/55R16" }
 */
export const parseTireSize = (ebatSlug: string) => {
    const [genislik, yukseklik, capWithR] = ebatSlug.split('-');
    const cap = capWithR.replace(/^r/i, '');

    return {
        genislik,
        yukseklik,
        cap,
        formatted: `${genislik}/${yukseklik}R${cap}`,
        search: `${genislik}/${yukseklik}R${cap}`
    };
};

/**
 * Etiket sayfası URL'i
 */
export const buildTagUrl = (seoUrl: string): string => {
    return `${ROUTES.TAG}/${seoUrl}`;
};
/**
 * Lastik ebat etiketi fallback URL'i
 * Etiket bulunamadığında kullanılır
 */
export const buildTireSizeTagFallback = (width: number, aspectRatio: number, diameter: number): string => {
    return `${width}-${aspectRatio}-r${diameter}-lastik-fiyatlari`;
};

/**
 * Araç bilgisiyle etiket URL'i oluştur
 */
export interface VehicleParams {
    make: string;
    makeName: string;
    model: string;
    modelName: string;
    year: number;
    modification: string;
    modificationName?: string;
    vehicleImage?: string;
}

export const buildTagUrlWithVehicle = (seoUrl: string, vehicle: VehicleParams): string => {
    const baseUrl = `${ROUTES.TAG}/${seoUrl}`;
    const params = new URLSearchParams({
        make: vehicle.make,
        makeName: vehicle.makeName,
        model: vehicle.model,
        modelName: vehicle.modelName,
        year: vehicle.year.toString(),
        modification: vehicle.modification,
        ...(vehicle.modificationName && { modificationName: vehicle.modificationName }),
        ...(vehicle.vehicleImage && { vehicleImage: vehicle.vehicleImage })
    });
    return `${baseUrl}?${params.toString()}`;
};