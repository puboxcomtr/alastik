// Araç sayfası metinleri (LastikJantAVM) — her model için gerçek veriden (yıllar, nesiller, ebatlar,
// bijon, stok) üretilir. Cümle kalıpları model adına göre sabit ama modelden modele farklı seçilir;
// böylece sayfalar birbirinin kopyası olmaz. alastik.com için ayrı kalıplar yazılacak (aynı metin kullanılmaz).
import type { VehicleModelDetail, VehicleSizeStock } from '@/src/services/vehicleService';

export interface Faq { q: string; a: string }

// Model adına göre sabit (deterministik) seçim
function hash(s: string): number {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
}
const pick = <T,>(seed: string, salt: string, arr: T[]): T => arr[hash(seed + salt) % arr.length];

const list = (items: string[], max = 4) => {
    const xs = items.slice(0, max);
    if (xs.length <= 1) return xs.join('');
    return `${xs.slice(0, -1).join(', ')} ve ${xs[xs.length - 1]}`;
};
const years = (from?: number, to?: number) =>
    from && to ? (from === to ? `${from}` : `${from}–${to}`) : from ? `${from} sonrası` : '';

export function vehicleName(d: { makeName: string; modelName: string }) {
    return `${d.makeName} ${d.modelName}`;
}

// Fabrika ebatı → hangi nesillerde/yıllarda kullanıldığı
export function sizeGenerations(d: VehicleModelDetail, size: string): string {
    const gens = d.generations.filter(g => g.modifications.some(m => m.wheels.some(w => w.oe && (w.front?.tire === size || w.rear?.tire === size))));
    return gens.map(g => `${g.name}${g.start ? ` (${years(g.start, g.end)})` : ''}`).join(', ');
}

export function stockedOeSizes(d: VehicleModelDetail): VehicleSizeStock[] {
    return d.stock.tireSizes.filter(s => s.oe && (s.tag?.count || 0) > 0);
}

export function modelIntro(d: VehicleModelDetail): string[] {
    const name = vehicleName(d);
    const seed = `${d.makeSlug}/${d.modelSlug}`;
    const s = d.summary;
    const yr = years(s.yearFrom, s.yearTo);
    const oe = s.oeTireSizes;
    const top = oe[0];
    const genCount = d.generations.length;
    const stocked = stockedOeSizes(d);
    const topStock = d.stock.tireSizes.find(x => x.size === top)?.tag?.count || 0;

    const p1 = pick(seed, 'p1', [
        `${name}${yr ? ` (${yr})` : ''} için fabrika çıkışında ${oe.length > 1 ? `${oe.length} farklı lastik ebadı` : 'tek bir lastik ebadı'} kullanılıyor${oe.length ? `: ${list(oe, 5)}` : ''}. Aracınızın ebadını lastiğin yan yüzündeki yazıdan ya da sürücü kapısı içindeki etiketten kontrol edebilirsiniz.`,
        `${name} modelinde ${genCount > 1 ? `${genCount} nesil boyunca` : 'üretim boyunca'} ${oe.length ? `${list(oe, 5)} ebatları` : 'farklı ebatlar'} orijinal lastik olarak takıldı${yr ? ` (${yr})` : ''}. Hangi ebadın sizin aracınıza ait olduğu motor ve donanım paketine göre değişir.`,
        `${yr ? `${yr} yılları arasında üretilen ` : ''}${name} için orijinal lastik ebatları ${oe.length ? list(oe, 5) : 'donanıma göre değişen ölçüler'}. Aşağıdaki tabloda her ebadın hangi nesilde kullanıldığını ve stoğumuzdaki ürün sayısını görebilirsiniz.`
    ]);

    const p2 = top ? pick(seed, 'p2', [
        `En yaygın ebat ${top}${topStock ? `; bu ebatta şu anda ${topStock} lastik seçeneğimiz var` : ''}. ${stocked.length > 1 ? `Toplamda ${stocked.length} orijinal ebatta stoklu ürün bulunuyor.` : ''}`.trim(),
        `${name} sahiplerinin en çok aradığı ölçü ${top}.${topStock ? ` Stoğumuzda bu ölçüde ${topStock} farklı lastik bulunuyor.` : ''} Ebat üzerine tıklayarak markaları, mevsimleri ve fiyatları karşılaştırabilirsiniz.`,
        `Çoğu ${name} aracında ${top} ebadı kullanılıyor.${topStock ? ` LastikJantAVM’de bu ebatta ${topStock} ürün listeleniyor.` : ''} Farklı jant çapına geçmek istiyorsanız alternatif uyumlu ebatlar tablosuna bakın.`
    ]) : '';

    const bolts = s.boltPatterns;
    const p3 = bolts.length ? pick(seed, 'p3', [
        `Jant seçerken bijon düzeni (PCD) ${list(bolts)}${s.centreBores.length ? `, göbek (merkez) deliği ${list(s.centreBores.map(c => `${c} mm`))}` : ''} olmalıdır. ${s.rimDiameters.length ? `Fabrika jant çapları ${list(s.rimDiameters.map(r => `${r}"`))} aralığındadır.` : ''}`.trim(),
        `${name} jant ölçüleri: bijon ${list(bolts)}${s.centreBores.length ? `, merkez delik ${list(s.centreBores.map(c => `${c} mm`))}` : ''}${s.rimDiameters.length ? `, jant çapı ${list(s.rimDiameters.map(r => `${r} inç`))}` : ''}. Göbek çapı daha büyük bir jant, uygun merkezleme halkasıyla takılabilir.`,
        `Uyumlu jant için ${list(bolts)} bijon aralığı esas alınır${s.centreBores.length ? `; aracın göbek çapı ${list(s.centreBores.map(c => `${c} mm`))}` : ''}. ${s.rimDiameters.length ? `Orijinalde ${list(s.rimDiameters.map(r => `${r}"`))} jantlar kullanılıyor.` : ''}`.trim()
    ]) : '';

    return [p1, p2, p3].filter(Boolean);
}

