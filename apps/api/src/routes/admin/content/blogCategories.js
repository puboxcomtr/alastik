const express = require('express');
const router = express.Router();
const BlogCategory = require('../../../models/admin/content/BlogCategory');
const { CARD_IMAGE_RATIOS } = BlogCategory;

function slugify(text) {
    return String(text || '')
        .toLowerCase()
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ı/g, 'i')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .trim();
}

router.get('/', async (req, res) => {
    try {
        const { search } = req.query;
        const query = { site: req.site };
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { slug: { $regex: search, $options: 'i' } }
            ];
        }
        const categories = await BlogCategory.find(query)
            .sort({ order: 1, name: 1 })
            .lean();
        res.json({ success: true, data: categories });
    } catch (error) {
        console.error('Blog kategori listesi hatası:', error);
        res.status(500).json({ success: false, message: 'Kategoriler listelenemedi' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const category = await BlogCategory.findOne({ _id: req.params.id, site: req.site }).lean();
        if (!category) {
            return res.status(404).json({ success: false, message: 'Kategori bulunamadı' });
        }
        res.json({ success: true, data: category });
    } catch (error) {
        console.error('Blog kategori detay hatası:', error);
        res.status(500).json({ success: false, message: 'Kategori detayı alınamadı' });
    }
});

router.post('/', async (req, res) => {
    try {
        const name = String(req.body.name || '').trim();
        if (!name) {
            return res.status(400).json({ success: false, message: 'Kategori adı zorunludur' });
        }
        const slug = slugify(req.body.slug || name);
        if (!slug) {
            return res.status(400).json({ success: false, message: 'Geçerli bir URL (slug) üretilemedi' });
        }

        if (req.body.cardImageRatio !== undefined && !CARD_IMAGE_RATIOS.includes(req.body.cardImageRatio)) {
            return res.status(400).json({ success: false, message: 'Geçersiz kart görseli oranı' });
        }

        const existing = await BlogCategory.findOne({ slug, site: req.site });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Bu URL zaten kullanılıyor' });
        }

        const category = new BlogCategory({
            site: req.site,
            name,
            slug,
            description: String(req.body.description || '').trim(),
            order: Number(req.body.order) || 0,
            status: req.body.status === 'passive' ? 'passive' : 'active',
            cardImageRatio: req.body.cardImageRatio || 'square',
            seo: {
                title: String(req.body.seo?.title || req.body.seoTitle || '').trim(),
                description: String(req.body.seo?.description || req.body.seoDescription || '').trim()
            }
        });
        await category.save();

        res.status(201).json({ success: true, message: 'Kategori oluşturuldu', data: category });
    } catch (error) {
        console.error('Blog kategori oluşturma hatası:', error);
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Bu URL zaten kullanılıyor' });
        }
        res.status(500).json({ success: false, message: error.message || 'Kategori oluşturulamadı' });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const update = {};
        if (req.body.name !== undefined) {
            const name = String(req.body.name).trim();
            if (!name) {
                return res.status(400).json({ success: false, message: 'Kategori adı zorunludur' });
            }
            update.name = name;
        }
        if (req.body.slug !== undefined || req.body.name !== undefined) {
            const slug = slugify(req.body.slug || req.body.name || '');
            if (!slug) {
                return res.status(400).json({ success: false, message: 'Geçerli bir URL (slug) üretilemedi' });
            }
            const clash = await BlogCategory.findOne({ slug, site: req.site, _id: { $ne: req.params.id } });
            if (clash) {
                return res.status(400).json({ success: false, message: 'Bu URL zaten kullanılıyor' });
            }
            update.slug = slug;
        }
        if (req.body.description !== undefined) update.description = String(req.body.description).trim();
        if (req.body.order !== undefined) update.order = Number(req.body.order) || 0;
        if (req.body.status !== undefined) update.status = req.body.status === 'passive' ? 'passive' : 'active';
        if (req.body.cardImageRatio !== undefined) {
            if (!CARD_IMAGE_RATIOS.includes(req.body.cardImageRatio)) {
                return res.status(400).json({ success: false, message: 'Geçersiz kart görseli oranı' });
            }
            update.cardImageRatio = req.body.cardImageRatio;
        }
        const seoTitle = req.body.seo?.title ?? req.body.seoTitle;
        const seoDesc = req.body.seo?.description ?? req.body.seoDescription;
        if (seoTitle !== undefined) update['seo.title'] = String(seoTitle).trim();
        if (seoDesc !== undefined) update['seo.description'] = String(seoDesc).trim();

        const category = await BlogCategory.findOneAndUpdate(
            { _id: req.params.id, site: req.site },
            update,
            { new: true, runValidators: true }
        );
        if (!category) {
            return res.status(404).json({ success: false, message: 'Kategori bulunamadı' });
        }
        res.json({ success: true, message: 'Kategori güncellendi', data: category });
    } catch (error) {
        console.error('Blog kategori güncelleme hatası:', error);
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Bu URL zaten kullanılıyor' });
        }
        res.status(500).json({ success: false, message: error.message || 'Kategori güncellenemedi' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const category = await BlogCategory.findOneAndDelete({ _id: req.params.id, site: req.site });
        if (!category) {
            return res.status(404).json({ success: false, message: 'Kategori bulunamadı' });
        }
        res.json({ success: true, message: 'Kategori silindi' });
    } catch (error) {
        console.error('Blog kategori silme hatası:', error);
        res.status(500).json({ success: false, message: error.message || 'Kategori silinemedi' });
    }
});

module.exports = router;
