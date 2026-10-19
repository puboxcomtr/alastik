import type { VehicleModelSummary } from '@/src/services/vehicleService';
import type { BrandContent, Section, TextLink } from '@/src/lib/brandText';
import { VEHICLE_BRAND_PROFILES, type VehicleBrandProfile } from '@/src/data/lja/aracMarkaProfilleri';

export interface VehicleMakeData { makeSlug: string; makeName: string; models: VehicleModelSummary[] }

const nf = (n: number) => n.toLocaleString('tr-TR');
const list = (items: string[], max = 5) => {
    const xs = items.slice(0, max);
    if (xs.length <= 1) return xs.join('');
    return `${xs.slice(0, -1).join(', ')} ve ${xs[xs.length - 1]}`;
};
const years = (from?: number, to?: number) =>
    from && to ? (from === to ? `${from}` : `${from}–${to}`) : from ? `${from} sonrası` : '';

function countBy<T extends string | number>(models: VehicleModelSummary[], pick: (m: VehicleModelSummary) => T[]): [T, number][] {
    const map = new Map<T, number>();
    for (const m of models) for (const v of new Set(pick(m))) map.set(v, (map.get(v) || 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), 'tr'));
}

function modelsForSize(models: VehicleModelSummary[], size: string): VehicleModelSummary[] {
    return models.filter(m => m.oeTireSizes.includes(size)).sort((a, b) => Number(b.indexable) - Number(a.indexable) || a.modelName.localeCompare(b.modelName, 'tr'));
}

