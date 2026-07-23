const express = require('express');
const router = express.Router();
const Blog = require('../../../models/admin/content/Blog');

// GET /api/admin/blogs
router.get('/', async (req, res) => {
    try {
        const { search, status } = req.query;
        const query = { site: req.site };

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { slug: { $regex: search, $options: 'i' } }
            ];
        }

        if (status) {
            query.status = status;
        }

        const blogs = await Blog.find(query)
            .sort({ createdAt: -1 })
            .lean();

        res.json({
            success: true,
            data: blogs
        });

    } catch (error) {
        console.error('Blog listesi hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Bloglar listelenemedi'
        });
    }
});

// Blog Öne Çıkarılmış Görsel Ekle
router.put('/:id/image', async (req, res) => {
    try {
        const { id } = req.params;
        const { featuredImage } = req.body;

        const blog = await Blog.findOneAndUpdate(
            { _id: id, site: req.site },
            { featuredImage },
            { new: true }
        );

        if (!blog) {
            return res.status(404).json({ success: false, message: 'Blog bulunamadı' });
        }

        res.json({ success: true, data: blog });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Blog Öne Çıkarılmış Görsel Sil
router.delete('/:id/image', async (req, res) => {
    try {
        const { id } = req.params;

        const blog = await Blog.findOneAndUpdate(
            { _id: id, site: req.site },
            { featuredImage: '' },
            { new: true }
        );

        if (!blog) {
            return res.status(404).json({ success: false, message: 'Blog bulunamadı' });
        }

        res.json({ success: true, data: blog });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/admin/blogs/:id
router.get('/:id', async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id).lean();

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: 'Blog bulunamadı'
            });
        }

        res.json({
            success: true,
            data: blog
        });

    } catch (error) {
        console.error('Blog detay hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Blog detayı alınamadı'
        });
    }
});

// POST /api/admin/blogs
router.post('/', async (req, res) => {
    try {
        const existingBlog = await Blog.findOne({ slug: req.body.slug, site: req.site });
        if (existingBlog) {
            return res.status(400).json({
                success: false,
                message: 'Bu URL zaten kullanılıyor'
            });
        }

        const blog = new Blog({ ...req.body, site: req.site });
        await blog.save();

        res.status(201).json({
            success: true,
            message: 'Blog oluşturuldu',
            data: blog
        });

    } catch (error) {
        console.error('Blog oluşturma hatası:', error);

        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Bu URL zaten kullanılıyor'
            });
        }

        res.status(500).json({
            success: false,
            message: error.message || 'Blog oluşturulamadı'
        });
    }
});

// PUT /api/admin/blogs/:id
router.put('/:id', async (req, res) => {
    try {
        if (req.body.slug) {
            const existingBlog = await Blog.findOne({
                slug: req.body.slug,
                site: req.site,
                _id: { $ne: req.params.id }
            });

            if (existingBlog) {
                return res.status(400).json({
                    success: false,
                    message: 'Bu URL zaten başka bir blog tarafından kullanılıyor'
                });
            }
        }

        const blog = await Blog.findOneAndUpdate(
            { _id: req.params.id, site: req.site },
            req.body,
            { new: true, runValidators: true }
        );

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: 'Blog bulunamadı'
            });
        }

        res.json({
            success: true,
            message: 'Blog güncellendi',
            data: blog
        });

    } catch (error) {
        console.error('Blog güncelleme hatası:', error);

        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Bu URL zaten kullanılıyor'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Blog güncellenemedi'
        });
    }
});

// DELETE /api/admin/blogs/:id
router.delete('/:id', async (req, res) => {
    try {
        const blog = await Blog.findOneAndDelete({ _id: req.params.id, site: req.site });

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: 'Blog bulunamadı'
            });
        }

        res.json({
            success: true,
            message: 'Blog silindi'
        });

    } catch (error) {
        console.error('Blog silme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Blog silinemedi'
        });
    }
});

module.exports = router;