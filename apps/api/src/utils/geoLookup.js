/**
 * IP -> il/ülke çözümü (Canlı İzleme haritası ve konuma göre oturum raporu için).
 *
 * geoip-lite paketi kurulu değilse (kod senkronlanıp henüz `npm install` yapılmadıysa)
 * modül sessizce devre dışı kalır ve null döner: oturum kaydı hiçbir koşulda konum
 * yüzünden başarısız olmaz. Kişisel veri tutulmaz — yalnızca il/ülke adı.
 */
let geoip = null;
try {
    geoip = require('geoip-lite');
} catch (e) {
    geoip = null;
}

// Özel/yerel ağ adresleri: çözümlenemez, boşuna arama yapılmaz
const PRIVATE_IP = /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|::1$|f[cd])/i;

/** "a, b, c" biçimindeki X-Forwarded-For zincirinden gerçek istemci adresini (ilki) alır. */
function normalizeIp(raw) {
    if (!raw || typeof raw !== 'string') return '';
    return raw.split(',')[0].trim().replace(/^::ffff:/, '');
}

/** @returns {{ city: string, region: string, country: string } | null} */
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
