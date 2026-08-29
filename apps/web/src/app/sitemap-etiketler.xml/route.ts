// Etiket sitemap'i (/etiket/<seoUrl>) — aktif ve ürünü olan etiketler, site kapsamlı
import { getSiteBase, fetchSitemapData, urlsetXml, xmlResponse } from '@/src/lib/sitemap';

export const dynamic = 'force-dynamic';

export async function GET() {
    const base = getSiteBase();
    const tags = await fetchSitemapData('tags');

    return xmlResponse(urlsetXml(tags.map(t => ({
        loc: `${base}/etiket/${t.slug}`,
        lastmod: t.updatedAt,
        changefreq: 'weekly',
        priority: '0.7'
    }))));
}
