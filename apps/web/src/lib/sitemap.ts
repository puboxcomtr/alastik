// Sitemap route handler'larının ortak yardımcıları.
// Site host'tan çözülür; URL'ler sitenin ana domain'iyle üretilir.
import { headers } from 'next/headers';
import { SITES, DEFAULT_SITE, isValidSite, resolveSiteFromHost } from '@/src/config/siteConfig';
import { API_ENDPOINTS } from '@/src/config/api';

export interface SitemapEntry {
    slug: string;
    updatedAt?: string;
}

// Middleware .xml/.txt uzantılı istekleri atladığı için x-site header'ı
// oluşmayabilir; site her zaman Host üzerinden de çözülür
export function getSiteSlug(): string {
    const hdrs = headers();
    const fromHeader = hdrs.get('x-site');
    if (fromHeader && isValidSite(fromHeader)) return fromHeader;
    return resolveSiteFromHost(hdrs.get('host'));
}

export function getSiteBase(): string {
    const slug = getSiteSlug();
    const site = isValidSite(slug) ? SITES[slug] : SITES[DEFAULT_SITE];
    // domains[0] ana adres kabul edilir (www'suz)
    return `https://${site.domains[0]}`;
}

export async function fetchSitemapData(type: 'pages' | 'products' | 'categories' | 'blog' | 'tags'): Promise<SitemapEntry[]> {
    try {
        const base = API_ENDPOINTS.definition.get().replace(/\/definition$/, '');
        const res = await fetch(`${base}/sitemap-data/${type}`, {
            next: { revalidate: 900 },
            headers: { 'X-Site': getSiteSlug() }
        });
        if (!res.ok) return [];
        const json = await res.json();
        return json.success ? json.data : [];
    } catch {
        return [];
    }
}

const xmlEscape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export function urlsetXml(urls: Array<{ loc: string; lastmod?: string; changefreq?: string; priority?: string }>): string {
    const body = urls.map(u => {
        let entry = `  <url>\n    <loc>${xmlEscape(u.loc)}</loc>\n`;
        if (u.lastmod) entry += `    <lastmod>${new Date(u.lastmod).toISOString().split('T')[0]}</lastmod>\n`;
        if (u.changefreq) entry += `    <changefreq>${u.changefreq}</changefreq>\n`;
        if (u.priority) entry += `    <priority>${u.priority}</priority>\n`;
        return entry + '  </url>';
    }).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`;
}

export function sitemapIndexXml(locs: string[]): string {
    const today = new Date().toISOString().split('T')[0];
    const body = locs.map(loc =>
        `  <sitemap>\n    <loc>${xmlEscape(loc)}</loc>\n    <lastmod>${today}</lastmod>\n  </sitemap>`
    ).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>`;
}

export function xmlResponse(xml: string): Response {
    return new Response(xml, {
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=900'
        }
    });
}
