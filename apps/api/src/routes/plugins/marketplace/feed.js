/**
 * GET /api/feed/urunler — pazar yeri ürün feed'i (docs/PAZAR-YERI-FEED.md)
 *   X-Feed-Key: <MARKETPLACE_FEED_KEY>   (zorunlu kalınırsa ?key= de kabul edilir)
 *   ?tip=lastik|jant                     (varsayılan ikisi)
 *   ?site=lastikjantavm                  (yoksa Host/X-Site'tan çözülen site)
 *   ?refresh=1                           (5 dk önbelleği atla)
 * Yanlış anahtar → 401, feed kapalı (anahtar tanımsız) → 503. Sıklık: 15 dk'da 20 istek.
 * Yalnız MARKETPLACE_FEED_SITES (varsayılan: lastikjantavm,alastik) listesindeki siteler feed verir; diğerleri 404.
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { generateFeed, isAuthorized } = require('../../../services/plugins/marketplace/MarketplaceFeedService');
const { isValidSite } = require('../../../config/sites');

const allowedSites = () => String(process.env.MARKETPLACE_FEED_SITES || 'lastikjantavm,alastik').split(',').map(s => s.trim()).filter(Boolean);

const feedLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Çok fazla istek; saatte bir okuma yeterlidir' }
});

router.get('/urunler', feedLimiter, async (req, res) => {
    try {
        if (!process.env.MARKETPLACE_FEED_KEY) {
            return res.status(503).json({ success: false, message: 'Feed kapalı' });
        }
        if (!isAuthorized(req)) {
            return res.status(401).json({ success: false, message: 'Geçersiz feed anahtarı' });
        }

        const querySite = String(req.query.site || '').trim().toLowerCase();
        const site = isValidSite(querySite) ? querySite : req.site;
        if (!allowedSites().includes(site)) {
            return res.status(404).json({ success: false, message: 'Bu site için feed tanımlı değil' });
        }
        const tip = ['lastik', 'jant'].includes(String(req.query.tip || '')) ? String(req.query.tip) : null;

        const { payload, cached } = await generateFeed({ site, tip, force: req.query.refresh === '1' });
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=300');
        res.setHeader('X-Feed-Cache', cached ? 'HIT' : 'MISS');
        res.json(payload);
    } catch (err) {
        const status = err.status || 500;
        if (status === 500) console.error('Pazar yeri feed hatası:', err);
        res.status(status).json({ success: false, message: status === 500 ? 'Feed üretilemedi' : err.message });
    }
});

module.exports = router;
