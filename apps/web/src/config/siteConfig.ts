/**
 * SITES — Web (Next.js) multi-tenant tek doğruluk kaynağı.
 * API tarafındaki sites.js ile slug/domain mantığı AYNIDIR.
 * Tema renkleri (primary/secondary/logo) burada tanımlıdır.
 * Hiçbir yere site bilgisi hardcode EDİLMEZ; her katman bu dosyadan okur.
 */

export type SiteSlug = 'alastik' | 'lastikjantavm';

export interface SiteTheme {
    primary: string;
    secondary: string;
    logo: string;
    assetsBase: string;
    themeCss: string;
}

export interface SiteConfig {
    slug: SiteSlug;
    name: string;
    // Sayfa başlıklarında marka eki olarak kullanılır (örn. "Hesabım | <brandTitle>")
    brandTitle: string;
    metaTitle: string;
    metaDescription: string;
    favicon: string;
    domains: string[];
    theme: SiteTheme;
    active: boolean;
}

// Varsayılan site: Host eşleşmezse buraya düşer. Mevcut tüm veri 'alastik'.
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
            'demo.lastikjantavm.com',
        ],
        theme: {
            primary: '#e4cc15',
            secondary: '#313131',
            logo: '/logo-lastikjantavm.png',
            assetsBase: '/lastikjantavm/assets',
            themeCss: '/lastikjantavm/assets/css/theme.min.css',
        },
        active: true,
    },
};

// Geçerli slug listesi
export const SITE_SLUGS: SiteSlug[] = Object.keys(SITES) as SiteSlug[];

// Host → slug hızlı arama tablosu (KÜÇÜK HARF)
export const DOMAIN_TO_SLUG: Record<string, SiteSlug> = Object.values(SITES).reduce(
    (acc, site) => {
        site.domains.forEach((domain) => {
            acc[domain.toLowerCase()] = site.slug;
        });
        return acc;
    },
    {} as Record<string, SiteSlug>
);

/** Slug geçerli mi? */
export function isValidSite(slug: string): slug is SiteSlug {
    return Object.prototype.hasOwnProperty.call(SITES, slug);
}

/** Slug'dan site kaydını döner. Geçersizse null. */
export function getSiteBySlug(slug: string): SiteConfig | null {
    return isValidSite(slug) ? SITES[slug] : null;
}

/**
 * Host header'dan site slug'ını çözer.
 * Port'u atar (localhost:3080 → localhost), küçük harfe çevirir.
 * Eşleşme yoksa DEFAULT_SITE döner.
 */
export function resolveSiteFromHost(host?: string | null): SiteSlug {
    if (!host) return DEFAULT_SITE;
    const cleanHost = host.split(':')[0].toLowerCase().trim();
    return DOMAIN_TO_SLUG[cleanHost] || DEFAULT_SITE;
}
