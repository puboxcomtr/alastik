import { DOMAIN_TO_SLUG, SITES } from './siteConfig';

const MEDIA_URL = process.env.NEXT_PUBLIC_MEDIA_URL || 'http://localhost:3082';

export const getBaseUrl = () => {
    if (typeof window === 'undefined') {
        return process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api';
    }
    const slug = DOMAIN_TO_SLUG[window.location.hostname.toLowerCase()];
    if (slug && SITES[slug]?.sameOriginApi) return `${window.location.origin}/api`;
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
    b2b: {
        application: () => `${getBaseUrl()}/b2b/application`,
        brands: () => `${getBaseUrl()}/brands`,
        themeSettings: () => `${getBaseUrl()}/admin/design/settings/theme`,
        login: () => `${getBaseUrl()}/b2b/auth/login`,
        me: () => `${getBaseUrl()}/b2b/auth/me`,
        plasiyerLogin: () => `${getBaseUrl()}/b2b/plasiyer/login`,
        plasiyerMe: () => `${getBaseUrl()}/b2b/plasiyer/me`,
        plasiyerCariler: (search: string) => `${getBaseUrl()}/b2b/plasiyer/cariler?search=${encodeURIComponent(search)}`,
        plasiyerBayiGiris: () => `${getBaseUrl()}/b2b/plasiyer/bayi-giris`,
        plasiyerSifreDegistir: () => `${getBaseUrl()}/b2b/plasiyer/sifre-degistir`,
        cariOzet: () => `${getBaseUrl()}/b2b/auth/cari-ozet`,
        depoStok: (codes: string) => `${getBaseUrl()}/b2b/auth/depo-stok?codes=${encodeURIComponent(codes)}`,
        sepet: () => `${getBaseUrl()}/b2b/auth/sepet`,
        plasiyerDepoStok: (codes: string) => `${getBaseUrl()}/b2b/plasiyer/depo-stok?codes=${encodeURIComponent(codes)}`,
        plasiyerXmlKaynak: (codes: string) => `${getBaseUrl()}/b2b/plasiyer/xml-kaynak?codes=${encodeURIComponent(codes)}`,
        adresler: () => `${getBaseUrl()}/b2b/auth/adresler`,
        adresEkle: () => `${getBaseUrl()}/b2b/auth/adres`,
        odemeYontemleri: () => `${getBaseUrl()}/b2b/auth/odeme-yontemleri`,
        teslimatYontemleri: (adresId: string) => `${getBaseUrl()}/b2b/auth/teslimat-yontemleri?adresId=${encodeURIComponent(adresId)}`,
        fiyatOrani: () => `${getBaseUrl()}/b2b/auth/fiyat-orani`,
        finansalIskonto: () => `${getBaseUrl()}/b2b/auth/finansal-iskonto`,
        siparis: () => `${getBaseUrl()}/b2b/auth/siparis`,
        siparisDetay: (no: string) => `${getBaseUrl()}/b2b/auth/siparis/${encodeURIComponent(no)}`,
        siparislerim: () => `${getBaseUrl()}/b2b/auth/siparislerim`,
        sifreDegistir: () => `${getBaseUrl()}/b2b/auth/sifre-degistir`,
        makbuzPdf: (no: string) => `${getBaseUrl()}/b2b/auth/makbuz/${encodeURIComponent(no)}`,
        purchaseStats: () => `${getBaseUrl()}/b2b/auth/alim-adet`,
        dueDates: () => `${getBaseUrl()}/b2b/auth/vade-takvimi`,
        agingStatus: () => `${getBaseUrl()}/b2b/auth/vade-durumu`,
        cariEkstre: () => `${getBaseUrl()}/b2b/auth/cari-ekstre`,
        cariEkstreExcel: (q: { yil?: string; q?: string; sort?: string; dir?: string }) =>
          `${getBaseUrl()}/b2b/auth/cari-ekstre/excel?${new URLSearchParams({ yil: q.yil || "", q: q.q || "", sort: q.sort || "", dir: q.dir || "" })}`,
        faturaPdf: (q: { fisno: string; belgeNo?: string; tarih?: string }) =>
          `${getBaseUrl()}/b2b/auth/fatura-pdf?${new URLSearchParams({ fisno: q.fisno, belgeNo: q.belgeNo || "", tarih: q.tarih || "" })}`,
        odemeler: () => `${getBaseUrl()}/b2b/auth/odemeler`,
        paynetConfig: () => `${getBaseUrl()}/b2b/payment/paynet/config`,
        paynetReturn: () => `${getBaseUrl()}/b2b/payment/paynet/return`,
        tekCekimBaslat: () => `${getBaseUrl()}/b2b/payment/tekcekim/baslat`,
        tekCekimReturn: () => `${getBaseUrl()}/b2b/payment/tekcekim/return`,
        paynetClientError: () => `${getBaseUrl()}/b2b/payment/paynet/client-error`,
        taksitRatios: () => `${getBaseUrl()}/b2b/payment/netahsilat/ratios`,
        installmentTable: () => `${getBaseUrl()}/b2b/payment/netahsilat/installment-table`,
        taksitInit: () => `${getBaseUrl()}/b2b/payment/netahsilat/3d-init`,
        borcTaksitInit: () => `${getBaseUrl()}/b2b/payment/netahsilat/borc-init`,
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
        branches: () => `${getBaseUrl()}/montage-points/branches`,
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
        byCategory: (slug: string) => `${getBaseUrl()}/blogs/by-category/${encodeURIComponent(slug)}`,
        byPattern: (pattern: string) => `${getBaseUrl()}/blogs/by-pattern/${encodeURIComponent(pattern)}`,
    },
    pages: {
        detail: (slug: string) => `${getBaseUrl()}/pages/${encodeURIComponent(slug)}`,
    },
    payment: {
        bankAccounts: () => `${getBaseUrl()}/payment-methods/bank-transfer`,
        creditCardOptions: () => `${getBaseUrl()}/payment-methods/credit-card-options`,
        threeDInit: () => `${getBaseUrl()}/web/payments/netahsilat/3d-init`,
        threeDCommit: () => `${getBaseUrl()}/web/payments/netahsilat/3d-commit`,
        binCheck: (bin: string) => `${getBaseUrl()}/web/payments/netahsilat/bin/${bin}`,
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

export async function getServerSiteHeaders(): Promise<Record<string, string>> {
    if (typeof window !== 'undefined') return {};
    try {
        const { headers } = await import('next/headers');
        const h = await headers();
        const site = h.get('x-site');
        return site ? { 'X-Site': site } : {};
    } catch {
        return {};
    }
}

function getClientSessionHeaders(): Record<string, string> {
    if (typeof document === 'undefined') return {};
    const match = document.cookie.match(/(?:^|;\s*)sid=([A-Za-z0-9-]+)/);
    return match ? { 'X-Session-Id': match[1] } : {};
}

export async function fetchAPI<T = any>(
    url: string,
    options?: RequestInit
): Promise<{ success: boolean; data: T | null; message?: string }> {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(await getServerSiteHeaders()),
                ...getClientSessionHeaders(),
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

const MEDIA_PATH_PREFIXES = [
    '/urun/', '/blog/', '/kategori/', '/marka/', '/sliders/',
    '/theme/', '/uploads/', '/general/', '/genel/', '/banners/', '/montage/'
];

export function getImageUrl(path?: string | null): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    if (MEDIA_PATH_PREFIXES.some(prefix => path.startsWith(prefix))) return path;
    return `${MEDIA_URL}${path.startsWith('/') ? path : '/' + path}`;
}