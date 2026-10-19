const { resolveSite } = require('../utils/resolveSite');

function siteMiddleware(req, res, next) {
    req.site = resolveSite(req);
    next();
}

module.exports = { siteMiddleware };