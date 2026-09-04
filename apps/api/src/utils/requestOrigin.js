/**
 * İsteğin kaynağını sınıflandırır: sunucunun kendi (SSR) çağrısı mı, bot mu, gerçek ziyaretçi mi?
 *
 * Next.js sunucusu sayfa üretirken API'ye tarayıcı cookie'si olmadan istek atar; bu istekler
 * oturum sayılırsa her sayfa açılışı sunucu IP'li sahte oturumlar üretir. Liste env'den okunur
 * (RATE_LIMIT_SKIP_IPS — rate limit için de aynı amaçla kullanılıyor); hardcode yok.
 */
const { normalizeIp } = require('./geoLookup');

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost']);

const INTERNAL_IPS = new Set(
    String(process.env.RATE_LIMIT_SKIP_IPS || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
);

// Arama motoru / izleme / komut satırı istemcileri — ziyaretçi istatistiklerine dahil edilmez
const BOT_UA_RE = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|preview|monitor|uptime|pingdom|curl|wget|python-requests|python-urllib|node-fetch|undici|axios|go-http-client|okhttp|java\/|headless|lighthouse|pagespeed/i;

function clientIp(req) {
    const raw = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
    return normalizeIp(String(raw));
}

/** Sunucunun kendi SSR/iç çağrısı mı? */
function isInternalRequest(req) {
    const ip = clientIp(req);
    return LOOPBACK.has(ip) || INTERNAL_IPS.has(ip);
}

function isBotUserAgent(userAgent) {
    const ua = String(userAgent || '');
    if (!ua) return true; // UA göndermeyen istemci tarayıcı değildir
    return BOT_UA_RE.test(ua);
}

module.exports = { isInternalRequest, isBotUserAgent, BOT_UA_RE, clientIp };
