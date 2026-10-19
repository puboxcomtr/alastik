
const { google } = require('googleapis');
const path = require('path');
const { SITES } = require('../../config/sites');
const SeoSearchDaily = require('../../models/admin/seo/SeoSearchDaily');
const { addDays, toDateString, GSC_LAG_DAYS } = require('../../utils/seoPeriod');

const KEY_FILE = path.join(__dirname, '../../config/alastik-service-account.json');
const SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly'];
const ROW_LIMIT = 25000;
const MAX_PAGES_PER_CALL = 40;
const REQUEST_TIMEOUT_MS = 30000;
const PROPERTY_CACHE_MS = 10 * 60 * 1000;
const CHUNK_DAYS = 31;
const DIMENSIONS = ['query', 'page'];

const propertyCache = new Map();
const syncState = new Map();

function siteDomain(site) {
    return (SITES[site]?.domains || []).find(d => !d.startsWith('www.') && !d.startsWith('dev.') && !d.startsWith('demo.')) || '';
}

function propertyCandidates(domain) {
    return [`sc-domain:${domain}`, `https://${domain}/`, `https://www.${domain}/`];
}

function serviceAccountEmail() {
    try { return require(KEY_FILE).client_email || ''; } catch (e) { return ''; }
}

function setupInfo(site) {
    const domain = siteDomain(site);
    return {
        serviceAccount: serviceAccountEmail(),
        domain,
        steps: [
            'Google Cloud Console > proje "alastik" > APIs & Services > "Google Search Console API" > Etkinleştir',
            `Search Console > ${domain} mülkü > Ayarlar > Kullanıcılar ve izinler > servis hesabını "Tam" yetkiyle ekleyin`
        ]
    };
}

const shortError = (e) => String(e?.message || e).replace(/\s+/g, ' ').slice(0, 220);

function client() {
    const auth = new google.auth.GoogleAuth({ keyFile: KEY_FILE, scopes: SCOPES });
    return google.searchconsole({ version: 'v1', auth });
}

async function resolveProperty(site, { force = false } = {}) {
    const cached = propertyCache.get(site);
    if (!force && cached && Date.now() - cached.at < PROPERTY_CACHE_MS) return cached.value;

    let value;
    try {
        const res = await client().sites.list({}, { timeout: REQUEST_TIMEOUT_MS });
        const entries = res.data.siteEntry || [];
        const domain = siteDomain(site);
        const found = propertyCandidates(domain).find(candidate =>
            entries.some(e => e.siteUrl === candidate && e.permissionLevel && e.permissionLevel !== 'siteUnverifiedUser')
        );
        value = found
            ? { ok: true, property: found, reason: '' }
            : { ok: false, property: null, reason: `Servis hesabı ${domain} mülküne eklenmemiş` };
    } catch (e) {
        value = { ok: false, property: null, reason: shortError(e) };
    }
    propertyCache.set(site, { at: Date.now(), value });
    return value;
}

async function fetchDimension(sc, property, dimension, startDate, endDate) {
    const rows = [];
    let startRow = 0;
    for (let page = 0; page < MAX_PAGES_PER_CALL; page++) {
        const res = await sc.searchanalytics.query({
            siteUrl: property,
            requestBody: { startDate, endDate, dimensions: ['date', dimension], rowLimit: ROW_LIMIT, startRow, dataState: 'final' }
        }, { timeout: REQUEST_TIMEOUT_MS });
        const batch = res.data.rows || [];
        rows.push(...batch);
        if (batch.length < ROW_LIMIT) break;
        startRow += ROW_LIMIT;
    }
    return rows;
}

async function snapshotRange(site, startDate, endDate) {
    const prop = await resolveProperty(site);
    if (!prop.ok) return { ok: false, reason: prop.reason, rows: 0 };

    const sc = client();
    let total = 0;
    for (const dimension of DIMENSIONS) {
        const rows = await fetchDimension(sc, prop.property, dimension, startDate, endDate);
        for (let i = 0; i < rows.length; i += 1000) {
            const ops = rows.slice(i, i + 1000).map(r => ({
                updateOne: {
                    filter: { site, dimension, date: r.keys[0], key: r.keys[1] },
                    update: { $set: { clicks: r.clicks || 0, impressions: r.impressions || 0, ctr: r.ctr || 0, position: r.position || 0 } },
                    upsert: true
                }
            }));
            if (ops.length) await SeoSearchDaily.bulkWrite(ops, { ordered: false });
        }
        total += rows.length;
    }
    return { ok: true, rows: total, property: prop.property };
}

async function snapshotRecent(site, days = 7) {
    const endDate = addDays(toDateString(new Date()), -GSC_LAG_DAYS);
    return snapshotRange(site, addDays(endDate, -(days - 1)), endDate);
}

function syncDays(site, days) {
    const current = syncState.get(site);
    if (current?.running) return current;

    const endDate = addDays(toDateString(new Date()), -GSC_LAG_DAYS);
    const startDate = addDays(endDate, -(days - 1));
    const chunks = [];
    let cursor = startDate;
    while (cursor <= endDate) {
        const chunkEnd = addDays(cursor, CHUNK_DAYS - 1) < endDate ? addDays(cursor, CHUNK_DAYS - 1) : endDate;
        chunks.push([cursor, chunkEnd]);
        cursor = addDays(chunkEnd, 1);
    }

    const state = { running: true, startedAt: new Date(), finishedAt: null, startDate, endDate, total: chunks.length, done: 0, rows: 0, error: '' };
    syncState.set(site, state);

    (async () => {
        try {
            for (const [a, b] of chunks) {
                const result = await snapshotRange(site, a, b);
                if (!result.ok) { state.error = result.reason; break; }
                state.rows += result.rows;
                state.done += 1;
            }
        } catch (e) {
            state.error = shortError(e);
        } finally {
            state.running = false;
            state.finishedAt = new Date();
        }
    })();

    return state;
}

const getSyncState = (site) => syncState.get(site) || null;

async function latestDate(site) {
    const row = await SeoSearchDaily.findOne({ site, dimension: 'page' }).sort({ date: -1 }).select('date').lean();
    return row?.date || null;
}

module.exports = { resolveProperty, setupInfo, snapshotRange, snapshotRecent, syncDays, getSyncState, latestDate, siteDomain };
