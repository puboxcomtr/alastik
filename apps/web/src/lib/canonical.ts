// Canonical ve robots kuralları — tüm SEO sayfaları (kategori, etiket, marka, ürün, blog, sayfa, ana sayfa)
// aynı kuralı buradan alır. Yalnızca server component / generateMetadata içinde kullanılabilir.
//
// Kural:
//  - Parametresiz adres            → canonical: kendi temiz adresi
//  - Sadece ?page=N (N > 1)        → canonical: kendi adresi + ?page=N (sayfalar ayrı ayrı dizine girebilir)
//  - Filtre / sıralama parametresi → noindex, follow (kopya içerik üretmesin, linkler takip edilsin)
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { SITES, DEFAULT_SITE, isValidSite, resolveSiteFromHost } from '@/src/config/siteConfig';

type SearchParams = Record<string, string | string[] | undefined> | undefined;

// Sitenin ana adresi (https://<domains[0]>) — x-site header'ı yoksa Host'tan çözülür
export async function getSiteOrigin(): Promise<string> {
    const hdrs = await headers();
    const fromHeader = hdrs.get('x-site');
    const slug = fromHeader && isValidSite(fromHeader) ? fromHeader : resolveSiteFromHost(hdrs.get('host'));
    const site = isValidSite(slug) ? SITES[slug] : SITES[DEFAULT_SITE];
    return `https://${site.domains[0]}`;
}

// path: sayfanın yolu, ör. '/kategori/yaz-lastikleri' (ana sayfa için '/')
export async function canonicalMeta(path: string, searchParams?: SearchParams): Promise<Pick<Metadata, 'alternates' | 'robots'>> {
    const active = Object.entries(searchParams || {}).filter(([, v]) => v !== undefined && v !== '');
    if (active.some(([key]) => key !== 'page')) {
        return { robots: { index: false, follow: true } };
    }

    const origin = await getSiteOrigin();
    const page = Number(searchParams?.page);
    const query = Number.isInteger(page) && page > 1 ? `?page=${page}` : '';
    return { alternates: { canonical: `${origin}${path}${query}` } };
}
