// Kategori sitemap'i (/kategori/<seoUrl>)
import { getSiteBase, fetchSitemapData, urlsetXml, xmlResponse } from '@/src/lib/sitemap';

export const dynamic = 'force-dynamic';

export async function GET() {
    const base = getSiteBase();
    const categories = await fetchSitemapData('categories');

    return xmlResponse(urlsetXml(categories.map(c => ({
        loc: `${base}/kategori/${c.slug}`,
        lastmod: c.updatedAt,
        changefreq: 'weekly',
        priority: '0.8'
    }))));
}
