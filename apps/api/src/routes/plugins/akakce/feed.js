const express = require('express');
const router = express.Router();
const { generateFeed } = require('../../../services/plugins/akakce/AkakceFeedService');
const { isValidSite } = require('../../../config/sites');

// Akakçe XML çıktısı (30 dk önbellekli; ?refresh=1 ile zorla yenilenir)
// Site seçimi: ?site=lastikjantavm > X-Site/Host (req.site) > varsayılan
router.get('/', async (req, res) => {
    try {
        const querySite = (req.query.site || '').toString().trim().toLowerCase();
        const site = isValidSite(querySite) ? querySite : req.site;
        const { xml } = await generateFeed({ force: req.query.refresh === '1', site });
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.send(xml);
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

module.exports = router;
