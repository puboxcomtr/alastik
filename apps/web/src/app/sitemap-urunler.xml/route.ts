// Ürün sitemap'i (/urun/<seoUrl>)
import { getSiteBase, fetchSitemapData, urlsetXml, xmlResponse } from '@/src/lib/sitemap';

export const dynamic = 'force-dynamic';

export async function GET() {
    const base = getSiteBase();
    const products = await fetchSitemapData('products');

    return xmlResponse(urlsetXml(products.map(p => ({
        loc: `${base}/urun/${p.slug}`,
        lastmod: p.updatedAt,
        changefreq: 'weekly',
        priority: '0.7'
    }))));
}
