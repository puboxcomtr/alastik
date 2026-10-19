import type { BrandSeo, BrandSeoStats, SeasonKey, Pair } from '@/src/services/brandSeoService';
import { getBrandProfile, type BrandProfile, type BrandKind } from '@/src/data/lja/markaProfilleri';

export const SEASON_PATHS: Record<SeasonKey, string> = { yaz: 'yaz-lastikleri', kis: 'kis-lastikleri', dort: '4-mevsim-lastikleri' };
export const SEASON_BY_PATH: Record<string, SeasonKey> = { 'yaz-lastikleri': 'yaz', 'kis-lastikleri': 'kis', '4-mevsim-lastikleri': 'dort' };
const SEASON_LABEL: Record<SeasonKey, string> = { yaz: 'Yaz', kis: 'Kış', dort: '4 Mevsim' };
const SEASON_DIA: Record<SeasonKey, string> = { yaz: 'Yaz', kis: 'Kış', dort: '4 Mevsim' };
const SEASON_LOWER: Record<SeasonKey, string> = { yaz: 'yaz', kis: 'kış', dort: 'dört mevsim' };

export const SEASON_PAGE_MIN = 3;
export const SEASON_INDEX_MIN = 6;

export interface TextLink { href: string; label: string; n?: number }
export interface ListItem { label: string; href?: string; text: string }
export interface Section { id: string; title: string; paragraphs: string[]; list?: ListItem[]; after?: string[] }
export interface BrandContent {
    display: string;
    h1: string;
    title: string;
    description: string;
    intro: string[];
    sections: Section[];
    faqs: { q: string; a: string }[];
    seasonLinks: TextLink[];
    seriesLinks: TextLink[];
    sizeLinks: TextLink[];
}

const nf = (n: number) => n.toLocaleString('tr-TR');
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
const sum = (rows: Pair[]) => rows.reduce((s, [, n]) => s + n, 0);
const get = (rows: Pair[], key: string) => rows.find(([k]) => k === key)?.[1] || 0;
const titleCase = (s: string) => s.toLocaleLowerCase('tr-TR').replace(/(^|\s)(\S)/g, (_, a, b) => a + b.toLocaleUpperCase('tr-TR'));
const slugify = (s: string) => String(s || '').toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const seriesKey = (s: string) => String(s || '').toLocaleLowerCase('tr-TR').replace(/ı/g, 'i').replace(/[^a-z0-9]+/g, '');

function seedOf(s: string) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }
const pick = <T,>(seed: string, arr: T[]): T => arr[seedOf(seed) % arr.length];

function copula(phrase: string): string {
    const w = phrase.trim();
    const vowels = w.match(/[aeıioöuü]/gi) || [];
    const v = (vowels[vowels.length - 1] || 'e').toLocaleLowerCase('tr-TR');
    const tail = 'aı'.includes(v) ? 'ır' : 'ei'.includes(v) ? 'ir' : 'ou'.includes(v) ? 'ur' : 'ür';
    const hard = /[fsthçkpş]$/i.test(w) ? 't' : 'd';
    return `${w}${hard}${tail}`;
}
const capFirst = (s: string) => s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1);
const COUNTRY: Record<string, string> = { 'ABD': 'ABD', 'ÇEK.CUM.': 'Çek Cumhuriyeti', 'GÜNEY KORE': 'Güney Kore', 'İNGİLTERE': 'İngiltere' };
const countryName = (c: string) => COUNTRY[c] || titleCase(c);

function joinTr(items: string[]): string {
    if (items.length <= 1) return items[0] || '';
    return `${items.slice(0, -1).join(', ')} ve ${items[items.length - 1]}`;
}

function rimSummary(rims: Pair[]): { min?: number; max?: number; top: string[] } {
    const nums = rims.map(([r, n]) => [parseFloat(r), n] as [number, number]).filter(([r]) => !isNaN(r));
    if (!nums.length) return { top: [] };
    const sorted = [...nums].sort((a, b) => b[1] - a[1]);
    const top = [...new Set(sorted.slice(0, 3).map(([r]) => String(r)))];
    return { min: Math.min(...nums.map(([r]) => r)), max: Math.max(...nums.map(([r]) => r)), top };
}

function seasonCounts(stats: BrandSeoStats): Record<SeasonKey, number> {
    return { yaz: get(stats.seasons, 'Yaz'), kis: get(stats.seasons, 'Kış'), dort: get(stats.seasons, '4 Mevsim') };
}

function gradeSentence(rows: Pair[], label: string): string | null {
    const total = sum(rows);
    if (total < 3) return null;
    const a = get(rows, 'A'), b = get(rows, 'B');
    if (a + b === 0) return null;
    const parts: string[] = [];
    if (a) parts.push(`A sınıfı %${pct(a, total)}`);
    if (b) parts.push(`B sınıfı %${pct(b, total)}`);
    return `Etiket bilgisi olan ürünlerde ${label} dağılımı: ${joinTr(parts)}.`;
}

function seriesLabel(season: string | null): string {
    if (season === 'Yaz') return 'yaz lastiği';
    if (season === 'Kış') return 'kış lastiği';
    if (season === '4 Mevsim') return 'dört mevsim lastiği';
    return 'lastik';
}

function seriesLink(brandSlug: string, name: string, tags: BrandSeo['tags']): string | undefined {
    const s = slugify(name);
    const hit = tags.series.find(t => t.url.startsWith(`${brandSlug}-${s}-`));
    return hit ? `/etiket/${hit.url}` : undefined;
}

