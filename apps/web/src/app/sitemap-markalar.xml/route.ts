// Marka sitemap'i (/marka/<seoUrl>); LJA'da dizine açık marka × mevsim sayfaları da eklenir
import { getSiteBase, getSiteSlug, fetchSitemapData, urlsetXml, xmlResponse } from '@/src/lib/sitemap';
import { getBrandSeoIndex } from '@/src/services/brandSeoService';
import { SEASON_PATHS, SEASON_INDEX_MIN, isTireBrand } from '@/src/lib/brandText';

export const dynamic = 'force-dynamic';

export async function GET() {
    const base = getSiteBase();
    const site = getSiteSlug();
    const brands = await fetchSitemapData('brands');

    const urls = brands.map(b => ({
        loc: `${base}/marka/${b.slug}`,
        lastmod: b.updatedAt,
        changefreq: 'weekly',
        priority: '0.7'
    }));

    if (site === 'lastikjantavm') {
        const index = await getBrandSeoIndex(site);
        for (const row of index) {
            if (!isTireBrand(row.slug)) continue;
            for (const key of Object.keys(SEASON_PATHS) as (keyof typeof SEASON_PATHS)[]) {
                if ((row.seasons?.[key] || 0) < SEASON_INDEX_MIN) continue;
                urls.push({ loc: `${base}/marka/${row.slug}/${SEASON_PATHS[key]}`, lastmod: row.updatedAt, changefreq: 'weekly', priority: '0.6' });
            }
        }
    }

    return xmlResponse(urlsetXml(urls));
}
