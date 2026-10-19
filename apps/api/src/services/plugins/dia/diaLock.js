const Redis = require('ioredis');
const crypto = require('crypto');
const { redis: redisConfig } = require('../../../config/worker.config');

const LOCK_KEY = 'dia:ws:lock';

let client = null;
function getClient() {
    if (!client) {
        client = new Redis({
            host: redisConfig.host,
            port: redisConfig.port,
            password: redisConfig.password || undefined,
            maxRetriesPerRequest: null,
            enableReadyCheck: false
        });
        client.on('error', () => {  });
    }
    return client;
}

const RENEW = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('pexpire', KEYS[1], ARGV[2]) else return 0 end";
const RELEASE = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function acquire({ ttlMs = 120000, waitMs = 5400000, pollMs = 750, key = LOCK_KEY } = {}) {
    const r = getClient();
    const token = crypto.randomBytes(16).toString('hex');
    const deadline = Date.now() + waitMs;
    for (;;) {
        try {
            const ok = await r.set(key, token, 'PX', ttlMs, 'NX');
            if (ok === 'OK') return token;
        } catch (e) {
            return null;
        }
        if (Date.now() >= deadline) return null;
        await sleep(pollMs);
    }
}

async function release(token, key = LOCK_KEY) {
    if (!token) return;
    try { await getClient().eval(RELEASE, 1, key, token); } catch (e) {  }
}

async function withDiaLock(fn, { label = 'dia', ttlMs = 120000, waitMs = 5400000, key = LOCK_KEY, skipIfBusy = false } = {}) {
    const start = Date.now();
    const token = await acquire({ ttlMs, waitMs, key });
    const waited = Date.now() - start;
    if (!token && skipIfBusy) {
        const busy = await getClient().exists(key).catch(() => 0);
        if (busy) {
            console.log(`[diaLock] ${label}: kilit dolu — tur atlandı (${(waited / 1000).toFixed(1)}s bekledi)`);
            return { skipped: true, reason: 'lock-busy' };
        }
    }
    if (waited > 1000) {
        console.log(`[diaLock] ${label}: kilit ${token ? 'alındı' : 'ALINAMADI (kilitsiz devam)'} — ${(waited / 1000).toFixed(1)}s bekledi`);
    }
    let hb = null;
    if (token) {
        hb = setInterval(() => {
            getClient().eval(RENEW, 1, key, token, String(ttlMs)).catch(() => {});
        }, Math.floor(ttlMs / 2));
        if (hb.unref) hb.unref();
    }
    try {
        return await fn();
    } finally {
        if (hb) clearInterval(hb);
        await release(token, key);
    }
}

const B2B_LOCK_KEY = 'dia:b2b:lock';

module.exports = { withDiaLock, acquire, release, B2B_LOCK_KEY };
