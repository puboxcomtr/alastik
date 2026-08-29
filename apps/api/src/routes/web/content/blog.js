const express = require('express');
const router = express.Router();
const WebBlog = require('../../../models/web/content/WebBlog');

// Pattern'e göre blogları getir (ürün detay için)
router.get('/by-pattern/:pattern', async (req, res) => {
    try {
        const { pattern } = req.params;

        if (!pattern) {
            return res.status(400).json({ success: false, message: 'Pattern gerekli' });
        }

        const blogs = await WebBlog.findByPattern(pattern);

        res.json({ success: true, data: blogs });
    } catch (error) {
        console.error('Blog by pattern error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
// Anasayfa blogları
router.get('/homepage', async (req, res) => {
    try {
        const HOMEPAGE_BLOG_COUNT = 5;
        const fields = 'title slug excerpt publishedAt viewCount featuredImage tags';
        const blogs = await WebBlog.find({ site: req.site, status: 'published', showOnHomepage: true })
            .select(fields)
            .sort({ publishedAt: -1 })
            .limit(HOMEPAGE_BLOG_COUNT)
            .lean();

        // Anasayfa için işaretli yazı sayısı yetersizse en güncel yayınlanmış yazılarla tamamlanır
        if (blogs.length < HOMEPAGE_BLOG_COUNT) {
            const fillers = await WebBlog.find({
                site: req.site,
                status: 'published',
                _id: { $nin: blogs.map(b => b._id) }
            })
                .select(fields)
                .sort({ publishedAt: -1 })
                .limit(HOMEPAGE_BLOG_COUNT - blogs.length)
                .lean();
            blogs.push(...fillers);
        }

        res.json({ success: true, data: blogs });
    } catch (error) {
        console.error('Homepage blogs error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
// Tüm blogları listele
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 10, status = 'published', tag } = req.query;

        const filter = { site: req.site, status };
        if (tag) filter.tags = tag;

        const blogs = await WebBlog.find(filter)
            .select('title slug excerpt publishedAt viewCount featuredImage tags')
            .sort({ publishedAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await WebBlog.countDocuments(filter);

        res.json({
            success: true,
            data: {
                blogs,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Blogs list error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Slug'a göre blog detay
router.get('/:slug', async (req, res) => {
    try {
        const { slug } = req.params;

        const blog = await WebBlog.findOneAndUpdate(
            { slug, status: 'published' },
            { $inc: { viewCount: 1 } },
            { new: true }
        );

        if (!blog) {
            return res.status(404).json({ success: false, message: 'Blog bulunamadı' });
        }

        res.json({ success: true, data: blog });
    } catch (error) {
        console.error('Blog detail error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;