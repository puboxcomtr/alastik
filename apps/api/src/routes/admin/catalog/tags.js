const express = require('express');
const router = express.Router();
const WebTag = require('../../../models/WebTag');
const WebProduct = require('../../../models/WebProduct');

/**
 * Etiket Listeleme -
 * GET /api/tags
 */
router.get('/', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search,
            isActive,
            sortBy = 'order',
            sortOrder = 'asc'
        } = req.query;

        const filter = {};

        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { seoUrl: { $regex: search, $options: 'i' } }
            ];
        }

        if (isActive !== undefined) {
            filter.isActive = isActive === 'true';
        }

        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const tags = await WebTag.find(filter)
            .sort(sort)
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await WebTag.countDocuments(filter);

        res.json({
            success: true,
            data: tags,
            pagination: {
                total: count,
                page: parseInt(page),
                pages: Math.ceil(count / limit)
            }
        });

    } catch (error) {
        console.error('Etiket listesi hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Etiketler yüklenirken hata oluştu',
            error: error.message
        });
    }
});

// Yeni Etiket Oluşturma
router.post('/', async (req, res) => {
    try {
        const { title, description, seoTitle, seoDescription, seoUrl, isActive, order, products } = req.body;

        if (!title) {
            return res.status(400).json({
                success: false,
                message: 'Başlık alanı zorunludur'
            });
        }

        // SEO URL boş mu kontrol et
        let finalSeoUrl = seoUrl && seoUrl.trim() !== '' ? seoUrl.trim() : null;

        // Eğer SEO URL yoksa, title'dan otomatik oluştur
        if (!finalSeoUrl && title) {
            finalSeoUrl = title
                .toLowerCase()
                .replace(/ş/g, 's')
                .replace(/ğ/g, 'g')
                .replace(/ü/g, 'u')
                .replace(/ı/g, 'i')
                .replace(/ö/g, 'o')
                .replace(/ç/g, 'c')
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .trim('-');
        }

        // SEO URL benzersizlik kontrolü
        if (finalSeoUrl) {
            const existing = await WebTag.findOne({ seoUrl: finalSeoUrl });
            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: 'Bu SEO URL zaten kullanılıyor'
                });
            }
        }

        // Products array'ini düzenle - string ise parse et
        let productArray = [];
        if (products) {
            if (Array.isArray(products)) {
                productArray = products;
            } else if (typeof products === 'string') {
                try {
                    productArray = JSON.parse(products);
                } catch (e) {
                    console.error('Products parse hatası:', e);
                }
            }
        }

        const tag = new WebTag({
            title,
            description,
            seoTitle,
            seoDescription,
            seoUrl: finalSeoUrl,
            isActive: isActive !== undefined ? isActive : true,
            order: order || 0,
            products: productArray,
            productCount: productArray.length
        });

        await tag.save();

        res.status(201).json({
            success: true,
            message: 'Etiket başarıyla oluşturuldu',
            data: tag
        });

    } catch (error) {
        console.error('Etiket oluşturma hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Etiket oluşturulurken hata oluştu',
            error: error.message
        });
    }
});

// Etiket Detayı
router.get('/:id', async (req, res) => {
    try {
        const tag = await WebTag.findById(req.params.id);

        if (!tag) {
            return res.status(404).json({
                success: false,
                message: 'Etiket bulunamadı'
            });
        }

        // Ürünleri _key ile çek (ObjectId validasyonu yapma)
        let populatedProducts = [];
        if (tag.products && tag.products.length > 0) {
            const products = await WebProduct.find({
                _key: { $in: tag.products }  // Tüm products array'ini kullan
            })
                .select('_key diaData.aciklama diaData.stokkartkodu diaData.marka diaData.gercek_stok customData.webPrice')
                .lean();

            // Frontend için formatla
            populatedProducts = products.map(p => ({
                id: p._key,
                name: p.diaData?.aciklama || 'N/A',
                sku: p.diaData?.stokkartkodu || 'N/A',
                brand: p.diaData?.marka || 'N/A',
                qty: p.diaData?.gercek_stok || 0,
                diaData: p.diaData
            }));
        }

        const tagObject = tag.toObject();
        tagObject.products = populatedProducts;

        res.json({
            success: true,
            data: tagObject
        });

    } catch (error) {
        console.error('Etiket detay hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Etiket yüklenirken hata oluştu',
            error: error.message
        });
    }
});

