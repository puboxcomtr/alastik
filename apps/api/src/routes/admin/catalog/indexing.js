const express = require('express');
const router = express.Router();
const { notifyUrl, notifyBatch, buildUrl } = require('../../../services/plugins/googleIndex/GoogleIndexingService');
const WebProduct = require('../../../models/web/catalog/WebProduct');
const WebBrand = require('../../../models/web/catalog/WebBrand');
const WebCategory = require('../../../models/web/catalog/WebCategory');
const WebTag = require('../../../models/web/catalog/WebTag');
// Tek URL
router.post('/notify', async (req, res) => {
    try {
        const { url, type = 'URL_UPDATED' } = req.body;
        if (!url) return res.status(400).json({ success: false, message: 'URL zorunludur' });

        const result = await notifyUrl(url, type);
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Tip bazlı toplu bildirim
router.post('/notify-all/:type', async (req, res) => {
    try {
        const { type } = req.params;
        const notifyType = req.body.type || 'URL_UPDATED';
        let urls = [];

        if (type === 'urun') {
            const products = await WebProduct.find({
                'customData.seoUrl': { $exists: true, $ne: null },
                'syncInfo.webStatus': 'active'
            }).select('customData.seoUrl');
            urls = products.map(p => buildUrl('urun', p.customData.seoUrl));

        } else if (type === 'marka') {
            const brands = await WebBrand.find({
                seoUrl: { $exists: true, $ne: null },
                webVisible: true
            }).select('seoUrl');
            urls = brands.map(b => buildUrl('marka', b.seoUrl));

        } else if (type === 'kategori') {
            const categories = await WebCategory.find({
                seoUrl: { $exists: true, $ne: null },
                webVisible: true
            }).select('seoUrl');
            urls = categories.map(c => buildUrl('kategori', c.seoUrl));

        } else if (type === 'etiket') {
            const tags = await WebTag.find({
                seoUrl: { $exists: true, $ne: null },
                isActive: true
            }).select('seoUrl');
            urls = tags.map(t => buildUrl('etiket', t.seoUrl));

        } else {
            return res.status(400).json({ success: false, message: 'Geçersiz tip' });
        }

        if (urls.length === 0) {
            return res.json({ success: true, message: 'Bildirilecek URL bulunamadı', results: [] });
        }

        const results = await notifyBatch(urls, notifyType);
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;

        res.json({ success: true, total: urls.length, successful, failed, results });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;