function seriesItems(brandSlug: string, profile: BrandProfile, data: BrandSeo, limit: number): ListItem[] {
    const seen = new Set<string>();
    const items: ListItem[] = [];
    for (const s of data.stats.series) {
        const key = seriesKey(s.name);
        if (!key || seen.has(`${key}|${s.season}`)) continue;
        seen.add(`${key}|${s.season}`);
        const note = profile.series?.[key];
        const slugLike = /[a-z]-[a-z]/.test(s.name);
        const allCaps = s.name.length > 4 && s.name === s.name.toLocaleUpperCase('tr-TR');
        const label = slugLike || allCaps ? titleCase(s.name.replace(/-/g, ' ')) : s.name;
        items.push({
            label: `${profile.display} ${label}`,
            href: seriesLink(brandSlug, s.name, data.tags),
            text: `${note ? `${note} ` : `${titleCase(seriesLabel(s.season))}. `}Sitemizde ${nf(s.n)} farklı ebat ve yük/hız endeksi seçeneğiyle listeleniyor.`
        });
        if (items.length >= limit) break;
    }
    return items;
}

function sizeLinks(data: BrandSeo, season?: SeasonKey): TextLink[] {
    const seasonWord = season === 'yaz' ? 'yaz' : season === 'kis' ? 'kis' : season === 'dort' ? '4-mevsim' : null;
    const rows = data.tags.sizes.filter(t => (seasonWord ? t.url.includes(`-${seasonWord}-`) : !/-(yaz|kis|4-mevsim)-/.test(t.url)));
    return rows.slice(0, 40).map(t => ({ href: `/etiket/${t.url}`, label: t.title, n: t.n }));
}

function seriesTagLinks(data: BrandSeo, season?: SeasonKey): TextLink[] {
    const seasonWord = season === 'yaz' ? 'yaz' : season === 'kis' ? 'kis' : season === 'dort' ? '4-mevsim' : null;
    const rows = seasonWord ? data.tags.series.filter(t => t.url.includes(`-${seasonWord}-`)) : data.tags.series;
    return rows.slice(0, 40).map(t => ({ href: `/etiket/${t.url}`, label: t.title, n: t.n }));
}

export function seasonLinksFor(slug: string, display: string, counts: Record<SeasonKey, number>): TextLink[] {
    return (Object.keys(SEASON_PATHS) as SeasonKey[])
        .filter(k => counts[k] >= SEASON_PAGE_MIN)
        .map(k => ({ href: `/marka/${slug}/${SEASON_PATHS[k]}`, label: `${display} ${SEASON_LABEL[k]} Lastikleri`, n: counts[k] }));
}

function originSentence(display: string, stats: BrandSeoStats): string | null {
    const total = sum(stats.origins);
    if (total < 3) return null;
    const top = stats.origins.slice(0, 3).map(([c, n]) => `${countryName(c)} (%${pct(n, total)})`);
    return `Menşei bilgisi kayıtlı ${display} ürünlerinde üretim ülkeleri: ${joinTr(top)}. Aynı marka ve desen, farklı ülkelerdeki fabrikalarda aynı kalite standartlarıyla üretilebilir; üretim ülkesi ürün sayfasında belirtilir.`;
}

function yearSentence(display: string, stats: BrandSeoStats): string | null {
    const total = sum(stats.years);
    if (total < 3) return null;
    const top = stats.years.slice(0, 2).map(([y, n]) => `${y} üretimi %${pct(n, total)}`);
    return `Stoktaki ${display} lastiklerde üretim yılı dağılımı: ${joinTr(top)}. Üretim tarihi (DOT) her ürün sayfasında ayrıca yazılır; lastik yanağındaki DOT kodunun son dört hanesi üretim haftasını ve yılını gösterir (ör. 1225 = 2025’in 12. haftası).`;
}

function techList(display: string, stats: BrandSeoStats): ListItem[] {
    const items: ListItem[] = [];
    if (stats.runFlat) items.push({ label: 'Run Flat (RFT)', text: `${nf(stats.runFlat)} üründe. Run Flat lastikler patladığında güçlendirilmiş yanakları sayesinde araç belirli bir hız ve mesafe sınırında (genellikle 80 km/s ile 80 km) yola devam edebilir. Yalnızca lastik basınç izleme sistemi (TPMS) olan araçlarda kullanılmalıdır.` });
    if (stats.xl) items.push({ label: 'XL (Extra Load)', text: `${nf(stats.xl)} üründe. XL ibareli lastikler aynı ebattaki standart lastiğe göre daha yüksek yük taşıma kapasitesine sahiptir; ağır SUV’larda ve performans otomobillerinde sıklıkla fabrika çıkışında kullanılır.` });
    if (stats.snowflake) items.push({ label: '3PMSF (kar tanesi işareti)', text: `${nf(stats.snowflake)} üründe. Dağ ve kar tanesi sembolü, lastiğin standart karlı zemin testinden geçtiğini gösterir; kış ve kış onaylı dört mevsim lastiklerde bulunur.` });
    if (stats.ev) items.push({ label: 'Elektrikli araç uyumlu', text: `${nf(stats.ev)} üründe. Elektrikli araçlar için geliştirilen lastikler yüksek ağırlık ve anlık torka dayanıklı yapı, düşük yuvarlanma direnci ve düşük gürültü hedefler.` });
    if (stats.seal) items.push({ label: 'Kendini onaran (Seal)', text: `${nf(stats.seal)} üründe. Sırt bölgesindeki yalıtım katmanı, küçük çivi delinmelerinde hava kaybını önleyerek yola devam etmeyi sağlar.` });
    if (stats.noise) items.push({ label: 'Gürültü seviyesi', text: `${display} ürünlerinde AB etiketindeki dış yuvarlanma gürültüsü ${stats.noise.min}–${stats.noise.max} dB aralığında. Değer küçüldükçe lastik daha sessizdir.` });
    return items;
}

