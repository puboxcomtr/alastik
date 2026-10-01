// Sayfa sitemap'i: sabit rotalar + yayınlanmış içerik sayfaları (/sayfa/<slug>)
import { getSiteBase, getSiteSlug, fetchSitemapData, urlsetXml, xmlResponse } from '@/src/lib/sitemap';
import { BRANCHES } from '@/src/data/lja/subeler';
import { SERVICE_GROUPS } from '@/src/data/lja/hizmetGruplari';

export const dynamic = 'force-dynamic';

const STATIC_ROUTES = [
    { path: '/', priority: '1.0', changefreq: 'daily' },
    { path: '/iletisim', priority: '0.6', changefreq: 'monthly' },
    { path: '/jant-lastik-hesaplama', priority: '0.6', changefreq: 'monthly' }
];

export async function GET() {
    const base = getSiteBase();
    const pages = await fetchSitemapData('pages');

    // LJA şube ve şube × hizmet sayfaları (yalnızca lastikjantavm.com)
    const branchRoutes = getSiteSlug() === 'lastikjantavm'
        ? [
            { path: '/subeler', priority: '0.7', changefreq: 'weekly' },
            { path: '/ikinci-el', priority: '0.5', changefreq: 'monthly' },
            ...BRANCHES.map(b => ({ path: `/subeler/${b.slug}`, priority: '0.8', changefreq: 'weekly' })),
            ...BRANCHES.flatMap(b => SERVICE_GROUPS.map(g => ({ path: `/subeler/${b.slug}/${g.slug}`, priority: '0.7', changefreq: 'weekly' })))
        ]
        : [];

    const urls = [
        ...STATIC_ROUTES.map(r => ({ loc: `${base}${r.path}`, priority: r.priority, changefreq: r.changefreq })),
        ...branchRoutes.map(r => ({ loc: `${base}${r.path}`, priority: r.priority, changefreq: r.changefreq })),
        ...pages.map(p => ({
            loc: `${base}/sayfa/${p.slug}`,
            lastmod: p.updatedAt,
            changefreq: 'monthly',
            priority: '0.5'
        }))
    ];

    return xmlResponse(urlsetXml(urls));
}
