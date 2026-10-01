// Ana sitemap index — alt sitemap'leri tek yerden listeler
import { getSiteBase, getSiteSlug, sitemapIndexXml, xmlResponse } from '@/src/lib/sitemap';

export const dynamic = 'force-dynamic';

export async function GET() {
    const base = getSiteBase();
    return xmlResponse(sitemapIndexXml([
        `${base}/sitemap-sayfalar.xml`,
        `${base}/sitemap-kategoriler.xml`,
        `${base}/sitemap-markalar.xml`,
        `${base}/sitemap-urunler.xml`,
        `${base}/sitemap-etiketler.xml`,
        `${base}/sitemap-blog.xml`,
        // Araç sayfaları yalnızca lastikjantavm.com'da
        ...(getSiteSlug() === 'lastikjantavm' ? [`${base}/sitemap-araclar.xml`] : [])
    ]));
}
