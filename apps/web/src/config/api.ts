// apps/web/src/config/api.ts

const MEDIA_URL = process.env.NEXT_PUBLIC_MEDIA_URL || 'http://localhost:3082';

const getBaseUrl = () => {
    if (typeof window === 'undefined') {
        return process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api';
    }
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api';
};

export const API_ENDPOINTS = {
    tags: {
        detail: (slug: string) => `${getBaseUrl()}/tags/${slug}`,
        products: (slug: string) => `${getBaseUrl()}/tags/${slug}/products`,
        tireSize: () => `${getBaseUrl()}/tags/tire-size`,
        RimSize: () => `${getBaseUrl()}/tags/rim-size`,
        rimPcd: () => `${getBaseUrl()}/tags/rim-pcd`,
        chainSize: () => `${getBaseUrl()}/tags/chain-size`,
    },
    brands: {
        homepage: () => `${getBaseUrl()}/brands/homepage`,
        detail: (seoUrl: string) => `${getBaseUrl()}/brands/${encodeURIComponent(seoUrl)}`,
    },
    cart: {
        get: (sessionId: string) => `${getBaseUrl()}/cart/${sessionId}`,
        add: () => `${getBaseUrl()}/cart/add`,
        update: () => `${getBaseUrl()}/cart/update`,
        remove: () => `${getBaseUrl()}/cart/remove`,
        clear: (sessionId: string) => `${getBaseUrl()}/cart/clear/${sessionId}`,
    },
    user: {
        vehicles: () => `${getBaseUrl()}/user/vehicles`,
        vehicleDetail: (id: string) => `${getBaseUrl()}/user/vehicles/${id}`,
        vehicleSetPrimary: (id: string) => `${getBaseUrl()}/user/vehicles/${id}/set-primary`,
    },
    blocks: {
        detail: (key: string) => `${getBaseUrl()}/blocks/${key}`,
    },
    contact: {
        callback: () => `${getBaseUrl()}/contact/callback`,
        callbackOptions: () => `${getBaseUrl()}/contact/callback/options`,
    },
    montage: {
        list: () => `${getBaseUrl()}/montage-points`,
        detail: (id: string) => `${getBaseUrl()}/montage-points/${id}`,
    },
    showcases: {
        homepage: () => `${getBaseUrl()}/showcases/public/homepage`,
    },
    reviews: {
        byProduct: (productKey: string) => `${getBaseUrl()}/reviews/${productKey}`,
        create: () => `${getBaseUrl()}/reviews`,
        top: () => `${getBaseUrl()}/reviews/top`,
    },
    products: {
        filter: () => `${getBaseUrl()}/products/filter`,
        detail: (slug: string) => `${getBaseUrl()}/products/${encodeURIComponent(slug)}`,
        wheelSize: (slug: string) => `${getBaseUrl()}/products/${slug}/wheelsize`,
        championships: (productKey: string) => `${getBaseUrl()}/products/championships/${productKey}`,
        similarByOrder: (orderNumber: string) => `${getBaseUrl()}/products/similar-by-order/${orderNumber}`,
    },
    lastik: {
        kesitGenislikleri: () => `${getBaseUrl()}/lastik/kesit-genislikleri`,
        yanakOranlari: () => `${getBaseUrl()}/lastik/yanak-oranlari`,
        jantCaplari: () => `${getBaseUrl()}/lastik/jant-caplari`,
    },
    jant: {
        caplar: () => `${getBaseUrl()}/jant/caplar`,
        vidaSablonlari: () => `${getBaseUrl()}/jant/vida-sablonlari`,
    },
    wheelsize: {
        byTire: () => `${getBaseUrl()}/wheelsize/by-tire`,
        vehicleDetails: () => `${getBaseUrl()}/wheelsize/vehicle-details`,
        makes: () => `${getBaseUrl()}/wheelsize/makes`,
        models: () => `${getBaseUrl()}/wheelsize/models`,
        years: () => `${getBaseUrl()}/wheelsize/years`,
        generations: () => `${getBaseUrl()}/wheelsize/generations`,
        modifications: () => `${getBaseUrl()}/wheelsize/modifications`,
        calculatorSizes: () => `${getBaseUrl()}/plugins/wheelsize/calculator/sizes`,
    },
    blogs: {
        homepage: () => `${getBaseUrl()}/blogs/homepage`,
        list: () => `${getBaseUrl()}/blogs`,
        detail: (slug: string) => `${getBaseUrl()}/blogs/${encodeURIComponent(slug)}`,
        byPattern: (pattern: string) => `${getBaseUrl()}/blogs/by-pattern/${encodeURIComponent(pattern)}`,
    },
    pages: {
        detail: (slug: string) => `${getBaseUrl()}/pages/${encodeURIComponent(slug)}`,
    },
    payment: {
        bankAccounts: () => `${getBaseUrl()}/payment-methods/bank-transfer`,
        // Netahsilat
        threeDInit: () => `${getBaseUrl()}/web/payments/netahsilat/3d-init`,
        threeDCommit: () => `${getBaseUrl()}/web/payments/netahsilat/3d-commit`,
        binCheck: (bin: string) => `${getBaseUrl()}/web/payments/netahsilat/bin/${bin}`,
        // Nkolay
        nkolayInit: () => `${getBaseUrl()}/web/payments/nkolay/3d-init`,
    },
    search: {
        autocomplete: () => `${getBaseUrl()}/search/autocomplete`,
        track: () => `${getBaseUrl()}/search/track`,
        results: () => `${getBaseUrl()}/search/results`,
        page: (query: string) => `/arama?q=${encodeURIComponent(query)}`,
    },
    order: {
        create: () => `${getBaseUrl()}/order`,
        userOrders: (userId: string) => `${getBaseUrl()}/order/user/${userId}`,
        detail: (orderId: string) => `${getBaseUrl()}/order/${orderId}`,
        byNumber: (orderNumber: string) => `${getBaseUrl()}/order/number/${orderNumber}`,
    },
    location: {
        cities: () => `${getBaseUrl()}/location/cities`,
        districts: (cityId: string) => `${getBaseUrl()}/location/districts/${cityId}`,
        neighborhoods: (districtId: string) => `${getBaseUrl()}/location/neighborhoods/${districtId}`,
    },
    filters: {
        tireOptions: () => `${getBaseUrl()}/filters/tire-options`,
        chainOptions: () => `${getBaseUrl()}/filters/chain-options`,
    },
    seo: {
        get: () => `${getBaseUrl()}/seo`,
    },
    definition: {
        get: () => `${getBaseUrl()}/definition`,
    },
    categories: {
        bySlug: (slug: string) => `${getBaseUrl()}/categories/slug/${slug}`,
        bySlugWithSize: (slug: string, ebatSlug: string) => `${getBaseUrl()}/categories/slug/${slug}/size/${ebatSlug}`,
        detail: (id: string) => `${getBaseUrl()}/categories/${id}`,
        searchByName: () => `${getBaseUrl()}/categories/search/by-name`,
    },
    theme: {
        get: () => `${getBaseUrl()}/theme`,
        designSettings: () => `${getBaseUrl()}/admin/design/settings/theme`,
    },
    slider: {
        detail: (id: string) => `${getBaseUrl()}/admin/design/slider/${id}`,
        byKey: (key: string) => `${getBaseUrl()}/admin/design/slider/key/${key}`,
    },
    settings: {
        group: (groupName: string) => `${getBaseUrl()}/settings/group/${groupName}`,
    },
    generalSettings: {
        byKey: (key: string) => `${getBaseUrl()}/general-settings/key/${key}`,
        siteStatus: () => `${getBaseUrl()}/general-settings/site-status`,
        byGroup: (group: string) => `${getBaseUrl()}/general-settings/group/${group}`,
    },
    favourites: {
        toggle: () => `${getBaseUrl()}/favourites/toggle`,
        list: () => `${getBaseUrl()}/favourites`,
        check: (keys: string) => `${getBaseUrl()}/favourites/check?keys=${keys}`,
    },
    address: {
        list: (userId: string) => `${getBaseUrl()}/address/user/${userId}`,
        detail: (addressId: string) => `${getBaseUrl()}/address/${addressId}`,
        create: () => `${getBaseUrl()}/address`,
        update: (addressId: string) => `${getBaseUrl()}/address/${addressId}`,
        delete: (addressId: string) => `${getBaseUrl()}/address/${addressId}`,
    },
    auth: {
        register: () => `${getBaseUrl()}/auth/register`,
        login: () => `${getBaseUrl()}/auth/login`,
        userLogin: () => `${getBaseUrl()}/users/login`,
        userRegister: () => `${getBaseUrl()}/users/register`,
        userLogout: () => `${getBaseUrl()}/users/logout`,
        refreshToken: () => `${getBaseUrl()}/users/refresh-token`,
        profile: () => `${getBaseUrl()}/users/profile`,
        google: () => `${getBaseUrl()}/users/google`,
    },
    translations: {
        all: () => `${getBaseUrl()}/translations`,
        byCategory: (category: string) => `${getBaseUrl()}/translations/category/${category}`,
    },
    menus: {
        header: () => `${getBaseUrl()}/menus/header`,
        group: (id: string) => `${getBaseUrl()}/menus/group/${id}`,
        area: (area: string) => `${getBaseUrl()}/menus/area/${area}`,
    },
    purchaseLimits: {
        check: () => `${getBaseUrl()}/campaign/purchase-limits/check`,
    },
    admin: {
        settingsGeneral: () => `${getBaseUrl()}/admin/settings/general`,
    },
};

