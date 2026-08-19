// Sayfa sitemap'i: sabit rotalar + yayınlanmış içerik sayfaları (/sayfa/<slug>)
import { getSiteBase, fetchSitemapData, urlsetXml, xmlResponse } from '@/src/lib/sitemap';

export const dynamic = 'force-dynamic';

const STATIC_ROUTES = [
    { path: '/', priority: '1.0', changefreq: 'daily' },
    { path: '/iletisim', priority: '0.6', changefreq: 'monthly' },
    { path: '/jant-lastik-hesaplama', priority: '0.6', changefreq: 'monthly' }
];

export async function GET() {
    const base = getSiteBase();
    const pages = await fetchSitemapData('pages');

    const urls = [
        ...STATIC_ROUTES.map(r => ({ loc: `${base}${r.path}`, priority: r.priority, changefreq: r.changefreq })),
        ...pages.map(p => ({
            loc: `${base}/sayfa/${p.slug}`,
            lastmod: p.updatedAt,
            changefreq: 'monthly',
            priority: '0.5'
        }))
    ];

    return xmlResponse(urlsetXml(urls));
}
