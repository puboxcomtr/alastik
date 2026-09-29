/**
 * İçerik SEO analiz motoru — saf fonksiyon, veritabanına dokunmaz.
 *
 * Rank Math'in temel kontrollerinin bizim alanlarımıza uyarlanmış hali. Girdi olarak
 * vitrinde GERÇEKTEN basılan başlık/açıklama verilir (şablondan üretilen dahil) ki puan ile
 * Google'ın gördüğü sayfa birbirini tutsun. Eşikler SeoSettings.analysis'ten gelir.
 */

const DEFAULT_THRESHOLDS = {
    titleMin: 30,
    titleMax: 60,
    descriptionMin: 70,
    descriptionMax: 160,
    densityMin: 0.5,
    densityMax: 2.5,
    minWords: { blog: 600, page: 300, product: 150, category: 100, brand: 100, tag: 100 },
    // Link inşası: içerikten sitenin diğer sayfalarına en az kaç iç link verilmeli
    minInternalLinks: { blog: 2, page: 2, product: 1, category: 1, brand: 1, tag: 1 },
    goodScore: 80,
    fairScore: 50
};

// key → tanım; sıra arayüzde gösterim sırasıdır
const CHECK_DEFS = {
    kw_title: { group: 'Odak Kelime', label: 'Odak kelime SEO başlığında', weight: 12 },
    kw_description: { group: 'Odak Kelime', label: 'Odak kelime meta açıklamada', weight: 10 },
    kw_url: { group: 'Odak Kelime', label: 'Odak kelime URL\'de', weight: 8 },
    kw_intro: { group: 'Odak Kelime', label: 'Odak kelime içeriğin ilk %10\'unda', weight: 8 },
    kw_content: { group: 'Odak Kelime', label: 'Odak kelime içerikte geçiyor', weight: 8 },
    kw_density: { group: 'Odak Kelime', label: 'Anahtar kelime yoğunluğu', weight: 6 },
    kw_unique: { group: 'Odak Kelime', label: 'Odak kelime başka içerikte kullanılmamış', weight: 6 },
    meta_description: { group: 'Temel SEO', label: 'Meta açıklama', weight: 10 },
    title_length: { group: 'Temel SEO', label: 'Başlık uzunluğu', weight: 8 },
    h1: { group: 'Temel SEO', label: 'H1 başlık', weight: 6 },
    subheadings: { group: 'Temel SEO', label: 'Alt başlıklar (H2/H3)', weight: 6 },
    image_alt: { group: 'Temel SEO', label: 'Görseller', weight: 6 },
    links: { group: 'Link İnşası', label: 'İç linkler', weight: 6 },
    external_links: { group: 'Link İnşası', label: 'Dış kaynak linki', weight: 4 },
    content_length: { group: 'İçerik', label: 'İçerik uzunluğu', weight: 6 },
    keywords_field: { group: 'İçerik', label: 'Anahtar kelime alanı', weight: 0 }
};

const TR_ASCII = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'â': 'a', 'î': 'i', 'û': 'u' };