export function buildVehicleBrandContent(d: VehicleMakeData): BrandContent {
    const p: VehicleBrandProfile | undefined = VEHICLE_BRAND_PROFILES[d.makeSlug];
    const display = p?.display || d.makeName;
    const models = d.models;
    const stocked = models.filter(m => m.indexable);
    const sizes = countBy<string>(models, m => m.oeTireSizes);
    const rims = countBy<number>(models, m => m.rimDiameters);
    const bolts = countBy<string>(models, m => m.boltPatterns);
    const yearFrom = Math.min(...models.map(m => m.yearFrom || 9999));
    const yearTo = Math.max(...models.map(m => m.yearTo || m.yearFrom || 0));
    const minRim = rims.length ? Math.min(...rims.map(([r]) => r)) : 0;
    const maxRim = rims.length ? Math.max(...rims.map(([r]) => r)) : 0;
    const modelHref = (m: VehicleModelSummary) => `/arac/${m.makeSlug}/${m.modelSlug}`;

    const intro: string[] = [];
    if (p) intro.push(`${display}, ${p.tagline}.`);
    intro.push(
        `Bu sayfada ${display} markasının ${nf(models.length)} modeline ait fabrika çıkışı lastik ebatlarını, jant çaplarını ve bijon ölçülerini` +
        `${yearFrom < 9999 && yearTo ? ` (${years(yearFrom, yearTo)} model yılları)` : ''} tek yerde topladık. ` +
        (stocked.length
            ? `${nf(stocked.length)} model için fabrika ebatında lastik şu anda stoğumuzda; modelin sayfasında nesil ve motor seçeneğine göre doğru ebatı ve uygun ürünleri görebilirsiniz.`
            : 'Modelin sayfasında nesil ve motor seçeneğine göre doğru ebatı görebilir, ebat sayfasından uygun lastikleri inceleyebilirsiniz.')
    );

    const sections: Section[] = [];

    if (p) {
        sections.push({ id: 'hakkinda', title: `${display} Hakkında`, paragraphs: p.about });
    }

    if (sizes.length) {
        const top = sizes.slice(0, 8);
        sections.push({
            id: 'ebatlar',
            title: `${display} Modellerinde En Yaygın Lastik Ebatları`,
            paragraphs: [
                `${display} modellerinde toplam ${nf(sizes.length)} farklı fabrika ebatı kullanılıyor. En sık karşılaşılan ebatlar ve bu ebatı fabrika çıkışı kullanan modeller aşağıda; ` +
                `ebata tıklayarak stoktaki lastikleri, modele tıklayarak nesil ve motor bazında tam ölçüleri görebilirsiniz.`
            ],
            list: top.map(([size, n]) => {
                const ms = modelsForSize(models, size);
                return {
                    label: size,
                    href: `/etiket/${size.replace(/[\/ ]/g, '-').replace(/-r/i, '-r').toLowerCase()}-lastik-fiyatlari`,
                    text: `${n} modelde fabrika ebatı — ${list(ms.map(m => m.modelName), 5)}${ms.length > 5 ? ` ve ${ms.length - 5} model daha` : ''}.`
                };
            }),
            after: [
                `Aynı modelin farklı nesil ve donanımlarında ebat değişebilir; lastik alırken kapı sütunundaki etikete veya model sayfasındaki nesil tablosuna göre karar verin.`
            ]
        });
    }

    if (rims.length || bolts.length) {
        const paragraphs: string[] = [];
        if (rims.length) {
            paragraphs.push(
                `${display} modellerinde jant çapı ${minRim}" ile ${maxRim}" arasında değişiyor; en yaygın çaplar ${list(rims.slice(0, 4).map(([r, n]) => `${r} inç (${n} model)`), 4)}. ` +
                `Jant çapı büyüdükçe genellikle lastik yanağı incelir: sürüş daha sert ama direksiyon tepkisi daha keskin olur.`
            );
        }
        if (bolts.length) {
            paragraphs.push(
                `Bijon düzeninde ${bolts.length === 1 ? `markanın modelleri tek ölçü kullanıyor: ${bolts[0][0]}` : `${bolts.length} farklı ölçü var; en yaygınları ${list(bolts.slice(0, 4).map(([b, n]) => `${b} (${n} model)`), 4)}`}. ` +
                `Jant seçerken bijon düzeniyle birlikte göbek çapı (CB) ve ofset (ET) değerlerinin de aracınıza uyması gerekir; model sayfalarında bu değerler motor seçeneğine göre listelenir.`
            );
        }
        sections.push({ id: 'jant', title: `${display} Jant Ölçüleri: Çap ve Bijon`, paragraphs });
    }

    if (p?.tireNotes?.length) {
        sections.push({
            id: 'secim',
            title: `${display} İçin Lastik Seçerken`,
            paragraphs: [p.tireIntro || `${display} sahiplerinin lastik seçiminde dikkat etmesi gereken noktalar:`],
            list: p.tireNotes.map(text => ({ label: '', text }))
        });
    }

    if (stocked.length) {
        sections.push({
            id: 'stok',
            title: `Fabrika Ebatında Lastiği Stokta Olan ${display} Modelleri`,
            paragraphs: [
                `${list(stocked.map(m => m.modelName), 12)}${stocked.length > 12 ? ` ve ${stocked.length - 12} model daha` : ''} için fabrika ebatındaki lastikler şu anda stoğumuzda. ` +
                `Model sayfasından ebatı seçip yaz, kış veya 4 mevsim lastikleri karşılaştırabilir; Türkiye'nin 81 ilindeki anlaşmalı montaj noktalarından birinde montaj hizmetini de birlikte satın alabilirsiniz.`
            ]
        });
    }

    const faqs: { q: string; a: string }[] = [];
    if (sizes.length) {
        const [top, n] = sizes[0];
        faqs.push({ q: `${display} araçlarda en yaygın lastik ebatı nedir?`, a: `Kataloğumuzdaki ${display} modelleri arasında en yaygın fabrika ebatı ${top} (${n} model). Ancak aynı modelin nesil ve donanımına göre ebat değişir; kesin ölçü için modelinizin sayfasına veya kapı sütunundaki lastik etiketine bakın.` });
    }
    if (bolts.length) {
        faqs.push({ q: `${display} jant bijon ölçüsü kaç?`, a: bolts.length === 1 ? `${display} modellerinde bijon düzeni ${bolts[0][0]} olarak kullanılıyor. Jant alırken göbek çapı ve ofset değerlerini de model sayfasından kontrol edin.` : `${display} modellerinde ${bolts.length} farklı bijon düzeni var; en yaygınları ${list(bolts.slice(0, 3).map(([b]) => b), 3)}. Modelinizin sayfasında motor seçeneğine göre bijon, göbek çapı ve ofset değerleri listelenir.` });
    }
    if (p?.faqs) faqs.push(...p.faqs);
    faqs.push({ q: `${display} aracıma lastik alırken montaj da yaptırabilir miyim?`, a: `Evet. Lastiği sepete ekledikten sonra Türkiye'nin 81 ilindeki anlaşmalı montaj noktalarından birini seçebilir, montaj ve balans hizmetini online satın alabilirsiniz; lastikler doğrudan seçtiğiniz noktaya gönderilir.` });

    const modelLinks: TextLink[] = [...models]
        .sort((a, b) => Number(b.indexable) - Number(a.indexable) || a.modelName.localeCompare(b.modelName, 'tr'))
        .map(m => ({ href: modelHref(m), label: m.modelName }));
    const sizeLinks: TextLink[] = sizes.slice(0, 20).map(([size, n]) => ({
        href: `/etiket/${size.replace(/[\/ ]/g, '-').toLowerCase()}-lastik-fiyatlari`, label: size, n
    }));

    const examples = stocked.slice(0, 4).map(m => m.modelName).join(', ');
    return {
        display,
        h1: `${display} Lastik Ebatları, Uyumlu Jant ve Kar Zinciri`,
        title: `${display} Lastik Ebatları ve Uyumlu Jant – Modele Göre | LastikJantAVM`,
        description: p
            ? `${display} ${p.tagline}. ${nf(models.length)} modelin fabrika lastik ebatları, jant çapı ve bijon ölçüleri${examples ? `; ${examples} ve diğerleri` : ''}.`
            : `${display} modellerinin orijinal lastik ebatları, bijon ölçüleri ve uyumlu lastik, jant, kar zinciri seçenekleri${examples ? `: ${examples} ve diğerleri` : ''}.`,
        intro,
        sections,
        faqs,
        seasonLinks: [],
        seriesLinks: modelLinks,
        sizeLinks
    };
}
