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

export function getSiteLabel(slug: string): string {
    return SITE_DEFINITIONS[slug]?.label || slug;
}
