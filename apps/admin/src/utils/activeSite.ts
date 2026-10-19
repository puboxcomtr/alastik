
const STORAGE_KEY = 'admin_active_site';

export const SITE_DEFINITIONS: Record<string, {
    label: string;
    title: string;
    montage: boolean;
    campaigns: boolean;
    analytics: boolean;
    seo: boolean;
    cargoEdit: boolean;
    financialDiscounts: boolean;
    loginPopup: boolean;
    salespersons: boolean;
    cartFollowUp: boolean;
    memberMenu?: { group: string; item: string };
}> = {
    alastik: { label: 'Alastik.com', title: 'ALastik.com', montage: true, campaigns: true, analytics: true, seo: true, cargoEdit: false, financialDiscounts: false, loginPopup: false, salespersons: false, cartFollowUp: true },
    lastikjantavm: { label: 'Lastikjantavm.com', title: 'LastikJantAVM', montage: true, campaigns: true, analytics: true, seo: true, cargoEdit: true, financialDiscounts: false, loginPopup: false, salespersons: false, cartFollowUp: true },
    b2b: {
        label: 'B2B Toptan',
        title: 'LastikJantAVM B2B',
        montage: false,
        campaigns: false,
        analytics: false,
        seo: false,
        cargoEdit: true,
        financialDiscounts: true,
        loginPopup: true,
        salespersons: true,
        cartFollowUp: false,
        memberMenu: { group: 'Cari Yönetimi', item: 'Cariler' },
    },
};

export function siteHasCartFollowUp(slug: string = getActiveSite()): boolean {
    return SITE_DEFINITIONS[slug]?.cartFollowUp === true;
}

export function siteHasMontage(slug: string = getActiveSite()): boolean {
    return SITE_DEFINITIONS[slug]?.montage === true;
}

export function siteHasCampaigns(slug: string = getActiveSite()): boolean {
    return SITE_DEFINITIONS[slug]?.campaigns === true;
}

export function siteHasAnalytics(slug: string = getActiveSite()): boolean {
    return SITE_DEFINITIONS[slug]?.analytics === true;
}

export function siteHasSeo(slug: string = getActiveSite()): boolean {
    return SITE_DEFINITIONS[slug]?.seo === true;
}

export function siteHasCargoEdit(slug: string = getActiveSite()): boolean {
    return SITE_DEFINITIONS[slug]?.cargoEdit === true;
}

export function siteHasFinancialDiscounts(slug: string = getActiveSite()): boolean {
    return SITE_DEFINITIONS[slug]?.financialDiscounts === true;
}

export function siteHasLoginPopup(slug: string = getActiveSite()): boolean {
    return SITE_DEFINITIONS[slug]?.loginPopup === true;
}

export function siteHasSalespersons(slug: string = getActiveSite()): boolean {
    return SITE_DEFINITIONS[slug]?.salespersons === true;
}

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

const SITE_MEDIA_URLS: Record<string, string | undefined> = {
    alastik: process.env.NEXT_PUBLIC_MEDIA_URL_ALASTIK,
    lastikjantavm: process.env.NEXT_PUBLIC_MEDIA_URL_LASTIKJANTAVM,
};

export function getSiteMediaUrl(): string {
    const ortak = process.env.NEXT_PUBLIC_MEDIA_URL || ''
    return SITE_MEDIA_URLS[getActiveSite()] || ortak
}

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

export function getAdminDocumentTitle(slug: string = getActiveSite()): string {
    return `${ADMIN_PANEL_TITLE} - ${SITE_DEFINITIONS[slug]?.title || SITE_DEFINITIONS[DEFAULT_SITE].title}`;
}
