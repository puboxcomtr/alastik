/**
 * İçerik tarayıcı: ürün, sayfa, blog, kategori, marka ve etiket kayıtlarını vitrinin
 * bastığı etkin başlık/açıklama ile analiz motoruna verir, sonucu SeoContentScore'a yazar.
 *
 * Etkin başlık mantığı apps/web'deki generateMetadata'ların birebir karşılığıdır:
 *  - ürün/kategori/marka: elle girilmiş SEO alanı yoksa SeoSettings şablonu uygulanır
 *  - blog/sayfa: seo.metaTitle yoksa başlık, seo.metaDescription yoksa özet
 *  - etiket: seoTitle yoksa "etiket adı | site adı"
 */

const crypto = require('crypto');
const WebProduct = require('../../models/web/catalog/WebProduct');
const WebCategory = require('../../models/web/catalog/WebCategory');
const WebBrand = require('../../models/web/catalog/WebBrand');
const WebTag = require('../../models/web/catalog/WebTag');
const WebBlog = require('../../models/web/content/WebBlog');
const WebPage = require('../../models/web/content/WebPage');
const SeoSettings = require('../../models/admin/settings/SeoSettings');
const SeoContentScore = require('../../models/admin/seo/SeoContentScore');
const { CONTENT_TYPES } = require('../../models/admin/seo/SeoContentScore');
const { DOMAIN_TO_SLUG, SITES } = require('../../config/sites');
const { analyzeContent, mergeThresholds } = require('./contentAnalyzer');

