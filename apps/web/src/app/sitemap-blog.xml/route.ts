import { getSiteBase, fetchSitemapData, urlsetXml, xmlResponse } from '@/src/lib/sitemap';

export const dynamic = 'force-dynamic';

export async function GET() {
    const base = getSiteBase();
    const posts = await fetchSitemapData('blog');

    return xmlResponse(urlsetXml(posts.map(p => ({
        loc: `${base}/blog/${p.slug}`,
        lastmod: p.updatedAt,
        changefreq: 'monthly',
        priority: '0.6'
    }))));
}