// Etiket Güncelleme
router.put('/:id', async (req, res) => {
    try {
        const { title, description, seoTitle, seoDescription, seoUrl, isActive, order, products } = req.body;

        const tag = await WebTag.findById(req.params.id);

        if (!tag) {
            return res.status(404).json({
                success: false,
                message: 'Etiket bulunamadı'
            });
        }

        // SEO URL kontrolü (değiştiriliyorsa)
        if (seoUrl && seoUrl !== tag.seoUrl) {
            const existing = await WebTag.findOne({ seoUrl, _id: { $ne: req.params.id } });
            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: 'Bu SEO URL zaten kullanılıyor'
                });
            }
        }

        if (title) tag.title = title;
        if (description !== undefined) tag.description = description;
        if (seoTitle !== undefined) tag.seoTitle = seoTitle;
        if (seoDescription !== undefined) tag.seoDescription = seoDescription;
        if (seoUrl) tag.seoUrl = seoUrl;
        if (isActive !== undefined) tag.isActive = isActive;
        if (order !== undefined) tag.order = order;

        // Products array'i güncelle
        if (products !== undefined && Array.isArray(products)) {
            tag.products = products;
            tag.productCount = products.length;
        }

        await tag.save();

        res.json({
            success: true,
            message: 'Etiket başarıyla güncellendi',
            data: tag
        });

    } catch (error) {
        console.error('Etiket güncelleme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Etiket güncellenirken hata oluştu',
            error: error.message
        });
    }
});

// Etiket Silme
router.delete('/:id', async (req, res) => {
    try {
        const tag = await WebTag.findByIdAndDelete(req.params.id);

        if (!tag) {
            return res.status(404).json({
                success: false,
                message: 'Etiket bulunamadı'
            });
        }

        res.json({
            success: true,
            message: 'Etiket başarıyla silindi'
        });

    } catch (error) {
        console.error('Etiket silme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Etiket silinirken hata oluştu',
            error: error.message
        });
    }
});

// Etikete Ürün Ekleme/Çıkarma
router.post('/:id/products', async (req, res) => {
    try {
        const { productIds, action } = req.body; // action: 'add' veya 'remove'

        if (!productIds || !Array.isArray(productIds)) {
            return res.status(400).json({
                success: false,
                message: 'Ürün ID listesi gerekli'
            });
        }

        const tag = await WebTag.findById(req.params.id);

        if (!tag) {
            return res.status(404).json({
                success: false,
                message: 'Etiket bulunamadı'
            });
        }

        if (action === 'add') {
            // Ürünleri ekle (duplicate kontrolü ile)
            productIds.forEach(productId => {
                if (!tag.products.includes(productId)) {
                    tag.products.push(productId);
                }
            });
        } else if (action === 'remove') {
            // Ürünleri çıkar
            tag.products = tag.products.filter(
                productId => !productIds.includes(productId.toString())
            );
        } else {
            return res.status(400).json({
                success: false,
                message: 'Geçersiz işlem (add veya remove olmalı)'
            });
        }

        await tag.save();

        res.json({
            success: true,
            message: action === 'add' ? 'Ürünler etikete eklendi' : 'Ürünler etiketten çıkarıldı',
            data: tag
        });

    } catch (error) {
        console.error('Ürün ekleme/çıkarma hatası:', error);
        res.status(500).json({
            success: false,
            message: 'İşlem sırasında hata oluştu',
            error: error.message
        });
    }
});

// Etiket için uygun ürünleri arama
router.get('/:id/available-products', async (req, res) => {
    try {
        const { search, page = 1, limit = 20 } = req.query;
        const tag = await WebTag.findById(req.params.id);

        if (!tag) {
            return res.status(404).json({
                success: false,
                message: 'Etiket bulunamadı'
            });
        }

        const filter = {
            _id: { $nin: tag.products }, // Zaten eklenmiş ürünleri hariç tut
            'syncInfo.diaStatus': 'synced',
            'diaData.durum': 'A'
        };

        if (search) {
            filter.$or = [
                { 'diaData.aciklama': { $regex: search, $options: 'i' } },
                { 'diaData.stokkartkodu': { $regex: search, $options: 'i' } },
                { 'diaData.marka': { $regex: search, $options: 'i' } }
            ];
        }

        const products = await WebProduct.find(filter)
            .select('diaData.aciklama diaData.stokkartkodu diaData.marka diaData.gercek_stok customData.webPrice')
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await WebProduct.countDocuments(filter);

        res.json({
            success: true,
            data: products,
            pagination: {
                total: count,
                page: parseInt(page),
                pages: Math.ceil(count / limit)
            }
        });

    } catch (error) {
        console.error('Uygun ürünler arama hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Ürünler yüklenirken hata oluştu',
            error: error.message
        });
    }
});

// GEÇİCİ: Geçersiz ID'leri temizle
router.get('/:id/clean', async (req, res) => {
    try {
        const mongoose = require('mongoose');
        const tag = await WebTag.findById(req.params.id);

        if (!tag) {
            return res.status(404).json({ success: false, message: 'Etiket bulunamadı' });
        }

        const before = tag.products.length;

        // Sadece geçerli ObjectId'leri tut
        tag.products = tag.products.filter(id => mongoose.Types.ObjectId.isValid(id));
        tag.productCount = tag.products.length;

        await tag.save();

        res.json({
            success: true,
            message: `${before} üründen ${tag.products.length} geçerli ürün kaldı. ${before - tag.products.length} geçersiz ID temizlendi.`
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;