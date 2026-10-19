
const cron = require('node-cron');
const { SITES } = require('../../config/sites');
const searchConsole = require('./searchConsoleService');
const scanner = require('./contentScanner');

const TIMEZONE = 'Europe/Istanbul';
const SNAPSHOT_DAYS = 7;

const isPrimaryInstance = () => !process.env.NODE_APP_INSTANCE || process.env.NODE_APP_INSTANCE === '0';

async function runSnapshots() {
    for (const site of Object.keys(SITES)) {
        try {
            const result = await searchConsole.snapshotRecent(site, SNAPSHOT_DAYS);
            console.log(`[SeoScheduler] Search Console ${site}: ${result.ok ? `${result.rows} satır` : `atlandı (${result.reason})`}`);
        } catch (e) {
            console.error(`[SeoScheduler] Search Console ${site} hatası:`, e.message);
        }
    }
}

async function runScans() {
    for (const site of Object.keys(SITES)) {
        try {
            const state = scanner.scanSite(site);
            if (state.promise) await state.promise;
            console.log(`[SeoScheduler] İçerik taraması ${site}: ${state.total} kayıt${state.error ? ` (hata: ${state.error})` : ''}`);
        } catch (e) {
            console.error(`[SeoScheduler] İçerik taraması ${site} hatası:`, e.message);
        }
    }
}

function start() {
    if (process.env.SEO_SCHEDULER === 'false') return;
    if (!isPrimaryInstance()) return;

    cron.schedule('30 4 * * *', runSnapshots, { timezone: TIMEZONE });
    cron.schedule('30 3 * * *', runScans, { timezone: TIMEZONE });
    console.log('[SeoScheduler] Başlatıldı — 03:30 içerik taraması, 04:30 Search Console anlık görüntüsü');
}

module.exports = { start, runSnapshots, runScans };