function tireBrandContent(slug: string, p: BrandProfile, data: BrandSeo): BrandContent {
    const d = p.display;
    const st = data.stats;
    const counts = seasonCounts(st);
    const rim = rimSummary(st.rims);
    const vehicles = st.vehicles.filter(([v]) => v && v !== 'Yok').slice(0, 4).map(([v]) => v.toLocaleLowerCase('tr-TR'));
    const topSeries = st.series.slice(0, 3).map(s => s.name);
    const seasonParts = (Object.keys(counts) as SeasonKey[]).filter(k => counts[k] > 0).map(k => `${nf(counts[k])} ${SEASON_LOWER[k]}`);

    const intro = [
        `${d}, ${copula(p.tagline)}. LastikJantAVM’de ${d} markasının ${nf(st.total)} sıfır ürünü listeleniyor${seasonParts.length ? `: ${joinTr(seasonParts)} lastiği` : ''}.${rim.min && rim.max ? ` Ebatlar ${rim.min}–${rim.max} inç jant çapları arasında; en çok seçenek ${joinTr(rim.top.map(r => `${r} inç`))} jantlarda.` : ''}${vehicles.length ? ` Ürünler ${joinTr(vehicles)} araçlara yöneliktir.` : ''}`,
        p.forWhom
    ];

    const sections: Section[] = [];
    sections.push({
        id: 'hakkinda',
        title: `${d} Hakkında`,
        paragraphs: p.about,
        list: p.strengths.map(s => ({ label: '', text: s })),
        after: []
    });

    const sItems = seriesItems(slug, p, data, 14);
    if (sItems.length) {
        sections.push({
            id: 'desenler',
            title: `${d} Lastik Modelleri ve Desenleri`,
            paragraphs: [pick(slug + 'des', [
                `${d} ürün gamında her desen (seri) farklı bir ihtiyaca göre geliştirilir. Sitemizde en çok seçenek sunulan ${d} desenleri ve kullanım amaçları şöyle:`,
                `Aynı markanın farklı desenleri; konfor, performans, verimlilik ya da kış güvenliği gibi farklı önceliklere göre tasarlanır. LastikJantAVM’de öne çıkan ${d} desenleri:`,
                `${d} lastiği seçerken önce desene karar vermek işinizi kolaylaştırır. Stokta en geniş ebat yelpazesine sahip ${d} desenleri:`
            ])],
            list: sItems
        });
    }

    const seasonParas: string[] = [];
    const seasonList: ListItem[] = [];
    for (const k of Object.keys(counts) as SeasonKey[]) {
        if (!counts[k]) continue;
        const ss = st.series.filter(s => s.season === SEASON_DIA[k]).slice(0, 3).map(s => s.name);
        const href = counts[k] >= SEASON_PAGE_MIN ? `/marka/${slug}/${SEASON_PATHS[k]}` : undefined;
        const base = k === 'yaz'
            ? `Hava sıcaklığının sürekli 7°C’nin üzerinde olduğu aylarda kullanılır; sert hamuru sayesinde sıcakta daha az aşınır ve kuru-ıslak zeminde kısa fren mesafesi sağlar.`
            : k === 'kis'
                ? `Hava sıcaklığı 7°C’nin altına düştüğünde yumuşak kalan hamuru ve lamelli sırt yapısıyla kar, buz ve soğuk ıslak zeminde tutuş sağlar.`
                : `Yaz ve kış özelliklerini tek lastikte birleştirir; kışı ılıman geçen bölgelerde ve şehir içi kullanımda yıl boyu lastik değiştirmeden gitmek isteyenlere uygundur.`;
        seasonList.push({
            label: `${d} ${SEASON_LABEL[k]} Lastikleri`,
            href,
            text: `${nf(counts[k])} ürün${ss.length ? ` (${joinTr(ss)})` : ''}. ${base}`
        });
    }
    if (seasonList.length) {
        seasonParas.push(pick(slug + 'mev', [
            `${d} lastiklerini kullanım mevsimine göre üç grupta inceleyebilirsiniz. Her grubun kendi sayfasında ilgili ürünler ve o mevsime özel seçim bilgileri yer alıyor.`,
            `Doğru lastik seçiminin ilk adımı mevsimdir. ${d} markasında mevsimlere göre ürün dağılımı:`,
            `Türkiye’nin farklı iklim bölgelerinde ihtiyaç değişir; ${d} ürünlerini mevsime göre şöyle ayırabilirsiniz:`
        ]));
        sections.push({ id: 'mevsimler', title: `Mevsime Göre ${d} Lastikleri`, paragraphs: seasonParas, list: seasonList });
    }

    const topSizes = st.sizes.slice(0, 8).map(([s]) => s);
    if (topSizes.length) {
        sections.push({
            id: 'ebatlar',
            title: `${d} Lastik Ebatları`,
            paragraphs: [
                `Sitemizde ${d} markasında ${nf(st.sizeCount || st.sizes.length)} farklı ebat bulunuyor. En çok seçenek sunulan ebatlar: ${joinTr(topSizes)}.${rim.min && rim.max ? ` Jant çapı olarak ${rim.min} inçten ${rim.max} inçe kadar ürün mevcut.` : ''}`,
                `Lastik ebadını lastiğinizin yanağında görebilirsiniz. Örneğin ${topSizes[0]} ebadında ilk sayı lastik genişliğini (mm), ikinci sayı yanak yüksekliğinin genişliğe oranını (%), R harfinden sonraki sayı jant çapını (inç) gösterir. Ebadın yanındaki yük ve hız endeksi (ör. 91V) aracınızın ruhsatında ya da kapı kenarındaki etikette yazan değerin altında olmamalıdır. Ebadınızı bilmiyorsanız araç marka ve modelinizle arama yapabilirsiniz.`
            ]
        });
    }

    const wet = gradeSentence(st.wet, 'ıslak zemin frenleme');
    const fuel = gradeSentence(st.fuel, 'yakıt verimliliği');
    const tech = techList(d, st);
    if (wet || fuel || tech.length) {
        sections.push({
            id: 'teknik',
            title: `${d} Teknik Özellikler ve AB Lastik Etiketi`,
            paragraphs: [
                `Avrupa Birliği lastik etiketi; ıslak zeminde frenleme (A en iyi, E en düşük), yakıt verimliliği (A en verimli) ve dış gürültü (dB) değerlerini gösterir. Islak zemin sınıfları arasındaki her kademe, 80 km/s’ten frenlemede yaklaşık 1–2 araç boyu fark anlamına gelir.`,
                ...[wet, fuel].filter((x): x is string => !!x)
            ],
            list: tech
        });
    }

    const origin = originSentence(d, st);
    const years = yearSentence(d, st);
    if (origin || years) {
        sections.push({ id: 'uretim', title: `${d} Üretim Yeri ve Üretim Tarihi`, paragraphs: [origin, years].filter((x): x is string => !!x) });
    }

    sections.push({
        id: 'secim',
        title: `${d} Lastik Alırken Nelere Dikkat Edilmeli?`,
        paragraphs: [
            `Lastik seçerken önce aracınızın fabrika ebadını, yük ve hız endeksini kontrol edin; ardından kullanım şeklinize uygun deseni seçin. Şehir içi ağırlıklı kullanımda konfor ve sessizlik, uzun yolda aşınma ömrü ve yakıt verimliliği, sportif sürüşte ise kuru ve ıslak zemin tutuşu öne çıkar.`,
            st.runFlat
                ? `Aracınız fabrika çıkışında Run Flat lastikle geliyorsa ve stepnesi yoksa, yine Run Flat lastik seçmeniz önerilir. ${d} markasında Run Flat seçenekleri ürün adında RFT, ROF, ZP, SSR veya Run Flat ibaresiyle belirtilir.`
                : `Lastiklerin aynı aks üzerinde aynı marka, desen ve diş derinliğinde olması önerilir; yalnızca iki lastik değiştirecekseniz yenilerini arka aksa takmak ıslak zeminde kararlılığı artırır.`,
            `Lastikleriniz takıldıktan sonra rot ve balans ayarı yaptırmak, düzensiz aşınmayı önler ve lastik ömrünü uzatır. Hava basıncını ayda bir, lastikler soğukken kontrol edin; doğru basınç değeri aracınızın kapı kenarındaki ya da yakıt kapağındaki etikette yazar.`
        ]
    });

    sections.push({
        id: 'satin-al',
        title: `LastikJantAVM’den ${d} Lastik Satın Almak`,
        paragraphs: [
            `LastikJantAVM’den aldığınız ${d} lastikler adınıza faturalı ve garantili olarak gönderilir. Siparişinizi adresinize ya da Türkiye genelindeki anlaşmalı montaj noktalarından birine gönderebilir; İstanbul’da Şişli Mecidiyeköy ve Maslak şubelerimizde montaj, rot-balans ve lastik oteli hizmeti alabilirsiniz.`,
            `Aracınıza uygun ${d} lastiği bulmak için sayfanın üst kısmındaki filtrelerden genişlik, yanak ve jant çapını seçebilir ya da araç marka ve modelinizle arama yapabilirsiniz.`
        ]
    });

    const faqs: { q: string; a: string }[] = [];
    if (sum(st.origins) >= 3) faqs.push({ q: `${d} lastikler nerede üretiliyor?`, a: originSentence(d, st)! });
    if (counts.kis) faqs.push({ q: `${d} kış lastiği var mı?`, a: `Evet. Sitemizde ${nf(counts.kis)} ${d} kış lastiği bulunuyor${st.series.filter(s => s.season === 'Kış').length ? `; öne çıkan desenler ${joinTr(st.series.filter(s => s.season === 'Kış').slice(0, 3).map(s => s.name))}` : ''}. Kış lastikleri hava sıcaklığı 7°C’nin altına düştüğünde daha iyi tutuş sağlar.` });
    if (counts.dort) faqs.push({ q: `${d} dört mevsim lastiği var mı?`, a: `Evet. ${nf(counts.dort)} ${d} dört mevsim lastiği listeleniyor${st.series.filter(s => s.season === '4 Mevsim').length ? ` (${joinTr(st.series.filter(s => s.season === '4 Mevsim').slice(0, 3).map(s => s.name))})` : ''}. Yanağında 3PMSF (dağ ve kar tanesi) işareti olan dört mevsim lastikleri kış lastiği yerine geçer.` });
    if (sum(st.years) >= 3) faqs.push({ q: `${d} lastiklerin üretim yılı kaç?`, a: yearSentence(d, st)! });
    if (st.runFlat) faqs.push({ q: `${d} Run Flat lastik var mı?`, a: `Evet. Sitemizde ${nf(st.runFlat)} ${d} Run Flat lastik bulunuyor. Run Flat lastikler patladığında sınırlı hız ve mesafede yola devam etmenizi sağlar; ürün adında RFT, ROF, ZP, SSR veya Run Flat ibaresiyle belirtilir.` });
    if (topSizes.length) faqs.push({ q: `${d} lastikleri hangi ebatlarda bulunuyor?`, a: `${d} markasında en çok seçenek sunulan ebatlar ${joinTr(topSizes.slice(0, 6))}.${rim.min && rim.max ? ` Jant çapı ${rim.min}–${rim.max} inç arasında ürün mevcut.` : ''} Kendi ebadınızı sayfadaki filtrelerle seçebilirsiniz.` });
    faqs.push({ q: `${d} lastiklerimi nereye taktırabilirim?`, a: `Siparişinizi Türkiye genelindeki anlaşmalı montaj noktalarına gönderebilir ya da İstanbul’daki Şişli Mecidiyeköy ve Maslak şubelerimizde taktırabilirsiniz. Şubelerimizde montaj, balans, rot ayarı ve lastik oteli hizmetleri de verilir.` });
    faqs.push(...(p.faqs || []));

    const seasonWords = (Object.keys(counts) as SeasonKey[]).filter(k => counts[k] > 0).map(k => SEASON_LOWER[k]);
    const description = trimDesc(`${d} lastik fiyatları ve modelleri: ${nf(st.total)} sıfır ürün${topSeries.length ? `, ${joinTr(topSeries)} desenleri` : ''}${seasonWords.length ? `; ${joinTr(seasonWords)} seçenekleri` : ''}. Faturalı gönderim, montaj noktası seçimi.`);

    return {
        display: d,
        h1: `${d} Lastik Fiyatları ve Modelleri`,
        title: `${d} Lastik Fiyatları ve Modelleri | LastikJantAVM`,
        description,
        intro,
        sections,
        faqs,
        seasonLinks: seasonLinksFor(slug, d, counts),
        seriesLinks: seriesTagLinks(data),
        sizeLinks: sizeLinks(data)
    };
}

