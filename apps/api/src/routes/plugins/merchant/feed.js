const express = require('express');
const router = express.Router();
const { generateFeed } = require('../../../services/plugins/merchant/MerchantFeedService');
const { isValidSite } = require('../../../config/sites');

router.get('/', async (req, res) => {
    try {
        const querySite = (req.query.site || '').toString().trim().toLowerCase();
        const site = isValidSite(querySite) ? querySite : req.site;
        const { feed, format } = await generateFeed({ site });

        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename="merchant-feed.csv"');
        } else {
            res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        }

        res.send(feed);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;