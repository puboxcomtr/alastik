let geoip = null;
try {
    geoip = require('geoip-lite');
} catch (e) {
    geoip = null;
}

const PRIVATE_IP = /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|::1$|f[cd])/i;

function normalizeIp(raw) {
    if (!raw || typeof raw !== 'string') return '';
    return raw.split(',')[0].trim().replace(/^::ffff:/, '');
}

function lookupLocation(rawIp) {
    const ip = normalizeIp(rawIp);
    if (!ip || !geoip || PRIVATE_IP.test(ip)) return null;
    try {
        const hit = geoip.lookup(ip);
        if (!hit) return null;
        return {
            city: hit.city || '',
            region: hit.region || '',
            country: hit.country || ''
        };
    } catch (e) {
        return null;
    }
}

module.exports = {
    lookupLocation,
    normalizeIp,
    isAvailable: () => Boolean(geoip)
};
