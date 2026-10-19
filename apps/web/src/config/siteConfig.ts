
export type SiteSlug = 'alastik' | 'lastikjantavm' | 'b2b';

export interface MontageTheme {
    brand: string;
    accent: string;
    tint: string;
    heroFrom: string;
    heroTo: string;
}

export interface SiteTheme {
    primary: string;
    secondary: string;
    logo: string;
    assetsBase: string;
    themeCss: string;
    montage?: MontageTheme;
}

export interface SiteConfig {
    slug: SiteSlug;
    name: string;
    brandTitle: string;
    metaTitle: string;
    metaDescription: string;
    favicon: string;
    domains: string[];
    theme: SiteTheme;
    active: boolean;
    sameOriginApi?: boolean;
}

export const DEFAULT_SITE: SiteSlug = 'alastik';

export const SITES: Record<SiteSlug, SiteConfig> = {
    alastik: {
        slug: 'alastik',
        name: 'ALastik',
        brandTitle: 'ALastik.com',
        metaTitle: "A Lastik.com | Online Lastik Satışı – En Uygun Fiyatlı Lastikler",
        metaDescription: "Binek, SUV ve ticari araçlar için geniş lastik seçenekleri ALastik.com'da. Uygun fiyat, güvenilir alışveriş ve hızlı sipariş avantajlarını keşfedin.",
        favicon: '/alastik/favicon.ico',
        domains: [
            'alastik.com',
            'www.alastik.com',
            'dev.alastik.com',
        ],
        theme: {
            primary: '#f2223b',
            secondary: '#f2223b',
            logo: '/logo-alastik.png',
            assetsBase: '/alastik/assets',
            themeCss: '/alastik/assets/css/theme.min.css',
            montage: { brand: '#f2223b', accent: '#f2223b', tint: '#fff1f2', heroFrom: '#8f0a1d', heroTo: '#ff7a8a' },
        },
        active: true,
    },

    lastikjantavm: {
        slug: 'lastikjantavm',
        name: 'LastikJantAVM',
        brandTitle: 'LastikJantAVM',
        metaTitle: "LastikJantAVM | Online Lastik ve Jant Satışı",
        metaDescription: "Binek, SUV ve ticari araçlar için geniş lastik ve jant seçenekleri LastikJantAVM'de. Uygun fiyat, güvenilir alışveriş ve hızlı sipariş.",
        favicon: '/lastikjantavm/favicon.ico',
        domains: [
            'lastikjantavm.com',
            'www.lastikjantavm.com',
        ],
        theme: {
            primary: '#e4cc15',
            secondary: '#313131',
            logo: '/logo-lastikjantavm.png',
            assetsBase: '/lastikjantavm/assets',
            themeCss: '/lastikjantavm/assets/css/theme.min.css',
            montage: { brand: '#313131', accent: '#e4cc15', tint: '#fdf6c7', heroFrom: '#0f0f0f', heroTo: '#5c5c5c' },
        },
        active: true,
    },

    b2b: {
        slug: 'b2b',
        name: 'LastikJantAVM B2B',
        brandTitle: 'LastikJantAVM B2B',
        metaTitle: 'LastikJantAVM B2B | Toptan Lastik ve Jant',
        metaDescription: 'LastikJantAVM bayi ve toptan satış platformu.',
        favicon: '/lastikjantavm/favicon.ico',
        domains: [
            'b2b.lastikjantavm.com',
            'demo.lastikjantavm.com',
        ],
        theme: {
            primary: '#e4cc15',
            secondary: '#313131',
            logo: '/logo-lastikjantavm.png',
            assetsBase: '/lastikjantavm/assets',
            themeCss: '',
        },
        active: true,
        sameOriginApi: true,
    },
};

export const SITE_SLUGS: SiteSlug[] = Object.keys(SITES) as SiteSlug[];

export const DOMAIN_TO_SLUG: Record<string, SiteSlug> = Object.values(SITES).reduce(
    (acc, site) => {
        site.domains.forEach((domain) => {
            acc[domain.toLowerCase()] = site.slug;
        });
        return acc;
    },
    {} as Record<string, SiteSlug>
);

export function isValidSite(slug: string): slug is SiteSlug {
    return Object.prototype.hasOwnProperty.call(SITES, slug);
}

export function getSiteBySlug(slug: string): SiteConfig | null {
    return isValidSite(slug) ? SITES[slug] : null;
}

export function resolveSiteFromHost(host?: string | null): SiteSlug {
    if (!host) return DEFAULT_SITE;
    const cleanHost = host.split(':')[0].toLowerCase().trim();
    return DOMAIN_TO_SLUG[cleanHost] || DEFAULT_SITE;
}
