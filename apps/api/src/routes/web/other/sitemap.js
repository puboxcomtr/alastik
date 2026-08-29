const express = require('express');
const router = express.Router();
const WebProduct = require('../../../models/web/catalog/WebProduct');
const WebCategory = require('../../../models/web/catalog/WebCategory');
const Page = require('../../../models/admin/content/Page');
const Blog = require('../../../models/admin/content/Blog');
const WebTag = require('../../../models/web/catalog/WebTag');
const { getSiteVisibilityFilter } = require('../../../config/diaFilters');

// Sitemap üretimi için slug listeleri (site kapsamlı, hafif projeksiyonlar).
// 15 dakikalık süreçte bellek önbelleği — ürün sorgusu görece maliyetlidir.
const cache = new Map(); // `${site}:${type}` → { at, data }
const CACHE_TTL = 15 * 60 * 1000;

router.get('/:type', async (req, res) => {
    try {
        const { type } = req.params;
        const site = req.site || 'alastik';
        const cacheKey = `${site}:${type}`;

        const cached = cache.get(cacheKey);
        if (cached && Date.now() - cached.at < CACHE_TTL) {
            return res.json({ success: true, data: cached.data, cached: true });
        }

        let data;

        if (type === 'products') {
            const rows = await WebProduct.find({
                sites: site,
                'syncInfo.diaStatus': 'synced',
                $and: [getSiteVisibilityFilter(site)]
            }).select('customData.seoUrl _key updatedAt').lean();

            data = rows.map(r => ({
                slug: r.customData?.seoUrl || String(r._key),
                updatedAt: r.updatedAt
            }));
        } else if (type === 'categories') {
            const rows = await WebCategory.find({
                [`siteSettings.${site}.webVisible`]: true
            }).select('seoUrl slug updatedAt').lean();

            data = rows
                .map(r => ({ slug: r.seoUrl || r.slug, updatedAt: r.updatedAt }))
                .filter(r => r.slug);
        } else if (type === 'pages') {
            const rows = await Page.find({ site, status: 'published' })
                .select('slug updatedAt').lean();

            data = rows.map(r => ({ slug: r.slug, updatedAt: r.updatedAt }));
        } else if (type === 'blog') {
            const rows = await Blog.find({ site, status: 'published' })
                .select('slug updatedAt publishedAt').sort({ publishedAt: -1 }).lean();

            data = rows
                .map(r => ({ slug: r.slug, updatedAt: r.updatedAt || r.publishedAt }))
                .filter(r => r.slug);
        } else if (type === 'tags') {
            // Yalnızca ürünü olan aktif etiketler — boş etiket sayfaları ince içerik sayılır
            const rows = await WebTag.find({ site, isActive: true, productCount: { $gt: 0 } })
                .select('seoUrl updatedAt').sort({ order: 1 }).lean();

            data = rows
                .map(r => ({ slug: r.seoUrl, updatedAt: r.updatedAt }))
                .filter(r => r.slug);
        } else {
            return res.status(400).json({ success: false, message: 'Geçersiz sitemap tipi' });
        }

        cache.set(cacheKey, { at: Date.now(), data });
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Sitemap verisi üretilemedi', error: err.message });
    }
});

module.exports = router;
