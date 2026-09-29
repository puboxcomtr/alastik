// Marka sitemap'i (/marka/<seoUrl>)
import { getSiteBase, fetchSitemapData, urlsetXml, xmlResponse } from '@/src/lib/sitemap';

export const dynamic = 'force-dynamic';

export async function GET() {
    const base = getSiteBase();
    const brands = await fetchSitemapData('brands');

    return xmlResponse(urlsetXml(brands.map(b => ({
        loc: `${base}/marka/${b.slug}`,
        lastmod: b.updatedAt,
        changefreq: 'weekly',
        priority: '0.7'
    }))));
}
