// Admin panelde secili aktif site yonetimi.
// Dropdown buraya yazar; API client'lari buradan okuyup X-Site header ekler.
// Hardcode yok: gecerli slug listesi siteConfig benzeri sabit anahtarlardan gelir.

const STORAGE_KEY = 'admin_active_site';

export const SITE_DEFINITIONS: Record<string, {
    label: string;
    title: string;
    montage: boolean;
    campaigns: boolean;
    // Üye menüsü etiketleri — tanımlı değilse sözlükteki varsayılanlar kullanılır
    memberMenu?: { group: string; item: string };
}> = {
    alastik: { label: 'Alastik.com', title: 'ALastik.com', montage: true, campaigns: true },
    lastikjantavm: { label: 'Lastikjantavm.com', title: 'LastikJantAVM', montage: true, campaigns: true },
    // B2B'de montaj noktası ve kampanya yönetimi yok (menüde gizlenir);
    // müşteriler üye değil CARİDİR (8 Eyl kararları)
    b2b: {
        label: 'B2B Toptan',
        title: 'LastikJantAVM B2B',
        montage: false,
        campaigns: false,
        memberMenu: { group: 'Cari Yönetimi', item: 'Cariler' },
    },
};

/** Aktif sitede montaj noktası modülü var mı? (menü görünürlüğü için) */
export function siteHasMontage(slug: string = getActiveSite()): boolean {
    return SITE_DEFINITIONS[slug]?.montage === true;
}

/** Aktif sitede kampanya yönetimi var mı? (menü görünürlüğü için) */
export function siteHasCampaigns(slug: string = getActiveSite()): boolean {
    return SITE_DEFINITIONS[slug]?.campaigns === true;
}

/** Aktif sitenin üye menüsü etiketleri (b2b: Cari Yönetimi/Cariler); yoksa null */
export function getMemberMenuLabels(slug: string = getActiveSite()): { group: string; item: string } | null {
    return SITE_DEFINITIONS[slug]?.memberMenu || null;
}

export const ADMIN_PANEL_TITLE = 'Yönetici Paneli';

const VALID_SITES = Object.keys(SITE_DEFINITIONS);
const DEFAULT_SITE = 'alastik';

export function getActiveSite(): string {
    if (typeof window === 'undefined') return DEFAULT_SITE;
    const value = window.localStorage.getItem(STORAGE_KEY) || '';
    return VALID_SITES.includes(value) ? value : DEFAULT_SITE;
}

export function setActiveSite(site: string): void {
    if (typeof window === 'undefined') return;
    if (!VALID_SITES.includes(site)) return;
    window.localStorage.setItem(STORAGE_KEY, site);
}

export function getSiteHeader(): Record<string, string> {
    return { 'X-Site': getActiveSite() };
}

export const ADMIN_SITES = VALID_SITES;

/**
 * Aktif sitenin medya adresi. Site basina NEXT_PUBLIC_MEDIA_URL_<SLUG> tanimliysa o,
 * degilse ortak NEXT_PUBLIC_MEDIA_URL kullanilir. Boylece panelde LastikJantAVM
 * secildiginde gorsel adresleri o sitenin alan adiyla gosterilir.
 */
const SITE_MEDIA_URLS: Record<string, string | undefined> = {
    alastik: process.env.NEXT_PUBLIC_MEDIA_URL_ALASTIK,
    lastikjantavm: process.env.NEXT_PUBLIC_MEDIA_URL_LASTIKJANTAVM,
};

export function getSiteMediaUrl(): string {
    const ortak = process.env.NEXT_PUBLIC_MEDIA_URL || ''
    return SITE_MEDIA_URLS[getActiveSite()] || ortak
}

/**
 * Aktif sitenin VITRIN adresi (urun/blog/sayfa onizleme baglantilari icin).
 * Site basina NEXT_PUBLIC_SITE_URL_<SLUG> tanimliysa o kullanilir.
 */
const SITE_URLS: Record<string, string | undefined> = {
    alastik: process.env.NEXT_PUBLIC_SITE_URL_ALASTIK,
    lastikjantavm: process.env.NEXT_PUBLIC_SITE_URL_LASTIKJANTAVM,
};

export function getSiteUrl(): string {
    return SITE_URLS[getActiveSite()] || process.env.NEXT_PUBLIC_SITE_URL || ''
}

export function getSiteLabel(slug: string): string {
    return SITE_DEFINITIONS[slug]?.label || slug;
}

/** Sekme basligi: "Yönetici Paneli - <Site>" (aktif siteye gore) */
export function getAdminDocumentTitle(slug: string = getActiveSite()): string {
    return `${ADMIN_PANEL_TITLE} - ${SITE_DEFINITIONS[slug]?.title || SITE_DEFINITIONS[DEFAULT_SITE].title}`;
}
