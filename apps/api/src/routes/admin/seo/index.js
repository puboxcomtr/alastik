/**
 * SEO modülü — /api/admin/seo/*
 *
 *  GET  /report?period=            Genel rapor (Search Console anlık görüntüsünden)
 *  POST /report/sync {days}        Arka planda Google'dan çekim başlat; GET /report/sync durum
 *  GET  /keywords?period=          Takip edilen kelimeler ve dönem istatistikleri
 *  POST /keywords {keyword}        Kelime ekle; DELETE /keywords/:id sil
 *  GET  /keywords/suggestions      Eklenebilecek kelime önerileri
 *  GET  /content?type&status&q     İçerik puan listesi; POST /content/scan tarama başlat
 *  GET  /content/:type/:id         Tek içerik: güncel analiz
 *  PUT  /content/:type/:id/focus-keyword {focusKeyword}
 *  POST /analyze                   Form içi canlı analiz (kaydetmeden)
 *  GET  /settings                  Analiz eşikleri (SeoSettings.analysis + varsayılanlar)
 *
 * Tüm uçlar req.site ile sınırlıdır (X-Site header).
 */

const express = require('express');
const router = express.Router();

const SeoSearchDaily = require('../../../models/admin/seo/SeoSearchDaily');
const SeoKeyword = require('../../../models/admin/seo/SeoKeyword');
const SeoContentScore = require('../../../models/admin/seo/SeoContentScore');
const { CONTENT_TYPES, SCORE_STATUSES } = require('../../../models/admin/seo/SeoContentScore');
const WebProduct = require('../../../models/web/catalog/WebProduct');
const FrondSearchTerm = require('../../../models/web/catalog/FrondSearchTerm');
const searchConsole = require('../../../services/seo/searchConsoleService');
const scanner = require('../../../services/seo/contentScanner');
const { analyzeContent, DEFAULT_THRESHOLDS, CHECK_DEFS } = require('../../../services/seo/contentAnalyzer');
const { resolveSeoPeriod, addDays, PERIOD_LABELS } = require('../../../utils/seoPeriod');

const MAX_SYNC_DAYS = 480;
const DEFAULT_SYNC_DAYS = 365;
const MIN_IMPRESSIONS_FOR_MOVERS = 5;
const MOVER_MIN_DELTA = 0.5;
const LIST_LIMIT = 10;
const QUERY_POOL_LIMIT = 3000;
const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const round1 = (n) => Math.round((Number(n) || 0) * 10) / 10;

// ---------------------------------------------------------------------------
// Search Console tablo sorguları
// ---------------------------------------------------------------------------

const rangeMatch = (site, dimension, start, end) => ({ site, dimension, date: { $gte: start, $lte: end } });

const finishRow = (r) => ({
    key: r._id,
    clicks: r.clicks || 0,
    impressions: r.impressions || 0,
    ctr: r.impressions ? round1((r.clicks / r.impressions) * 100) : 0,
    position: r.impressions ? round1(r.positionWeight / r.impressions) : 0
});

async function totalsFor(site, start, end) {
    const [row] = await SeoSearchDaily.aggregate([
        { $match: rangeMatch(site, 'page', start, end) },
        { $group: { _id: null, clicks: { $sum: '$clicks' }, impressions: { $sum: '$impressions' }, positionWeight: { $sum: { $multiply: ['$position', '$impressions'] } } } }
    ]);
    return finishRow(row || { _id: null, clicks: 0, impressions: 0, positionWeight: 0 });
}