export function modelFaqs(d: VehicleModelDetail): Faq[] {
    const name = vehicleName(d);
    const seed = `${d.makeSlug}/${d.modelSlug}`;
    const s = d.summary;
    const faqs: Faq[] = [];
    const top = s.oeTireSizes[0];

    if (top) {
        faqs.push({
            q: pick(seed, 'q1', [`${name} lastik ebadı nedir?`, `${name} kaç numara lastik kullanır?`, `${name} hangi ebat lastik takılır?`]),
            a: `${name} için fabrika çıkışı ebatlar ${list(s.oeTireSizes, 6)}. En yaygını ${top}. Kesin ebat için aracınızdaki mevcut lastiğin yan yüzünü kontrol edin.`
        });
    }
    if (s.boltPatterns.length) {
        faqs.push({
            q: pick(seed, 'q2', [`${name} bijon aralığı (PCD) kaç?`, `${name} jant bijon ölçüsü nedir?`]),
            a: `${name} bijon düzeni ${list(s.boltPatterns)}${s.centreBores.length ? `, göbek çapı ${list(s.centreBores.map(c => `${c} mm`))}` : ''}. Jant alırken bu ölçülerin tutması gerekir.`
        });
    }
    if (s.rimDiameters.length) {
        faqs.push({
            q: pick(seed, 'q3', [`${name} kaç inç jant kullanır?`, `${name} jant çapı kaç inç?`]),
            a: `Orijinal jant çapları ${list(s.rimDiameters.map(r => `${r} inç`))}. ${s.optionalTireSizes.length ? `Alternatif uyumlu ebatlarla farklı jant çapları da kullanılabilir.` : ''}`.trim()
        });
    }
    const chains = d.stock.tireSizes.filter(x => x.oe && x.chainCount > 0);
    faqs.push({
        q: pick(seed, 'q4', [`${name} için kar zinciri hangi ölçüde alınmalı?`, `${name} kar zinciri ve kar çorabı ölçüsü nedir?`]),
        a: chains.length
            ? `Kar zinciri, kar paleti ve kar çorabı lastik ebadına göre seçilir. ${name} için ${list(chains.map(c => c.size))} ebatlarında uygun ürünlerimiz var.`
            : `Kar zinciri, kar paleti ve kar çorabı lastik ebadına göre seçilir. Aracınızın ebadıyla kar zinciri kategorimizde arama yapabilirsiniz.`
    });
    return faqs;
}