const SEASON_TEXT: Record<SeasonKey, { why: string[]; tips: string[]; faq: { q: (d: string) => string; a: (d: string) => string }[] }> = {
    yaz: {
        why: [
            'Yaz lastikleri, sıcak havada formunu koruyan daha sert bir hamurla üretilir. Sırt desenindeki geniş bloklar kuru zeminde yola temas eden yüzeyi artırırken, boyuna kanallar ıslak zeminde suyu hızla tahliye ederek kızaklama (aquaplaning) riskini azaltır.',
            'Hava sıcaklığı sürekli olarak 7°C’nin üzerine çıktığında yaz lastiğine geçmek; fren mesafesini kısaltır, yakıt tüketimini düşürür ve kış lastiğinin sıcakta hızla aşınmasını önler. Türkiye’nin büyük bölümünde bu geçiş genellikle nisan ayında yapılır.'
        ],
        tips: [
            'Yaz lastiği seçerken AB etiketindeki ıslak zemin frenleme sınıfına özellikle dikkat edin; yaz yağmurlarında en çok fark yaratan değer budur.',
            'Kış lastiklerinizi yaz aylarında kullanmayın: yumuşak hamur sıcakta hızla aşınır, fren mesafesi uzar.'
        ],
        faq: [
            { q: d => `${d} yaz lastiğine ne zaman geçilmeli?`, a: d => `Hava sıcaklığı sürekli olarak 7°C’nin üzerine çıktığında yaz lastiğine geçmeniz önerilir. Türkiye’nin büyük bölümünde bu dönem nisan ayına denk gelir. ${d} yaz lastikleri sıcak havada formunu koruyan hamuru sayesinde kuru ve ıslak zeminde kısa fren mesafesi sağlar.` }
        ]
    },
    kis: {
        why: [
            'Kış lastikleri, hava sıcaklığı 7°C’nin altına düştüğünde sertleşmeyen özel bir hamurla üretilir. Sırt yüzeyindeki çok sayıdaki ince kesik (lamel) karı tutarak çekiş sağlar, derin kanallar ise kar ve suyu tahliye eder. Bu nedenle kış lastiği yalnızca karda değil, soğuk ve ıslak asfaltta da yaz lastiğine göre belirgin biçimde daha kısa fren mesafesi sunar.',
            'Türkiye’de ticari araçlar ve yolcu taşıyan araçlar için 1 Aralık – 1 Nisan arasında kış lastiği kullanımı zorunludur; valilikler bölgenin iklimine göre bu tarihleri değiştirebilir. Binek otomobiller için zorunluluk olmasa da kış lastiği güvenlik açısından güçlü biçimde önerilir.'
        ],
        tips: [
            'Lastiğin yanağında 3PMSF (dağ ve kar tanesi) işaretinin bulunması, lastiğin standart kar testinden geçtiğini gösterir. Yalnızca M+S yazan lastikler bu testten geçmemiş olabilir.',
            'Kış lastiğinde diş derinliği 4 mm’nin altına indiğinde karda performans belirgin biçimde düşer; yasal sınır 1,6 mm olsa da 4 mm’de değişim önerilir.',
            'Dört lastiğin de kış lastiği olması gerekir; yalnızca çekiş aksına kış lastiği takmak virajda ve frenlemede dengesizliğe yol açar.'
        ],
        faq: [
            { q: d => `${d} kış lastiği ne zaman takılmalı?`, a: d => `Hava sıcaklığı 7°C’nin altına düştüğünde, Türkiye’nin büyük bölümünde kasım ayında kış lastiğine geçmeniz önerilir. Ticari ve yolcu taşıyan araçlar için 1 Aralık – 1 Nisan arasında kış lastiği zorunludur. ${d} kış lastiklerini sezon başlamadan sipariş vermek, aradığınız ebadı bulmanızı kolaylaştırır.` },
            { q: () => 'M+S ile 3PMSF arasındaki fark nedir?', a: () => 'M+S (çamur ve kar) üreticinin beyanıdır ve bir test zorunluluğu içermez. 3PMSF (dağ ve kar tanesi) işareti ise lastiğin standart karlı zemin testinde referans lastiğe göre belirli bir çekiş seviyesini geçtiğini gösterir. Gerçek kış koşulları için 3PMSF işaretli lastik tercih edilmelidir.' }
        ]
    },
    dort: {
        why: [
            'Dört mevsim lastikleri, yaz ve kış lastiğinin özelliklerini tek lastikte birleştirir: soğukta sertleşmeyen ama sıcakta da hızla aşınmayan bir hamur ve hem su tahliye eden hem de karı tutan lamelli bir sırt yapısı. Böylece yılda iki kez lastik değiştirme ve lastik saklama ihtiyacı ortadan kalkar.',
            'Dört mevsim lastikler; kışı ılıman geçen bölgelerde (Marmara, Ege, Akdeniz kıyıları), ağırlıklı şehir içi kullanımda ve yılda 15–20 bin km’nin altında yol yapan sürücüler için idealdir. Yoğun kar yağışı alan ve dağlık bölgelerde ise kış lastiği daha güvenli bir tercihtir.'
        ],
        tips: [
            'Yanağında 3PMSF (dağ ve kar tanesi) işareti olan dört mevsim lastikler kış lastiği yerine geçer ve kış lastiği zorunluluğunu karşılar.',
            'Dört mevsim lastikler yıl boyu kullanıldığı için diş derinliğini mevsim geçişlerinde kontrol edin; 4 mm’nin altına indiğinde kış performansı düşer.'
        ],
        faq: [
            { q: d => `${d} dört mevsim lastiği kışın yeterli mi?`, a: d => `Yanağında 3PMSF işareti olan ${d} dört mevsim lastikleri kış lastiği olarak kabul edilir ve hafif-orta kış koşullarında güvenli sürüş sağlar. Yoğun kar yağışı alan, dağlık bölgelerde ya da sık sık karlı yollarda sürüş yapıyorsanız kış lastiği daha yüksek güvenlik sunar.` }
        ]
    }
};

