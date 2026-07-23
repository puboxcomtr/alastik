/**
 * siteMiddleware — her isteğe req.site ekler.
 * resolveSite (Host/X-Site/Origin) ile çözer. Pasif: sadece req.site set eder,
 * hiçbir sorguyu kendi başına filtrelemez. Route'lar req.site'ı kullanır.
 */
const { resolveSite } = require('../utils/resolveSite');

function siteMiddleware(req, res, next) {
    req.site = resolveSite(req);
    next();
}

module.exports = { siteMiddleware };