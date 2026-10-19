const router = require('express').Router();
const WebRedirect = require('../../../models/web/other/WebRedirect');

const cache = new Map();
const CACHE_TTL = 60 * 1000;

function clearRedirectCache(site) {
    if (site) cache.delete(site);
    else cache.clear();
}

router.get('/map', async (req, res) => {
    try {
        const site = req.site || 'alastik';
        const cached = cache.get(site);
        if (cached && Date.now() - cached.at < CACHE_TTL) {
            return res.json({ success: true, data: cached.data, cached: true });
        }

        const rows = await WebRedirect.find({ site, isActive: true }).select('source target statusCode').lean();
        const data = {};
        for (const r of rows) data[r.source] = { t: r.target, c: r.statusCode || 301 };

        cache.set(site, { at: Date.now(), data });
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Yönlendirme haritası yüklenemedi', error: err.message });
    }
});

module.exports = router;
module.exports.clearRedirectCache = clearRedirectCache;
