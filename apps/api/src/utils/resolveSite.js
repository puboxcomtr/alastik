const { DOMAIN_TO_SLUG, DEFAULT_SITE, isValidSite } = require('../config/sites');

function normalizeHost(host) {
    if (!host || typeof host !== 'string') return '';
    return host.trim().toLowerCase().split(':')[0];
}

function hostFromOrigin(origin) {
    if (!origin || typeof origin !== 'string') return '';
    try {
        return new URL(origin).hostname.toLowerCase();
    } catch (e) {
        return '';
    }
}

function resolveSite(req) {
    if (!req || !req.headers) return DEFAULT_SITE;
    const headers = req.headers;
    const explicit = (headers['x-site'] || '').toString().trim().toLowerCase();
    if (explicit && isValidSite(explicit)) return explicit;
    const host = normalizeHost(headers['host']);
    if (host && DOMAIN_TO_SLUG[host]) return DOMAIN_TO_SLUG[host];
    const originHost = hostFromOrigin(headers['origin']);
    if (originHost && DOMAIN_TO_SLUG[originHost]) return DOMAIN_TO_SLUG[originHost];
    return DEFAULT_SITE;
}

module.exports = { resolveSite, normalizeHost, hostFromOrigin };
