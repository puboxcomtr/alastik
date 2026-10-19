const { normalizeIp } = require('./geoLookup');

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost']);

const INTERNAL_IPS = new Set(
    String(process.env.RATE_LIMIT_SKIP_IPS || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
);

const BOT_UA_RE = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|preview|monitor|uptime|pingdom|curl|wget|python-requests|python-urllib|node-fetch|undici|axios|go-http-client|okhttp|java\/|headless|lighthouse|pagespeed/i;

function clientIp(req) {
    const raw = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
    return normalizeIp(String(raw));
}

function isInternalRequest(req) {
    const ip = clientIp(req);
    return LOOPBACK.has(ip) || INTERNAL_IPS.has(ip);
}

function isBotUserAgent(userAgent) {
    const ua = String(userAgent || '');
    if (!ua) return true;
    return BOT_UA_RE.test(ua);
}

module.exports = { isInternalRequest, isBotUserAgent, BOT_UA_RE, clientIp };