async function seriesFor(site, period) {
    const keyExpr = period.granularity === 'month' ? { $substr: ['$date', 0, 7] } : '$date';
    const rows = await SeoSearchDaily.aggregate([
        { $match: rangeMatch(site, 'page', period.start, period.end) },
        { $group: { _id: keyExpr, clicks: { $sum: '$clicks' }, impressions: { $sum: '$impressions' } } },
        { $sort: { _id: 1 } }
    ]);
    const map = Object.fromEntries(rows.map(r => [r._id, r]));
    const points = [];
    if (period.granularity === 'month') {
        let cursor = period.start.slice(0, 7);
        const last = period.end.slice(0, 7);
        let guard = 0;
        while (cursor <= last && guard++ < 40) {
            const r = map[cursor];
            const [y, m] = cursor.split('-').map(Number);
            points.push({ key: cursor, label: new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('tr-TR', { month: 'short', year: '2-digit', timeZone: 'UTC' }), clicks: r?.clicks || 0, impressions: r?.impressions || 0 });
            cursor = `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, '0')}`;
        }
    } else {
        let cursor = period.start;
        let guard = 0;
        while (cursor <= period.end && guard++ < 400) {
            const r = map[cursor];
            points.push({ key: cursor, label: new Date(`${cursor}T00:00:00Z`).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', timeZone: 'UTC' }), clicks: r?.clicks || 0, impressions: r?.impressions || 0 });
            cursor = addDays(cursor, 1);
        }
    }
    return points;
}

async function groupedFor(site, dimension, start, end, limit = QUERY_POOL_LIMIT) {
    const rows = await SeoSearchDaily.aggregate([
        { $match: rangeMatch(site, dimension, start, end) },
        { $group: { _id: '$key', clicks: { $sum: '$clicks' }, impressions: { $sum: '$impressions' }, positionWeight: { $sum: { $multiply: ['$position', '$impressions'] } } } },
        { $sort: { clicks: -1, impressions: -1 } },
        { $limit: limit }
    ]);
    return rows.map(finishRow);
}

function movers(current, previous) {
    const prevMap = new Map(previous.map(r => [r.key, r]));
    const winners = [];
    const losers = [];
    const fresh = [];
    for (const row of current) {
        const prev = prevMap.get(row.key);
        if (!prev) {
            if (row.impressions >= MIN_IMPRESSIONS_FOR_MOVERS) fresh.push(row);
            continue;
        }
        if (row.impressions < MIN_IMPRESSIONS_FOR_MOVERS || prev.impressions < MIN_IMPRESSIONS_FOR_MOVERS) continue;
        const delta = round1(prev.position - row.position); // pozitif = yukarı çıktı
        const entry = { ...row, prevPosition: prev.position, delta, clicksDelta: row.clicks - prev.clicks };
        if (delta >= MOVER_MIN_DELTA) winners.push(entry);
        else if (delta <= -MOVER_MIN_DELTA) losers.push(entry);
    }
    winners.sort((a, b) => b.delta - a.delta || b.clicks - a.clicks);
    losers.sort((a, b) => a.delta - b.delta || b.clicks - a.clicks);
    fresh.sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions);
    return { winners: winners.slice(0, LIST_LIMIT), losers: losers.slice(0, LIST_LIMIT), fresh: fresh.slice(0, LIST_LIMIT) };
}

function positionBuckets(rows) {
    const buckets = { top3: 0, top10: 0, top50: 0, beyond: 0 };
    for (const r of rows) {
        if (r.impressions <= 0) continue;
        if (r.position <= 3) buckets.top3 += 1;
        else if (r.position <= 10) buckets.top10 += 1;
        else if (r.position <= 50) buckets.top50 += 1;
        else buckets.beyond += 1;
    }
    return buckets;
}

const trend = (current, previous) => (previous > 0 ? round1(((current - previous) / previous) * 100) : (current > 0 ? 100 : 0));

async function sourceInfo(site, latest) {
    const sync = searchConsole.getSyncState(site);
    if (latest) return { available: true, hasData: true, latestDate: latest, reason: '', property: null, setup: null, sync };
    const prop = await searchConsole.resolveProperty(site);
    return { available: prop.ok, hasData: false, latestDate: null, reason: prop.reason, property: prop.property, setup: searchConsole.setupInfo(site), sync };
}

async function trackedStats(site, current, previous) {
    const tracked = await SeoKeyword.find({ site }).sort({ createdAt: -1 }).lean();
    const curMap = new Map(current.map(r => [SeoKeyword.normalize(r.key), r]));
    const prevMap = new Map(previous.map(r => [SeoKeyword.normalize(r.key), r]));
    return tracked.map(k => {
        const cur = curMap.get(k.normalized);
        const prev = prevMap.get(k.normalized);
        return {
            _id: k._id,
            keyword: k.keyword,
            source: k.source,
            createdAt: k.createdAt,
            position: cur ? cur.position : null,
            prevPosition: prev ? prev.position : null,
            delta: cur && prev ? round1(prev.position - cur.position) : null,
            clicks: cur ? cur.clicks : 0,
            impressions: cur ? cur.impressions : 0,
            ctr: cur ? cur.ctr : 0,
            prevClicks: prev ? prev.clicks : 0
        };
    });
}

// ---------------------------------------------------------------------------
// Rapor
// ---------------------------------------------------------------------------

router.get('/report', async (req, res) => {
    try {
        const site = req.site;
        const latest = await searchConsole.latestDate(site);
        const period = resolveSeoPeriod(req.query, latest);
        if (!period) {
            return res.status(400).json({ success: false, message: 'Geçersiz dönem. period=yesterday|7d|30d|6m|1y veya custom&from=YYYY-MM-DD&to=YYYY-MM-DD' });
        }

        const [source, totals, prevTotals, series, queries, prevQueries, pages] = await Promise.all([
            sourceInfo(site, latest),
            totalsFor(site, period.start, period.end),
            totalsFor(site, period.prevStart, period.prevEnd),
            seriesFor(site, period),
            groupedFor(site, 'query', period.start, period.end),
            groupedFor(site, 'query', period.prevStart, period.prevEnd),
            groupedFor(site, 'page', period.start, period.end, LIST_LIMIT)
        ]);
        const tracked = await trackedStats(site, queries, prevQueries);

        res.json({
            success: true,
            data: {
                period: { ...period, labels: PERIOD_LABELS },
                source,
                totals: {
                    clicks: totals.clicks,
                    impressions: totals.impressions,
                    ctr: totals.ctr,
                    position: totals.position,
                    clicksTrend: trend(totals.clicks, prevTotals.clicks),
                    impressionsTrend: trend(totals.impressions, prevTotals.impressions),
                    ctrDelta: round1(totals.ctr - prevTotals.ctr),
                    positionDelta: prevTotals.position && totals.position ? round1(prevTotals.position - totals.position) : 0,
                    previous: prevTotals
                },
                series,
                queries: { top: queries.slice(0, LIST_LIMIT), ...movers(queries, prevQueries), total: queries.length },
                buckets: positionBuckets(queries),
                pages,
                tracked
            }
        });
    } catch (err) {
        console.error('SEO rapor hatası:', err);
        res.status(500).json({ success: false, message: 'SEO raporu yüklenemedi' });
    }
});

router.post('/report/sync', async (req, res) => {
    try {
        const days = Math.min(MAX_SYNC_DAYS, Math.max(1, parseInt(req.body?.days, 10) || DEFAULT_SYNC_DAYS));
        const prop = await searchConsole.resolveProperty(req.site, { force: true });
        if (!prop.ok) {
            return res.status(409).json({ success: false, message: `Search Console bağlantısı yok: ${prop.reason}`, setup: searchConsole.setupInfo(req.site) });
        }
        const state = searchConsole.syncDays(req.site, days);
        res.json({ success: true, data: state, message: 'Search Console verisi çekiliyor' });
    } catch (err) {
        console.error('SEO sync hatası:', err);
        res.status(500).json({ success: false, message: 'Çekim başlatılamadı' });
    }
});

router.get('/report/sync', (req, res) => {
    res.json({ success: true, data: searchConsole.getSyncState(req.site) });
});

// ---------------------------------------------------------------------------
// Anahtar kelimeler
// ---------------------------------------------------------------------------

router.get('/keywords', async (req, res) => {
    try {
        const site = req.site;
        const latest = await searchConsole.latestDate(site);
        const period = resolveSeoPeriod(req.query, latest);
        if (!period) return res.status(400).json({ success: false, message: 'Geçersiz dönem' });

        const [queries, prevQueries] = await Promise.all([
            groupedFor(site, 'query', period.start, period.end),
            groupedFor(site, 'query', period.prevStart, period.prevEnd)
        ]);
        const items = await trackedStats(site, queries, prevQueries);
        res.json({ success: true, data: { period: { ...period, labels: PERIOD_LABELS }, hasData: Boolean(latest), items } });
    } catch (err) {
        console.error('SEO kelime listesi hatası:', err);
        res.status(500).json({ success: false, message: 'Anahtar kelimeler yüklenemedi' });
    }
});

router.get('/keywords/suggestions', async (req, res) => {
    try {
        const site = req.site;
        const tracked = new Set((await SeoKeyword.find({ site }).select('normalized').lean()).map(k => k.normalized));
        const latest = await searchConsole.latestDate(site);
        const consoleRows = latest ? await groupedFor(site, 'query', addDays(latest, -29), latest, 60) : [];

        const [productRows, searchRows] = await Promise.all([
            WebProduct.aggregate([
                { $match: { 'syncInfo.diaStatus': 'synced', sites: site, 'customData.seoKeywords.0': { $exists: true } } },
                { $unwind: '$customData.seoKeywords' },
                { $group: { _id: { $toLower: { $trim: { input: '$customData.seoKeywords' } } }, count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 40 }
            ]),
            FrondSearchTerm.find({ isActive: { $ne: false } }).sort({ searchCount: -1 }).limit(40).select('term searchCount').lean()
        ]);

        const pick = (rows, mapFn) => {
            const out = [];
            for (const r of rows) {
                const item = mapFn(r);
                if (!item.keyword || tracked.has(SeoKeyword.normalize(item.keyword))) continue;
                out.push(item);
                if (out.length >= 15) break;
            }
            return out;
        };

        res.json({
            success: true,
            data: {
                console: pick(consoleRows, r => ({ keyword: r.key, hint: `${r.clicks} tıklama, ${r.impressions} gösterim`, source: 'console' })),
                product: pick(productRows, r => ({ keyword: r._id, hint: `${r.count} üründe`, source: 'product' })),
                search: pick(searchRows, r => ({ keyword: r.term, hint: `${r.searchCount} arama`, source: 'search' }))
            }
        });
    } catch (err) {
        console.error('SEO kelime önerisi hatası:', err);
        res.status(500).json({ success: false, message: 'Öneriler yüklenemedi' });
    }
});

router.post('/keywords', async (req, res) => {
    try {
        const raw = Array.isArray(req.body?.keywords) ? req.body.keywords : [req.body?.keyword];
        const source = ['manual', 'product', 'search', 'console'].includes(req.body?.source) ? req.body.source : 'manual';
        const cleaned = [...new Set(raw.map(k => String(k || '').trim()).filter(k => k.length >= 2 && k.length <= 120))];
        if (cleaned.length === 0) return res.status(400).json({ success: false, message: 'Anahtar kelime boş olamaz' });

        const ops = cleaned.map(keyword => ({
            updateOne: {
                filter: { site: req.site, normalized: SeoKeyword.normalize(keyword) },
                update: { $setOnInsert: { site: req.site, keyword, normalized: SeoKeyword.normalize(keyword), source } },
                upsert: true
            }
        }));
        const result = await SeoKeyword.bulkWrite(ops, { ordered: false });
        res.json({ success: true, data: { added: result.upsertedCount || 0, existing: cleaned.length - (result.upsertedCount || 0) }, message: `${result.upsertedCount || 0} kelime eklendi` });
    } catch (err) {
        console.error('SEO kelime ekleme hatası:', err);
        res.status(500).json({ success: false, message: 'Anahtar kelime eklenemedi' });
    }
});

router.delete('/keywords/:id', async (req, res) => {
    try {
        const result = await SeoKeyword.deleteOne({ _id: req.params.id, site: req.site });
        if (!result.deletedCount) return res.status(404).json({ success: false, message: 'Anahtar kelime bulunamadı' });
        res.json({ success: true, message: 'Anahtar kelime kaldırıldı' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Anahtar kelime silinemedi' });
    }
});

// ---------------------------------------------------------------------------
// İçerik analizi
// ---------------------------------------------------------------------------

router.get('/content', async (req, res) => {
    try {
        const site = req.site;
        const { type, status, q } = req.query;
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(5, parseInt(req.query.limit, 10) || 25));
        const sortField = ['score', 'title', 'scannedAt', 'type'].includes(req.query.sort) ? req.query.sort : 'score';
        const sortOrder = req.query.order === 'desc' ? -1 : 1;

        const filter = { site };
        if (type && CONTENT_TYPES.includes(type)) filter.type = type;
        if (status && SCORE_STATUSES.includes(status)) filter.status = status;
        if (status === 'nokeyword') filter.focusKeyword = '';
        if (q && String(q).trim().length >= 2) {
            const rx = new RegExp(escapeRegex(String(q).trim().slice(0, 80)), 'i');
            filter.$or = [{ title: rx }, { focusKeyword: rx }, { url: rx }];
        }

        const [items, total, summary] = await Promise.all([
            SeoContentScore.find(filter)
                .select('-checks -stats')
                .sort({ [sortField]: sortOrder, _id: 1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            SeoContentScore.countDocuments(filter),
            scanner.summary(site)
        ]);

        res.json({
            success: true,
            data: {
                items,
                pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
                summary,
                scan: scanner.getScanState(site)
            }
        });
    } catch (err) {
        console.error('SEO içerik listesi hatası:', err);
        res.status(500).json({ success: false, message: 'İçerik listesi yüklenemedi' });
    }
});

router.post('/content/scan', (req, res) => {
    const state = scanner.scanSite(req.site);
    const { promise, ...data } = state;
    res.json({ success: true, data, message: data.running ? 'Tarama başlatıldı' : 'Tarama zaten tamamlanmış' });
});

router.get('/content/scan', (req, res) => {
    res.json({ success: true, data: scanner.getScanState(req.site) });
});

router.get('/content/:type/:id', async (req, res) => {
    try {
        const { type, id } = req.params;
        if (!scanner.isValidType(type)) return res.status(400).json({ success: false, message: 'Geçersiz içerik tipi' });
        const result = await scanner.analyzeOne(req.site, type, id);
        if (!result) return res.status(404).json({ success: false, message: 'İçerik bulunamadı' });
        res.json({ success: true, data: result });
    } catch (err) {
        console.error('SEO içerik analizi hatası:', err);
        res.status(500).json({ success: false, message: 'İçerik analiz edilemedi' });
    }
});

router.put('/content/:type/:id/focus-keyword', async (req, res) => {
    try {
        const { type, id } = req.params;
        if (!scanner.isValidType(type)) return res.status(400).json({ success: false, message: 'Geçersiz içerik tipi' });
        const keyword = String(req.body?.focusKeyword || '').trim().slice(0, 120);
        const result = await scanner.setFocusKeyword(req.site, type, id, keyword);
        if (!result) return res.status(404).json({ success: false, message: 'İçerik bulunamadı' });
        res.json({ success: true, data: result, message: keyword ? 'Odak anahtar kelime kaydedildi' : 'Odak anahtar kelime kaldırıldı' });
    } catch (err) {
        console.error('SEO odak kelime hatası:', err);
        res.status(500).json({ success: false, message: 'Odak anahtar kelime kaydedilemedi' });
    }
});

router.post('/analyze', async (req, res) => {
    try {
        const body = req.body || {};
        const type = scanner.isValidType(body.type) ? body.type : 'page';
        const S = await scanner.loadSettings(req.site);
        // Aynı odak kelime başka içerikte var mı (kendisi hariç)
        const usedElsewhere = await scanner.keywordUsage(req.site, body.focusKeyword, { type, refId: body.refId });
        const analysis = analyzeContent({
            type,
            focusKeyword: body.focusKeyword,
            title: body.title,
            description: body.description,
            slug: body.slug,
            content: body.content,
            keywords: body.keywords,
            hasCustomSeo: Boolean(body.title || body.description),
            galleryImages: typeof body.galleryImages === 'number' ? body.galleryImages : undefined,
            usedElsewhere
        }, { thresholds: S.thresholds, ownHosts: scanner.OWN_HOSTS });
        res.json({ success: true, data: analysis });
    } catch (err) {
        console.error('SEO canlı analiz hatası:', err);
        res.status(500).json({ success: false, message: 'Analiz yapılamadı' });
    }
});

router.get('/settings', async (req, res) => {
    try {
        const S = await scanner.loadSettings(req.site);
        res.json({ success: true, data: { thresholds: S.thresholds, defaults: DEFAULT_THRESHOLDS, checks: CHECK_DEFS } });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Analiz ayarları yüklenemedi' });
    }
});

module.exports = router;