/**
 * Sunucu tarafinda aktif sitenin X-Site header'ini uretir.
 * Middleware her istege x-site request header'i ekler; server component /
 * servis fetch'leri bunu API'ye iletmek zorundadir — aksi halde API
 * varsayilan siteyi (alastik) cozer ve site verileri karisir.
 * Client tarafinda bos doner (tarayici Origin'i siteyi zaten belirler).
 */
export async function getServerSiteHeaders(): Promise<Record<string, string>> {
    if (typeof window !== 'undefined') return {};
    try {
        const { headers } = await import('next/headers');
        const h = await headers();
        const site = h.get('x-site');
        return site ? { 'X-Site': site } : {};
    } catch {
        // Request kapsami disinda (build ani vb.) — header eklenmez
        return {};
    }
}

/**
 * Genel fetch helper - Server side ve client side uyumlu
 */
export async function fetchAPI<T = any>(
    url: string,
    options?: RequestInit
): Promise<{ success: boolean; data: T | null; message?: string }> {
    try {
        // options once yayilir; headers en sonda birlesir ki X-Site ezilmesin
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(await getServerSiteHeaders()),
                ...options?.headers,
            },
        });

        if (!response.ok) {
            return { success: false, data: null, message: `API Hatasi: ${response.statusText}` };
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('[fetchAPI] Hata:', error);
        return { success: false, data: null, message: 'Baglanti hatasi' };
    }
}

/**
 * Gorsel URL helper
 */
// Her iki sitede de kendi alan adından servis edilen medya yolları
const MEDIA_PATH_PREFIXES = [
    '/urun/', '/blog/', '/kategori/', '/marka/', '/sliders/',
    '/theme/', '/uploads/', '/general/', '/genel/', '/banners/', '/montage/'
];

export function getImageUrl(path?: string | null): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    // Medya her sitenin KENDİ alan adından servis edilir (nginx karşılar):
    // göreli bırakılır ki adres alastik'e sabitlenmesin
    if (MEDIA_PATH_PREFIXES.some(prefix => path.startsWith(prefix))) return path;
    return `${MEDIA_URL}${path.startsWith('/') ? path : '/' + path}`;
}