const lower = (s) => String(s || '').toLocaleLowerCase('tr');
const normalizeText = (s) => lower(s).replace(/[ \s]+/g, ' ').trim();
const toAscii = (s) => lower(s).replace(/[çğıöşüâîû]/g, ch => TR_ASCII[ch] || ch);
const toSlugForm = (s) => toAscii(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function stripHtml(html) {
    return String(html || '')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&[a-z#0-9]+;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

const countWords = (text) => (text ? text.split(/\s+/).filter(Boolean).length : 0);

function countOccurrences(text, phrase) {
    if (!text || !phrase) return 0;
    let count = 0;
    let index = 0;
    while ((index = text.indexOf(phrase, index)) !== -1) {
        count += 1;
        index += phrase.length;
    }
    return count;
}

const countTag = (html, tag) => (String(html || '').match(new RegExp(`<${tag}\\b`, 'gi')) || []).length;

function headingTexts(html) {
    const out = [];
    const re = /<h[23]\b[^>]*>([\s\S]*?)<\/h[23]>/gi;
    let m;
    while ((m = re.exec(String(html || ''))) !== null) out.push(stripHtml(m[1]));
    return out;
}

function imageStats(html) {
    const images = String(html || '').match(/<img\b[^>]*>/gi) || [];
    const withoutAlt = images.filter(tag => !/\balt\s*=\s*["'][^"']+["']/i.test(tag)).length;
    return { total: images.length, withoutAlt };
}

function linkStats(html, ownHosts = []) {
    const own = new Set(ownHosts.map(h => String(h).toLowerCase().replace(/^www\./, '')));
    const stats = { total: 0, internal: 0, external: 0, externalDofollow: 0 };
    const re = /<a\b[^>]*?\bhref\s*=\s*["']([^"'#][^"']*)["'][^>]*>/gi;
    let m;
    while ((m = re.exec(String(html || ''))) !== null) {
        const href = m[1].trim();
        if (/^(mailto:|tel:|javascript:|data:)/i.test(href)) continue;
        stats.total += 1;
        let host = '';
        if (/^https?:\/\//i.test(href)) {
            try { host = new URL(href).hostname.toLowerCase().replace(/^www\./, ''); } catch (e) { host = ''; }
        }
        if (!host || own.has(host)) {
            stats.internal += 1;
        } else {
            stats.external += 1;
            if (!/\brel\s*=\s*["'][^"']*nofollow/i.test(m[0])) stats.externalDofollow += 1;
        }
    }
    return stats;
}

function mergeThresholds(overrides) {
    const src = overrides && typeof overrides === 'object' ? overrides : {};
    const num = (v, fallback) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
    return {
        titleMin: num(src.titleMin, DEFAULT_THRESHOLDS.titleMin),
        titleMax: num(src.titleMax, DEFAULT_THRESHOLDS.titleMax),
        descriptionMin: num(src.descriptionMin, DEFAULT_THRESHOLDS.descriptionMin),
        descriptionMax: num(src.descriptionMax, DEFAULT_THRESHOLDS.descriptionMax),
        densityMin: num(src.densityMin, DEFAULT_THRESHOLDS.densityMin),
        densityMax: num(src.densityMax, DEFAULT_THRESHOLDS.densityMax),
        minWords: Object.fromEntries(Object.entries(DEFAULT_THRESHOLDS.minWords).map(([k, v]) => [k, num(src.minWords?.[k], v)])),
        minInternalLinks: Object.fromEntries(Object.entries(DEFAULT_THRESHOLDS.minInternalLinks).map(([k, v]) => [k, num(src.minInternalLinks?.[k], v)])),
        goodScore: num(src.goodScore, DEFAULT_THRESHOLDS.goodScore),
        fairScore: num(src.fairScore, DEFAULT_THRESHOLDS.fairScore)
    };
}

/**
 * @param {object} input
 * @param {string} input.type            product | page | blog | category | brand | tag
 * @param {string} input.focusKeyword
 * @param {string} input.title           Vitrinde basılan başlık (etkin)
 * @param {string} input.description     Vitrinde basılan meta açıklama (etkin)
 * @param {string} input.slug
 * @param {string} input.content         İçerik HTML'i
 * @param {string[]} [input.keywords]    seoKeywords / metaKeywords
 * @param {boolean} [input.hasCustomSeo] Elle girilmiş SEO alanı var mı
 * @param {Array}  [input.usedElsewhere]  Aynı odak kelimeyi kullanan diğer içerikler [{ type, refId, title, url, editPath }]
 * @param {number} [input.galleryImages]  Ürünlerde galeri görsel sayısı (içerik HTML'i yerine bu sayılır)
 * @param {object} [options]             { thresholds, ownHosts }
 */
function analyzeContent(input, options = {}) {
    const t = mergeThresholds(options.thresholds);
    const type = CHECK_TYPE(input.type);
    const focus = normalizeText(input.focusKeyword);
    const title = String(input.title || '').trim();
    const description = String(input.description || '').trim();
    const slug = String(input.slug || '').trim();
    const html = String(input.content || '');

    const text = stripHtml(html);
    const textN = normalizeText(text);
    const wordCount = countWords(text);
    const titleN = normalizeText(title);
    const descriptionN = normalizeText(description);
    const slugForm = toSlugForm(slug);
    const focusSlug = toSlugForm(focus);

    const checks = [];
    const add = (key, passed, detail) => checks.push({ key, ...CHECK_DEFS[key], passed, detail });

    let occurrences = 0;
    let density = 0;

    if (focus) {
        add('kw_title', titleN.includes(focus), titleN.includes(focus) ? 'Başlıkta geçiyor' : 'Başlıkta geçmiyor');
        add('kw_description', descriptionN.includes(focus), descriptionN.includes(focus) ? 'Açıklamada geçiyor' : 'Açıklamada geçmiyor');
        add('kw_url', Boolean(slugForm) && slugForm.includes(focusSlug), slugForm ? (slugForm.includes(focusSlug) ? 'URL\'de geçiyor' : 'URL\'de geçmiyor') : 'URL boş');
        const introLength = Math.max(1, Math.ceil(textN.length * 0.1));
        const inIntro = textN.slice(0, introLength).includes(focus);
        add('kw_intro', wordCount > 0 && inIntro, wordCount === 0 ? 'İçerik boş' : inIntro ? 'Giriş bölümünde geçiyor' : 'Giriş bölümünde geçmiyor');
        occurrences = countOccurrences(textN, focus);
        add('kw_content', occurrences > 0, occurrences > 0 ? `İçerikte ${occurrences} kez geçiyor` : 'İçerikte hiç geçmiyor');
        const keywordWords = countWords(focus);
        density = wordCount > 0 ? (occurrences * keywordWords / wordCount) * 100 : 0;
        const densityOk = wordCount > 0 && density >= t.densityMin && density <= t.densityMax;
        add('kw_density', densityOk, `%${density.toFixed(2)} (hedef %${t.densityMin} - %${t.densityMax})`);
        const others = Array.isArray(input.usedElsewhere) ? input.usedElsewhere : [];
        add('kw_unique', others.length === 0, others.length === 0
            ? 'Bu kelime başka içerikte odak olarak kullanılmıyor'
            : `Şu içerikte de odak kelime: ${others.slice(0, 3).map(o => o.title).join(', ')}${others.length > 3 ? ` (+${others.length - 3})` : ''}`);
    } else {
        // Odak kelime yoksa bu kontroller KALDI sayılır: kelime girilmeden içerik "İyi" olamaz
        for (const key of ['kw_title', 'kw_description', 'kw_url', 'kw_intro', 'kw_content', 'kw_density', 'kw_unique']) {
            add(key, false, 'Odak anahtar kelime girilmemiş');
        }
    }

    const descriptionOk = description.length >= t.descriptionMin && description.length <= t.descriptionMax;
    add('meta_description', descriptionOk, description ? `${description.length} karakter (hedef ${t.descriptionMin}-${t.descriptionMax})` : 'Meta açıklama boş');

    const titleOk = title.length >= t.titleMin && title.length <= t.titleMax;
    add('title_length', titleOk, title ? `${title.length} karakter (hedef ${t.titleMin}-${t.titleMax})` : 'Başlık boş');

    const h1Count = countTag(html, 'h1');
    add('h1', h1Count === 0, h1Count === 0 ? 'Başlık vitrin şablonunda tek H1 olarak basılıyor' : `İçerikte ${h1Count} fazladan H1 var`);

    const subheadingCount = countTag(html, 'h2') + countTag(html, 'h3');
    const headingHasKeyword = focus ? headingTexts(html).some(h => normalizeText(h).includes(focus)) : false;
    let subheadingDetail = subheadingCount > 0 ? `${subheadingCount} alt başlık` : 'Alt başlık (H2/H3) yok';
    if (subheadingCount > 0 && focus) subheadingDetail += headingHasKeyword ? ', odak kelime alt başlıkta geçiyor' : ', odak kelime alt başlıklarda geçmiyor';
    add('subheadings', subheadingCount > 0, subheadingDetail);

    const images = imageStats(html);
    if (typeof input.galleryImages === 'number') {
        // Ürün: görseller açıklama HTML'inde değil galeride durur
        add('image_alt', input.galleryImages > 0, input.galleryImages > 0 ? `Ürün galerisinde ${input.galleryImages} görsel` : 'Ürün görseli yok');
    } else {
        add('image_alt', images.total > 0 && images.withoutAlt === 0, images.total === 0
            ? 'İçerikte görsel yok'
            : images.withoutAlt === 0 ? `${images.total} görselin tümünde alt metni var` : `${images.withoutAlt}/${images.total} görselde alt metni eksik`);
    }

    // Link inşası: iç linkler sitenin diğer sayfalarına otorite taşır; blog/sayfada dış kaynak linki güven verir
    const links = linkStats(html, options.ownHosts || []);
    const minInternal = t.minInternalLinks[type] ?? 1;
    add('links', links.internal >= minInternal, links.internal >= minInternal
        ? `${links.internal} iç link (en az ${minInternal})`
        : `${links.internal} iç link, en az ${minInternal} olmalı: ilgili ürün, kategori veya blog sayfalarına link verin`);
    if (type === 'blog' || type === 'page') {
        let externalDetail = links.external > 0 ? `${links.external} dış link` : 'Dış kaynak linki yok: güvenilir bir kaynağa (üretici, resmi kurum) link verin';
        if (links.externalDofollow > 0 && links.external > 0) externalDetail += ` (${links.externalDofollow} tanesi nofollow değil)`;
        add('external_links', links.external > 0, externalDetail);
    } else {
        add('external_links', null, 'Bu içerik tipinde aranmaz');
    }

    const minWords = t.minWords[type] || DEFAULT_THRESHOLDS.minWords.page;
    add('content_length', wordCount >= minWords, `${wordCount} kelime (en az ${minWords})`);

    const keywordList = Array.isArray(input.keywords) ? input.keywords.filter(Boolean) : [];
    add('keywords_field', keywordList.length > 0, keywordList.length > 0 ? `${keywordList.length} anahtar kelime girilmiş` : 'Anahtar kelime alanı boş');

    const applicable = checks.filter(c => c.passed !== null && c.weight > 0);
    const totalWeight = applicable.reduce((sum, c) => sum + c.weight, 0);
    const earned = applicable.filter(c => c.passed).reduce((sum, c) => sum + c.weight, 0);
    const score = totalWeight > 0 ? Math.round((earned / totalWeight) * 100) : 0;

    const passed = checks.filter(c => c.passed === true).length;
    const failed = checks.filter(c => c.passed === false).length;
    const skipped = checks.filter(c => c.passed === null).length;

    // Odak kelime girilmemişse SEO "yapılmamış" sayılır; puan yine hesaplanır ama durum "none"
    const status = !focus
        ? 'none'
        : score >= t.goodScore ? 'good' : score >= t.fairScore ? 'fair' : 'poor';

    return {
        score,
        status,
        passed,
        failed,
        skipped,
        checks,
        keywordUsage: Array.isArray(input.usedElsewhere) ? input.usedElsewhere.slice(0, 5) : [],
        stats: {
            hasFocusKeyword: Boolean(focus),
            wordCount,
            occurrences,
            density: Math.round(density * 100) / 100,
            titleLength: title.length,
            descriptionLength: description.length,
            h1: h1Count,
            subheadings: subheadingCount,
            images,
            links
        },
        thresholds: t
    };
}

function CHECK_TYPE(type) {
    return Object.prototype.hasOwnProperty.call(DEFAULT_THRESHOLDS.minWords, type) ? type : 'page';
}

module.exports = { analyzeContent, mergeThresholds, DEFAULT_THRESHOLDS, CHECK_DEFS, stripHtml, normalizeText };
