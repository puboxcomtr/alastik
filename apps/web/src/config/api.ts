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
    },
    blogs: {
        byPattern: (pattern: string) => `${getBaseUrl()}/blogs/by-pattern/${encodeURIComponent(pattern)}`,
    },
    payment: {
        bankAccounts: () => `${getBaseUrl()}/payment-methods/bank-transfer`,
        threeDInit: () => `${getBaseUrl().replace('/api', '')}/web/payments/netahsilat/3d-init`,
        threeDCommit: () => `${getBaseUrl().replace('/api', '')}/web/payments/netahsilat/3d-commit`,
        binCheck: (bin: string) => `${getBaseUrl().replace('/api', '')}/web/payments/netahsilat/bin/${bin}`,
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
    address: {
        list: (userId: string) => `${getBaseUrl()}/address/user/${userId}`,
        detail: (addressId: string) => `${getBaseUrl()}/address/${addressId}`,
        create: () => `${getBaseUrl()}/address`,
        update: (addressId: string) => `${getBaseUrl()}/address/${addressId}`,
        delete: (addressId: string) => `${getBaseUrl()}/address/${addressId}`,
    },
    search: {
        autocomplete: () => `${getBaseUrl()}/search/autocomplete`,
        track: () => `${getBaseUrl()}/search/track`,
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
    },
    admin: {
        settingsGeneral: () => `${getBaseUrl()}/admin/settings/general`,
    },
};

/**
 * Genel fetch helper - Server side ve client side uyumlu
 */
export async function fetchAPI<T = any>(
    url: string,
    options?: RequestInit
): Promise<{ success: boolean; data: T | null; message?: string }> {
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers,
            },
            ...options,
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
export function getImageUrl(path?: string | null): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${MEDIA_URL}${path.startsWith('/') ? path : '/' + path}`;
}