// Başlıklarda editörden kalan HTML varlıkları (&#39; &amp; ...) düz metne çevrilir
const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&nbsp;': ' ' };
const decodeEntities = (text) => String(text || '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, m => ENTITIES[m] || m);

const OWN_HOSTS = Object.keys(DOMAIN_TO_SLUG);
const BATCH_SIZE = 500;

const scanState = new Map(); // site -> ilerleme

function applyTemplate(template, vars) {
    if (!template) return '';
    let result = String(template);
    for (const [key, value] of Object.entries(vars)) result = result.split(`{${key}}`).join(value || '');
    return result.trim();
}

async function loadSettings(site) {
    const settings = await SeoSettings.findOne({ site }).lean();
    const siteName = String(settings?.other?.seoTag?.title || settings?.homepage?.title || '').split('|').pop().trim() || SITES[site]?.name || '';
    return { templates: settings || {}, thresholds: mergeThresholds(settings?.analysis), siteName };
}

// ---------------------------------------------------------------------------
// Tip başına: sorgu, alan seçimi ve normalize edilmiş belge
// ---------------------------------------------------------------------------

const PRODUCT_FIELDS = '_key diaData.aciklama diaData.marka diaData.gercek_stok diaData.m_resimler customData.seoTitle customData.seoDescription customData.seoUrl customData.seoKeywords customData.focusKeyword customData.customDescription customData.siteDescriptions customData.siteData customData.customImages';

const TYPE_DEFS = {
    product: {
        model: WebProduct,
        idField: '_key',
        filter: (site) => ({ 'syncInfo.diaStatus': 'synced', sites: site }),
        select: PRODUCT_FIELDS,
        focusPath: 'customData.focusKeyword',
        lightSelect: '_key diaData.aciklama customData.seoUrl customData.focusKeyword',
        build: (p, site, S) => {
            const cd = p.customData || {};
            const sd = cd.siteData?.[site] || {};
            const dia = p.diaData || {};
            const name = dia.aciklama || '';
            const vars = { 'urun-adi': name, 'marka-adi': dia.marka || '', 'urun-aciklamasi': `${name} en uygun fiyatla.` };
            const customTitle = sd.seoTitle || cd.seoTitle || '';
            const customDescription = sd.seoDescription || cd.seoDescription || '';
            const keywords = Array.isArray(cd.seoKeywords) ? cd.seoKeywords : [];
            return {
                refId: p._key,
                title: name,
                url: `/urun/${cd.seoUrl || p._key}`,
                editPath: `/apps/products/edit/${p._key}`,
                contentStatus: (dia.gercek_stok || 0) > 0 ? 'stokta' : 'stoksuz',
                focusKeyword: cd.focusKeyword || '',
                keywords,
                hasCustomSeo: Boolean(customTitle || customDescription || keywords.length),
                effective: {
                    title: customTitle || applyTemplate(S.templates.product?.titleTemplate, vars) || name,
                    description: customDescription || applyTemplate(S.templates.product?.descriptionTemplate, vars) || vars['urun-aciklamasi'],
                    slug: cd.seoUrl || ''
                },
                content: cd.siteDescriptions?.[site] || cd.customDescription || '',
                galleryImages: (Array.isArray(dia.m_resimler) ? dia.m_resimler.length : 0) + (Array.isArray(cd.customImages) ? cd.customImages.length : 0)
            };
        },
        setFocus: (doc, keyword) => { doc.set('customData.focusKeyword', keyword); }
    },
    blog: {
        model: WebBlog,
        idField: '_id',
        filter: (site) => ({ site }),
        select: 'title slug content excerpt seo status',
        focusPath: 'seo.focusKeyword',
        lightSelect: 'title slug seo.focusKeyword',
        build: (b) => {
            const seo = b.seo || {};
            const keywords = Array.isArray(seo.metaKeywords) ? seo.metaKeywords : [];
            return {
                refId: String(b._id),
                title: b.title || '',
                url: `/blog/${b.slug}`,
                editPath: `/apps/blogs/edit/${b._id}`,
                contentStatus: b.status || '',
                focusKeyword: seo.focusKeyword || '',
                keywords,
                hasCustomSeo: Boolean(seo.metaTitle || seo.metaDescription || keywords.length),
                effective: { title: seo.metaTitle || b.title || '', description: seo.metaDescription || b.excerpt || '', slug: b.slug || '' },
                content: b.content || ''
            };
        },
        setFocus: (doc, keyword) => { if (!doc.seo) doc.seo = {}; doc.set('seo.focusKeyword', keyword); }
    },
    page: {
        model: WebPage,
        idField: '_id',
        filter: (site) => ({ site }),
        select: 'title slug content excerpt seo status',
        focusPath: 'seo.focusKeyword',
        lightSelect: 'title slug seo.focusKeyword',
        build: (p) => {
            const seo = p.seo || {};
            const keywords = Array.isArray(seo.metaKeywords) ? seo.metaKeywords : [];
            return {
                refId: String(p._id),
                title: p.title || '',
                url: `/sayfa/${p.slug}`,
                editPath: `/apps/pages/edit/${p._id}`,
                contentStatus: p.status || '',
                focusKeyword: seo.focusKeyword || '',
                keywords,
                hasCustomSeo: Boolean(seo.metaTitle || seo.metaDescription || keywords.length),
                effective: { title: seo.metaTitle || p.title || '', description: seo.metaDescription || p.excerpt || '', slug: p.slug || '' },
                content: p.content || ''
            };
        },
        setFocus: (doc, keyword) => { doc.set('seo.focusKeyword', keyword); }
    },
    category: {
        model: WebCategory,
        idField: '_id',
        filter: () => ({ isActive: { $ne: false } }),
        select: 'name slug seoUrl description seoTitle seoDescription seoKeywords focusKeyword siteContent',
        focusPath: 'focusKeyword',
        lightSelect: 'name slug seoUrl focusKeyword',
        build: (c, site, S) => {
            const sc = c.siteContent?.[site] || {};
            const name = c.name || '';
            const description = sc.description || c.description || '';
            const vars = { 'kategori-adi': name, 'kategori-aciklamasi': description || `${name} kategorisinde en uygun lastik modellerini keşfedin.` };
            const customTitle = sc.seoTitle || c.seoTitle || '';
            const customDescription = sc.seoDescription || c.seoDescription || '';
            const keywords = Array.isArray(sc.seoKeywords) ? sc.seoKeywords : (Array.isArray(c.seoKeywords) ? c.seoKeywords : []);
            return {
                refId: String(c._id),
                title: name,
                url: `/kategori/${c.seoUrl || c.slug}`,
                editPath: `/apps/category/edit/${c._id}`,
                contentStatus: '',
                focusKeyword: c.focusKeyword || '',
                keywords,
                hasCustomSeo: Boolean(customTitle || customDescription || keywords.length),
                effective: {
                    title: customTitle || applyTemplate(S.templates.category?.titleTemplate, vars) || name,
                    description: customDescription || description || applyTemplate(S.templates.category?.descriptionTemplate, vars),
                    slug: c.seoUrl || c.slug || ''
                },
                content: sc.content || description
            };
        },
        setFocus: (doc, keyword) => { doc.set('focusKeyword', keyword); }
    },
    brand: {
        model: WebBrand,
        idField: '_id',
        filter: (site) => ({ [`siteSettings.${site}.webVisible`]: true }),
        select: 'name displayName seoUrl description seoTitle seoDescription seoKeywords focusKeyword siteContent',
        focusPath: 'focusKeyword',
        lightSelect: 'name displayName seoUrl focusKeyword',
        build: (b, site, S) => {
            const sc = b.siteContent?.[site] || {};
            const name = sc.displayName || b.displayName || b.name || '';
            const description = sc.description || b.description || '';
            const customTitle = sc.seoTitle || b.seoTitle || '';
            const customDescription = sc.seoDescription || b.seoDescription || '';
            const vars = { 'marka-adi': name, 'marka-aciklamasi': customDescription || `${name} lastik modellerini inceleyin.` };
            const keywords = Array.isArray(sc.seoKeywords) ? sc.seoKeywords : (Array.isArray(b.seoKeywords) ? b.seoKeywords : []);
            return {
                refId: String(b._id),
                title: name,
                url: `/marka/${b.seoUrl || ''}`,
                editPath: '/apps/brand/list',
                contentStatus: '',
                focusKeyword: b.focusKeyword || '',
                keywords,
                hasCustomSeo: Boolean(customTitle || customDescription || keywords.length),
                effective: {
                    title: customTitle || applyTemplate(S.templates.brand?.titleTemplate, vars) || name,
                    description: customDescription || applyTemplate(S.templates.brand?.descriptionTemplate, vars) || vars['marka-aciklamasi'],
                    slug: b.seoUrl || ''
                },
                content: description
            };
        },
        setFocus: (doc, keyword) => { doc.set('focusKeyword', keyword); }
    },
    tag: {
        model: WebTag,
        idField: '_id',
        filter: (site) => ({ site, isActive: { $ne: false } }),
        select: 'title seoUrl description seoTitle seoDescription focusKeyword',
        focusPath: 'focusKeyword',
        lightSelect: 'title seoUrl focusKeyword',
        build: (t, site, S) => {
            const title = t.title || '';
            return {
                refId: String(t._id),
                title,
                url: `/etiket/${t.seoUrl || ''}`,
                editPath: `/apps/label/edit/${t._id}`,
                contentStatus: '',
                focusKeyword: t.focusKeyword || '',
                keywords: [],
                hasCustomSeo: Boolean(t.seoTitle || t.seoDescription),
                effective: {
                    title: t.seoTitle || (S.siteName ? `${title} | ${S.siteName}` : title),
                    description: t.seoDescription || `${title} - En uygun lastik fiyatları ve modelleri.`,
                    slug: t.seoUrl || ''
                },
                content: t.description || ''
            };
        },
        setFocus: (doc, keyword) => { doc.set('focusKeyword', keyword); }
    }
};

const isValidType = (type) => CONTENT_TYPES.includes(type);

const normalizeKeyword = (text) => String(text || '').toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim();

/**
 * Site genelinde odak kelime → onu kullanan içerikler haritası (aynı kelime iki sayfada
 * olmasın diye). Kaynak koleksiyonlardan hafif alanlarla okunur; taramada bir kez kurulur.
 */
async function buildKeywordUsageMap(site, S) {
    const map = new Map();
    for (const type of CONTENT_TYPES) {
        const def = TYPE_DEFS[type];
        const rows = await def.model.find({ ...def.filter(site), [def.focusPath]: { $exists: true, $nin: [null, ''] } }).select(def.lightSelect).lean();
        for (const raw of rows) {
            const built = def.build(raw, site, S);
            const key = normalizeKeyword(built.focusKeyword);
            if (!key) continue;
            if (!map.has(key)) map.set(key, []);
            map.get(key).push({ type, refId: built.refId, title: decodeEntities(built.title), url: built.url, editPath: built.editPath });
        }
    }
    return map;
}

function usedElsewhere(usageMap, keyword, type, refId) {
    const list = usageMap.get(normalizeKeyword(keyword)) || [];
    return list.filter(u => !(u.type === type && String(u.refId) === String(refId))).slice(0, 5);
}

/** Form içi canlı analiz için: bu kelimeyi (kendisi hariç) kullanan içerikler */
async function keywordUsage(site, keyword, exclude = {}) {
    if (!normalizeKeyword(keyword)) return [];
    const S = await loadSettings(site);
    const map = await buildKeywordUsageMap(site, S);
    return usedElsewhere(map, keyword, exclude.type, exclude.refId);
}

function runAnalysis(type, built, S, usageMap) {
    built.effective.title = decodeEntities(built.effective.title);
    built.effective.description = decodeEntities(built.effective.description);
    return analyzeContent({
        type,
        focusKeyword: built.focusKeyword,
        title: built.effective.title,
        description: built.effective.description,
        slug: built.effective.slug,
        content: built.content,
        keywords: built.keywords,
        hasCustomSeo: built.hasCustomSeo,
        galleryImages: built.galleryImages,
        usedElsewhere: usageMap ? usedElsewhere(usageMap, built.focusKeyword, type, built.refId) : []
    }, { thresholds: S.thresholds, ownHosts: OWN_HOSTS });
}

function toScoreDoc(site, type, built, analysis, scanId) {
    return {
        site,
        type,
        refId: built.refId,
        title: decodeEntities(built.title),
        url: built.url,
        editPath: built.editPath,
        contentStatus: built.contentStatus,
        focusKeyword: built.focusKeyword,
        source: built.hasCustomSeo ? 'custom' : (built.effective.title ? 'template' : 'empty'),
        score: analysis.score,
        status: analysis.status,
        passed: analysis.passed,
        failed: analysis.failed,
        checks: analysis.checks,
        stats: { ...analysis.stats, keywordUsage: analysis.keywordUsage },
        effective: built.effective,
        scanId,
        scannedAt: new Date()
    };
}

/** Tüm siteyi arka planda tarar; durum getScanState(site) ile izlenir */
function scanSite(site) {
    const current = scanState.get(site);
    if (current?.running) return current;

    const scanId = crypto.randomBytes(6).toString('hex');
    const state = { running: true, scanId, startedAt: new Date(), finishedAt: null, currentType: '', byType: {}, total: 0, error: '' };
    scanState.set(site, state);

    state.promise = (async () => {
        try {
            const S = await loadSettings(site);
            const usageMap = await buildKeywordUsageMap(site, S);
            for (const type of CONTENT_TYPES) {
                const def = TYPE_DEFS[type];
                state.currentType = type;
                state.byType[type] = 0;
                const cursor = def.model.find(def.filter(site)).select(def.select).lean().cursor();
                let ops = [];
                for await (const raw of cursor) {
                    const built = def.build(raw, site, S);
                    const analysis = runAnalysis(type, built, S, usageMap);
                    const doc = toScoreDoc(site, type, built, analysis, scanId);
                    ops.push({ updateOne: { filter: { site, type, refId: built.refId }, update: { $set: doc }, upsert: true } });
                    if (ops.length >= BATCH_SIZE) {
                        await SeoContentScore.bulkWrite(ops, { ordered: false });
                        state.byType[type] += ops.length;
                        state.total += ops.length;
                        ops = [];
                    }
                }
                if (ops.length) {
                    await SeoContentScore.bulkWrite(ops, { ordered: false });
                    state.byType[type] += ops.length;
                    state.total += ops.length;
                }
            }
            // Bu taramada görülmeyen (silinmiş / yayından kalkmış) kayıtların puanı kaldırılır
            await SeoContentScore.deleteMany({ site, scanId: { $ne: scanId } });
        } catch (e) {
            state.error = String(e?.message || e).slice(0, 220);
        } finally {
            state.running = false;
            state.currentType = '';
            state.finishedAt = new Date();
        }
    })();

    return state;
}

const getScanState = (site) => {
    const s = scanState.get(site);
    if (!s) return null;
    const { promise, ...rest } = s;
    return rest;
};

async function loadOne(type, site, refId) {
    const def = TYPE_DEFS[type];
    const query = { ...def.filter(site), [def.idField]: refId };
    return def.model.findOne(query);
}

/** Tek kaydı güncel veriden analiz eder ve puan tablosuna yazar */
async function analyzeOne(site, type, refId) {
    if (!isValidType(type)) return null;
    const def = TYPE_DEFS[type];
    const raw = await loadOne(type, site, refId);
    if (!raw) return null;
    const S = await loadSettings(site);
    const built = def.build(raw.toObject(), site, S);
    const usageMap = await buildKeywordUsageMap(site, S);
    const analysis = runAnalysis(type, built, S, usageMap);
    const existing = await SeoContentScore.findOne({ site, type, refId: built.refId }).select('scanId').lean();
    const doc = toScoreDoc(site, type, built, analysis, existing?.scanId || '');
    await SeoContentScore.updateOne({ site, type, refId: built.refId }, { $set: doc }, { upsert: true });
    return { ...doc, content: undefined, analysis };
}

/** Odak anahtar kelimeyi kaynak belgeye yazar, ardından yeniden puanlar */
async function setFocusKeyword(site, type, refId, keyword) {
    if (!isValidType(type)) return null;
    const def = TYPE_DEFS[type];
    const raw = await loadOne(type, site, refId);
    if (!raw) return null;
    def.setFocus(raw, String(keyword || '').trim());
    await raw.save();
    return analyzeOne(site, type, refId);
}

/** Liste sekmesi üst özeti: durum ve tip dağılımı, son tarama zamanı */
async function summary(site) {
    const [byStatus, byType, last] = await Promise.all([
        SeoContentScore.aggregate([{ $match: { site } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
        SeoContentScore.aggregate([{ $match: { site } }, { $group: { _id: '$type', count: { $sum: 1 }, avgScore: { $avg: '$score' } } }]),
        SeoContentScore.findOne({ site }).sort({ scannedAt: -1 }).select('scannedAt').lean()
    ]);
    return {
        total: byStatus.reduce((sum, r) => sum + r.count, 0),
        byStatus: Object.fromEntries(byStatus.map(r => [r._id, r.count])),
        byType: Object.fromEntries(byType.map(r => [r._id, { count: r.count, avgScore: Math.round(r.avgScore || 0) }])),
        lastScanAt: last?.scannedAt || null
    };
}

module.exports = { scanSite, getScanState, analyzeOne, setFocusKeyword, summary, loadSettings, isValidType, keywordUsage, OWN_HOSTS };
