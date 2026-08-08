// Admin panelde secili aktif site yonetimi.
// Dropdown buraya yazar; API client'lari buradan okuyup X-Site header ekler.
// Hardcode yok: gecerli slug listesi siteConfig benzeri sabit anahtarlardan gelir.

const STORAGE_KEY = 'admin_active_site';

export const SITE_DEFINITIONS: Record<string, { label: string }> = {
    alastik: { label: 'Alastik.com' },
    lastikjantavm: { label: 'Lastikjantavm.com' },
};

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
