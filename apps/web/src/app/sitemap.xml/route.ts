// Ana sitemap index — alt sitemap'leri tek yerden listeler
import { getSiteBase, sitemapIndexXml, xmlResponse } from '@/src/lib/sitemap';

export const dynamic = 'force-dynamic';

export async function GET() {
    const base = getSiteBase();
    return xmlResponse(sitemapIndexXml([
        `${base}/sitemap-sayfalar.xml`,
        `${base}/sitemap-kategoriler.xml`,
        `${base}/sitemap-urunler.xml`,
        `${base}/sitemap-etiketler.xml`,
        `${base}/sitemap-blog.xml`
    ]));
}