function tireSeasonContent(slug: string, p: BrandProfile, data: BrandSeo, season: SeasonKey): BrandContent {
    const d = p.display;
    const S = SEASON_LABEL[season];
    const st = data.stats;
    const rim = rimSummary(st.rims);
    const vehicles = st.vehicles.filter(([v]) => v && v !== 'Yok').slice(0, 4).map(([v]) => v.toLocaleLowerCase('tr-TR'));
    const t = SEASON_TEXT[season];
    const sItems = seriesItems(slug, p, data, 12);
    const topSizes = st.sizes.slice(0, 8).map(([s]) => s);

    const intro = [
        `LastikJantAVM’de ${nf(st.total)} adet ${d} ${SEASON_LOWER[season]} lastiği listeleniyor${sItems.length ? `; öne çıkan desenler ${joinTr(sItems.slice(0, 3).map(i => i.label.replace(`${d} `, '')))}` : ''}.${rim.min && rim.max ? ` Ürünler ${rim.min}–${rim.max} inç jant çapları arasında; en çok seçenek ${joinTr(rim.top.map(r => `${r} inç`))} jantlarda.` : ''}${vehicles.length ? ` ${capFirst(joinTr(vehicles))} araçlar için seçenekler mevcut.` : ''}`,
        t.why[0]
    ];

    const sections: Section[] = [];
    sections.push({ id: 'neden', title: `${S} Lastiği Neden Önemli?`, paragraphs: t.why.slice(1), list: t.tips.map(x => ({ label: '', text: x })) });
    if (sItems.length) {
        sections.push({
            id: 'desenler',
            title: `${d} ${S} Lastiği Desenleri`,
            paragraphs: [`${d} ${SEASON_LOWER[season]} lastiklerinde sitemizde en çok seçenek sunulan desenler ve kullanım amaçları:`],
            list: sItems
        });
    }
    if (topSizes.length) {
        sections.push({
            id: 'ebatlar',
            title: `${d} ${S} Lastiği Ebatları`,
            paragraphs: [
                `En çok seçenek sunulan ${d} ${SEASON_LOWER[season]} lastiği ebatları: ${joinTr(topSizes)}. Aracınızın ebadını lastik yanağında, ruhsatta ya da kapı kenarındaki etikette bulabilirsiniz; sayfanın üstündeki filtrelerle kendi ebadınızı seçerek yalnızca uygun ürünleri listeleyebilirsiniz.`
            ]
        });
    }
    const wet = gradeSentence(st.wet, 'ıslak zemin frenleme');
    const fuel = gradeSentence(st.fuel, 'yakıt verimliliği');
    const tech = techList(d, st);
    if (wet || fuel || tech.length) {
        sections.push({ id: 'teknik', title: `${d} ${S} Lastiği Teknik Özellikleri`, paragraphs: [wet, fuel].filter((x): x is string => !!x), list: tech });
    }
    const years = yearSentence(d, st);
    if (years) sections.push({ id: 'uretim', title: 'Üretim Tarihi', paragraphs: [years] });
    sections.push({
        id: 'marka',
        title: `${d} Hakkında`,
        paragraphs: [p.about[0], p.forWhom]
    });
    sections.push({
        id: 'satin-al',
        title: `${d} ${S} Lastiği Satın Almak`,
        paragraphs: [`LastikJantAVM’den aldığınız ${d} ${SEASON_LOWER[season]} lastikleri adınıza faturalı ve garantili olarak gönderilir. Siparişinizi adresinize ya da Türkiye genelindeki anlaşmalı montaj noktalarından birine gönderebilir; İstanbul’da Şişli Mecidiyeköy ve Maslak şubelerimizde montaj, rot-balans ve lastik oteli hizmeti alabilirsiniz.`]
    });

    const faqs = [
        ...t.faq.map(f => ({ q: f.q(d), a: f.a(d) })),
        ...(topSizes.length ? [{ q: `${d} ${SEASON_LOWER[season]} lastiği hangi ebatlarda var?`, a: `En çok seçenek sunulan ebatlar ${joinTr(topSizes.slice(0, 6))}.${rim.min && rim.max ? ` Jant çapı ${rim.min}–${rim.max} inç arasında ürün mevcut.` : ''}` }] : []),
        ...(years ? [{ q: `${d} ${SEASON_LOWER[season]} lastiklerinin üretim yılı kaç?`, a: years }] : [])
    ];

    const others = (Object.keys(SEASON_PATHS) as SeasonKey[]).filter(k => k !== season);
    return {
        display: d,
        h1: `${d} ${S} Lastikleri`,
        title: `${d} ${S} Lastiği Fiyatları ve Modelleri | LastikJantAVM`,
        description: trimDesc(`${d} ${SEASON_LOWER[season]} lastiği fiyatları ve modelleri: ${nf(st.total)} sıfır ürün${sItems.length ? `, ${joinTr(sItems.slice(0, 3).map(i => i.label.replace(`${d} `, '')))}` : ''}. Faturalı gönderim ve montaj noktası seçimi.`),
        intro,
        sections,
        faqs,
        seasonLinks: others.map(k => ({ href: `/marka/${slug}/${SEASON_PATHS[k]}`, label: `${d} ${SEASON_LABEL[k]} Lastikleri` })),
        seriesLinks: seriesTagLinks(data, season),
        sizeLinks: sizeLinks(data, season)
    };
}

