const express = require('express');
const router = express.Router();
const WebPage = require('../../../models/web/content/WebPage');

router.get('/:slug', async (req, res) => {
    try {
        const { slug } = req.params;

        const page = await WebPage.findOneAndUpdate(
            { site: req.site, slug, status: 'published' },
            { $inc: { viewCount: 1 } },
            { new: true }
        ).lean();

        if (!page) {
            return res.status(404).json({ success: false, message: 'Sayfa bulunamadı' });
        }

        res.json({ success: true, data: page });
    } catch (error) {
        console.error('Page detail error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;