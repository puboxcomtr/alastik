const express = require('express');
const router = express.Router();
const { generateFeed } = require('../../../services/plugins/merchant/MerchantFeedService');

router.get('/', async (req, res) => {
    try {
        const { feed, format, count } = await generateFeed();

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