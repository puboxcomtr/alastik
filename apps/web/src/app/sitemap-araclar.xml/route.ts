// Araç sayfaları sitemap'i (yalnızca lastikjantavm.com) — yalnızca dizine açık (stok eşiğini geçen) modeller
// ve en az bir böyle modeli olan markalar listelenir.
import { getSiteBase, getSiteSlug, urlsetXml, xmlResponse } from '@/src/lib/sitemap';
import { getVehicleIndex } from '@/src/services/vehicleService';

export const dynamic = 'force-dynamic';

export async function GET() {
    const base = getSiteBase();
    if (getSiteSlug() !== 'lastikjantavm') return xmlResponse(urlsetXml([]));

    let models: Awaited<ReturnType<typeof getVehicleIndex>> = [];
    try {
        models = (await getVehicleIndex('lastikjantavm')) || [];
    } catch {
        models = [];
    }
    const indexable = models.filter(m => m.indexable);
    const makes = [...new Set(indexable.map(m => m.makeSlug))];

    return xmlResponse(urlsetXml([
        { loc: `${base}/arac`, changefreq: 'weekly', priority: '0.7' },
        ...makes.map(mk => ({ loc: `${base}/arac/${mk}`, changefreq: 'weekly', priority: '0.6' })),
        ...indexable.map(m => ({
            loc: `${base}/arac/${m.makeSlug}/${m.modelSlug}`,
            lastmod: m.updatedAt,
            changefreq: 'weekly',
            priority: '0.6'
        }))
    ]));
}