const KIND_NOUN: Record<Exclude<BrandKind, 'lastik'>, string> = {
    agir: 'Ağır Vasıta Lastikleri',
    zincir: 'Kar Zinciri',
    palet: 'Kar Paleti',
    corap: 'Kar Çorabı',
    jant: 'Jant',
    aksesuar: 'Ürünleri'
};

function otherBrandContent(slug: string, p: BrandProfile, data: BrandSeo): BrandContent {
    const d = p.display;
    const st = data.stats;
    const kind = p.kind as Exclude<BrandKind, 'lastik'>;
    const noun = KIND_NOUN[kind];
    const rim = rimSummary(st.rims);
    const sizes = st.sizes.length ? st.sizes : [];
    const intro = [`${d}, ${copula(p.tagline)}. LastikJantAVM’de ${d} markasının ${nf(st.total)} ürünü listeleniyor.${rim.min && rim.max && kind !== 'aksesuar' ? ` Ürünler ${rim.min}–${rim.max} inç jant çaplarına uygun.` : ''}`, p.forWhom];
    const sections: Section[] = [{ id: 'hakkinda', title: `${d} Hakkında`, paragraphs: p.about, list: p.strengths.map(s => ({ label: '', text: s })) }];

    if (kind === 'zincir' || kind === 'palet' || kind === 'corap') {
        const what = kind === 'zincir' ? 'kar zinciri' : kind === 'palet' ? 'kar paleti' : 'kar çorabı';
        sections.push({
            id: 'secim',
            title: `${d} ${noun} Nasıl Seçilir?`,
            paragraphs: [
                `Doğru ${what} lastik ebadına göre seçilir. Lastiğinizin yanağındaki ebadı (ör. 205/55R16) bulun ve ürün adında ya da ürün sayfasındaki uyumluluk listesinde bu ebadın yer aldığı modeli seçin. Aynı ürün genellikle birden fazla ebada uyar; bu nedenle ürünler grup ya da beden numarasıyla adlandırılır.`,
                kind === 'corap'
                    ? `Kar çorabı, metal zincire göre çok daha hafif ve kolay takılır; jant ve lastiğe zarar vermez. Karla kaplı yolda kısa mesafeler ve acil durumlar için idealdir. Kar çorabıyla 50 km/s hızın üzerine çıkılmaması ve kuru asfaltta kullanılmaması önerilir.`
                    : kind === 'palet'
                        ? `Kar paletleri, tekerleğe dışarıdan takılır ve lastiğin arkasına uzanmayı gerektirmez. Takma ve çıkarma süresi kar zincirine göre çok daha kısadır. Kullanım hızı ve uyumluluk bilgisi ürün sayfasında yer alır.`
                        : `Kar zincirleri, kar ve buzla kaplı yollarda en yüksek çekişi sağlayan çözümdür. Takmatik (hızlı takılan) modeller birkaç dakikada takılabilir; serme modeller daha ekonomiktir. Zincirle 40–50 km/s hızın üzerine çıkılmaması ve kuru asfaltta kullanılmaması önerilir. Zincirler çekiş aksındaki lastiklere takılır.`
            ]
        });
        if (sizes.length) {
            sections.push({ id: 'ebatlar', title: `${d} Uyumlu Lastik Ebatları`, paragraphs: [`${d} ürünlerinin uyumlu olduğu ebatlardan bazıları: ${joinTr(sizes.slice(0, 12).map(([s]) => s).filter(s => /\d/.test(s)))}. Aracınızın ebadıyla arama yaparak yalnızca uyumlu ürünleri listeleyebilirsiniz.`] });
        }
    } else if (kind === 'agir') {
        sections.push({
            id: 'pozisyon',
            title: 'Ağır Vasıta Lastiğinde Aks Pozisyonu',
            paragraphs: [
                `Ağır vasıta lastikleri takılacakları aksa göre farklı tasarlanır. Düz (steer) aks lastikleri yön kararlılığı ve düzgün aşınma için, çeker (drive) aks lastikleri çekiş ve uzun ömür için, dorse (trailer) lastikleri ise düşük yuvarlanma direnci ve yük taşıma için optimize edilir. Ürün adlarında pozisyon bilgisi (çeker, düz, dorse) yer alır.`,
                `Ebat ve yük endeksi (ör. 315/80R22.5 156/150L) aracınızın aks yüküne uygun olmalıdır. Uzun yol, bölgesel dağıtım ve şantiye gibi kullanım alanına göre doğru seri seçimi, yakıt tüketimi ve lastik ömrünü doğrudan etkiler.`
            ]
        });
        if (sizes.length) sections.push({ id: 'ebatlar', title: `${d} Lastik Ebatları`, paragraphs: [`${d} markasında en çok seçenek sunulan ebatlar: ${joinTr(sizes.slice(0, 8).map(([s]) => s))}.`] });
    } else if (kind === 'jant') {
        const pcds = st.series.filter(s => /^\d+x/i.test(s.name)).slice(0, 10);
        sections.push({
            id: 'secim',
            title: 'Jant Seçerken Nelere Dikkat Edilmeli?',
            paragraphs: [
                `Jantın aracınıza uyması için dört ölçü önemlidir: jant çapı ve genişliği (ör. 7.5x17), bijon deliği düzeni (PCD; ör. 5x112 = 5 bijon, 112 mm çap), ET (offset; jantın bağlantı yüzeyinin merkeze uzaklığı) ve merkez deliği (göbek çapı). PCD aracınızla birebir aynı olmalı; ET değeri üretici değerine yakın tutulmalıdır.`,
                `Merkez deliği aracınızınkinden büyük olan jantlarda bilezik (merkezleme halkası) kullanılarak titreşimsiz bir montaj sağlanır. Jant değişiminde lastik ebadının dış çapının korunması, hız göstergesi ve sürüş güvenliği için önemlidir.`
            ],
            list: pcds.map(s => ({ label: s.name.replace(',', '.').toLocaleUpperCase('tr-TR'), text: `${nf(s.n)} ürün` }))
        });
    }

    sections.push({
        id: 'satin-al',
        title: `LastikJantAVM’den ${d} Satın Almak`,
        paragraphs: [`LastikJantAVM’den aldığınız ${d} ürünleri faturalı olarak gönderilir. İstanbul’da Şişli Mecidiyeköy ve Maslak şubelerimizden destek alabilir, ${kind === 'jant' ? 'jant ve lastik montajını şubelerimizde yaptırabilirsiniz' : 'ürününüzü adresinize gönderebilirsiniz'}.`]
    });

    const faqs = [
        ...(kind === 'zincir' || kind === 'corap' || kind === 'palet'
            ? [{ q: `${d} ${noun.toLocaleLowerCase('tr-TR')} hangi ebada uyar?`, a: `Her ürünün uyumlu olduğu lastik ebatları ürün adında ve ürün sayfasında belirtilir. Lastiğinizin yanağındaki ebadı (ör. 205/55R16) kullanarak doğru ürünü seçebilirsiniz.` }]
            : []),
        ...(p.faqs || [])
    ];

    return {
        display: d,
        h1: kind === 'aksesuar' ? `${d} Ürünleri` : `${d} ${noun} Fiyatları ve Modelleri`,
        title: kind === 'aksesuar' ? `${d} Ürünleri | LastikJantAVM` : `${d} ${noun} Fiyatları ve Modelleri | LastikJantAVM`,
        description: trimDesc(`${d} ${noun.toLocaleLowerCase('tr-TR')}: ${nf(st.total)} ürün. ${capFirst(p.tagline)}. Faturalı gönderim.`),
        intro,
        sections,
        faqs,
        seasonLinks: [],
        seriesLinks: [],
        sizeLinks: sizeLinks(data)
    };
}

