// Konum sayfaları sitemap'i (yalnızca lastikjantavm.com) — yalnızca dizine açık sayfalar:
// 81 il; İstanbul ilçeleri + 30 km içinde montaj noktası / sipariş verisi olan ilçeler; şubeye 7 km'den yakın İstanbul mahalleleri.
import { getSiteBase, getSiteSlug, urlsetXml, xmlResponse } from '@/src/lib/sitemap';
import { ILLER, ILCELER, MAHALLELER, ISTANBUL_ID, ilById, hasGeo } from '@/src/lib/geo';
import { getMontagePoints, getRegionStats, nearestPoints, nearestBranch } from '@/src/lib/locationData';

export const dynamic = 'force-dynamic';

export async function GET() {
    const base = getSiteBase();
    if (getSiteSlug() !== 'lastikjantavm') return xmlResponse(urlsetXml([]));

    let points: Awaited<ReturnType<typeof getMontagePoints>> = [];
    try { points = await getMontagePoints('lastikjantavm'); } catch { points = []; }
    const stats = await getRegionStats('lastikjantavm');
    const istanbul = ilById(ISTANBUL_ID)!;
    const districtSlug = new Map(ILCELER.map(d => [d.id, d.slug]));

    const ilceUrls = ILCELER.filter(d =>
        d.cityId === ISTANBUL_ID
        || !!stats[`d:${d.id}`]?.topSizes?.length
        || (hasGeo(d) && points.length > 0 && nearestPoints(d, points, 1)[0]?.km <= 30)
    ).map(d => `${base}/lastikci/${ilById(d.cityId)?.slug}/${d.slug}`);

    const mahalleUrls = MAHALLELER.filter(m => hasGeo(m) && nearestBranch(m).km <= 7)
        .map(m => `${base}/lastikci/${istanbul.slug}/${districtSlug.get(m.districtId)}/${m.slug}`);

    return xmlResponse(urlsetXml([
        { loc: `${base}/lastikci`, changefreq: 'weekly', priority: '0.6' },
        ...ILLER.map(c => ({ loc: `${base}/lastikci/${c.slug}`, changefreq: 'weekly', priority: '0.6' })),
        ...ilceUrls.map(loc => ({ loc, changefreq: 'weekly', priority: '0.5' })),
        ...mahalleUrls.map(loc => ({ loc, changefreq: 'monthly', priority: '0.4' }))
    ]));
}