function trimDesc(s: string, max = 158): string {
    let clean = s.replace(/\s+/g, ' ').trim();
    while (clean.length > max && /\. [^.]+\.$/.test(clean)) clean = clean.replace(/ [^.]+\.$/, '');
    if (clean.length <= max) return clean;
    const cut = clean.slice(0, max - 1);
    return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}

export function brandDisplayName(slug: string, fallback: string): string {
    return getBrandProfile(slug)?.display || titleCase(fallback);
}

export function buildBrandContent(slug: string, data: BrandSeo | null): BrandContent | null {
    const p = getBrandProfile(slug);
    if (!p || !data || data.stats.total === 0) return null;
    return p.kind === 'lastik' ? tireBrandContent(slug, p, data) : otherBrandContent(slug, p, data);
}

export function buildBrandSeasonContent(slug: string, data: BrandSeo | null, season: SeasonKey): BrandContent | null {
    const p = getBrandProfile(slug);
    if (!p || p.kind !== 'lastik' || !data || data.stats.total < SEASON_PAGE_MIN) return null;
    return tireSeasonContent(slug, p, data, season);
}

export function seasonLabel(season: SeasonKey) { return SEASON_LABEL[season]; }
export function isTireBrand(slug: string) { return getBrandProfile(slug)?.kind === 'lastik'; }
