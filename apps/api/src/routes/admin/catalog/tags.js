const express = require('express');
const router = express.Router();
const WebTag = require('../../../models/web/catalog/WebTag');
const WebProduct = require('../../../models/web/catalog/WebProduct');
const TagMatchingService = require('../../../services/web/products/TagMatching');
const { revalidateWebTag } = require('../../../utils/revalidateWeb');
const { authenticateAdmin } = require('../../../middleware/auth');

// Admin kimlik doğrulaması (DISABLE_AUTH=true ise dev ortamında atlanır)
const maybeAuth = process.env.DISABLE_AUTH === 'true'
    ? (req, res, next) => next()
    : authenticateAdmin;

router.use(maybeAuth);

/**
 * Etiket Listeleme -
 * GET /api/tags
 */

router.get('/', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            search,
            isActive,
            type,
            hasProducts,
            width,
            profile,
            rim,
            season,
            sortBy = 'order',
            sortOrder = 'asc'
        } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);

        const filter = { site: req.site };

        // Arama filtresi
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { seoUrl: { $regex: search, $options: 'i' } }
            ];
        }

        // Durum filtresi
        if (isActive !== undefined && isActive !== 'all') {
            filter.isActive = isActive === 'true';
        }

        // Tip filtresi
        if (type && type !== 'all') {
            filter.type = type;
        }

        // Ürün var/yok filtresi
        if (hasProducts === 'true') {
            filter.productCount = { $gt: 0 };
        } else if (hasProducts === 'false') {
            filter.$or = filter.$or || [];
            // $or zaten search'den varsa and ile birleştir
            if (search) {
                filter.$and = [
                    { $or: filter.$or },
                    { $or: [{ productCount: 0 }, { productCount: { $exists: false } }] }
                ];
                delete filter.$or;
            } else {
                filter.$or = [{ productCount: 0 }, { productCount: { $exists: false } }];
            }
        }

        // Genişlik filtresi (seoUrl'den: 205-xx-xx)
        if (width) {
            const widthFilter = { seoUrl: { $regex: `^${width}-`, $options: 'i' } };
            if (filter.$and) {
                filter.$and.push(widthFilter);
            } else if (filter.$or && search) {
                filter.$and = [{ $or: filter.$or }, widthFilter];
                delete filter.$or;
            } else {
                Object.assign(filter, widthFilter);
            }
        }

        // Yanak filtresi (seoUrl'den: xxx-55-xxx)
        if (profile) {
            const profileRegex = `^\\d{3}-${profile}-`;
            if (filter.seoUrl) {
                filter.$and = filter.$and || [];
                filter.$and.push({ seoUrl: filter.seoUrl });
                filter.$and.push({ seoUrl: { $regex: profileRegex, $options: 'i' } });
                delete filter.seoUrl;
            } else {
                filter.seoUrl = { ...(filter.seoUrl || {}), $regex: profileRegex, $options: 'i' };
            }
        }

        // Jant çapı filtresi (seoUrl'den: xxx-xx-r16 veya xxx-xx-16)
        if (rim) {
            const rimRegex = `^\\d{3}-\\d{2}-r?${rim}[-$]`;
            if (filter.$and) {
                filter.$and.push({ seoUrl: { $regex: rimRegex, $options: 'i' } });
            } else if (filter.seoUrl) {
                filter.$and = [
                    { seoUrl: filter.seoUrl },
                    { seoUrl: { $regex: rimRegex, $options: 'i' } }
                ];
                delete filter.seoUrl;
            } else {
                filter.seoUrl = { $regex: rimRegex, $options: 'i' };
            }
        }

        // Mevsim filtresi (seoUrl'den)
        if (season && season !== 'all') {
            let seasonRegex;
            if (season === 'yaz') seasonRegex = 'yaz';
            else if (season === 'kis') seasonRegex = 'kis';
            else if (season === '4-mevsim') seasonRegex = '4-mevsim';
            else if (season === 'none') seasonRegex = 'lastik-fiyatlari$';

            if (seasonRegex) {
                const seasonFilter = { seoUrl: { $regex: seasonRegex, $options: 'i' } };
                if (filter.$and) {
                    filter.$and.push(seasonFilter);
                } else {
                    filter.$and = filter.$and || [];
                    if (filter.seoUrl) {
                        filter.$and.push({ seoUrl: filter.seoUrl });
                        delete filter.seoUrl;
                    }
                    filter.$and.push(seasonFilter);
                    if (filter.$and.length === 1) {
                        Object.assign(filter, seasonFilter);
                        delete filter.$and;
                    }
                }
            }
        }

        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const [tags, count] = await Promise.all([
            WebTag.find(filter)
                .sort(sort)
                .limit(limitNum)
                .skip((pageNum - 1) * limitNum),
            WebTag.countDocuments(filter)
        ]);

        res.json({
            success: true,
            data: tags,
            meta: {
                total: count,
                page: pageNum,
                limit: limitNum,
                pages: Math.ceil(count / limitNum)
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
/**
 * Etiket Filtreleme -
 * GET /api/filter-options
 */
router.get('/filter-options', async (req, res) => {
    try {
        const tags = await WebTag.find(
            { site: req.site, type: 'tire_size', isActive: true },
            { seoUrl: 1 }
        ).lean();

        const widths = new Set();
        const profiles = new Set();
        const rims = new Set();

        for (const tag of tags) {
            const match = tag.seoUrl.match(/^(\d{3})-(\d{2})-r?(\d{2})/i);
            if (match) {
                widths.add(match[1]);
                profiles.add(match[2]);
                rims.add(match[3]);
            }
        }

        res.json({
            success: true,
            data: {
                widths: [...widths].sort((a, b) => Number(a) - Number(b)),
                profiles: [...profiles].sort((a, b) => Number(a) - Number(b)),
                rims: [...rims].sort((a, b) => Number(a) - Number(b))
            }
        });
    } catch (error) {
        console.error('Filtre seçenekleri hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Filtre seçenekleri yüklenirken hata oluştu',
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

        // SEO URL benzersizlik kontrolü (site içinde)
        if (finalSeoUrl) {
            const existing = await WebTag.findOne({ site: req.site, seoUrl: finalSeoUrl });
            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: 'Bu SEO URL bu sitede zaten kullanılıyor'
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
            site: req.site,
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

// Tüm etiketler için otomatik ürün eşleştirme
router.post('/matching/run', async (req, res) => {
    try {
        const { dryRun = false, tagType = null } = req.body;

        const results = await TagMatchingService.runMatching({ dryRun, tagType });

        res.json({
            success: true,
            message: dryRun
                ? `Dry run tamamlandı. ${results.matched} etiket eşleşti, ${results.skipped} atlandı.`
                : `${results.updated} etiket güncellendi, ${results.skipped} atlandı.`,
            data: {
                total: results.total,
                matched: results.matched,
                updated: results.updated,
                skipped: results.skipped,
                errors: results.errors,
                details: results.details
            }
        });
    } catch (error) {
        console.error('Tag matching hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Etiket eşleştirme sırasında hata oluştu',
            error: error.message
        });
    }
});

// Tek etiket için otomatik ürün eşleştirme
router.post('/:id/matching', async (req, res) => {
    try {
        const result = await TagMatchingService.matchSingleTag(req.params.id);

        res.json({
            success: true,
            message: result.status === 'matched'
                ? `${result.productCount} ürün eşleştirildi.`
                : `Etiket atlandı: ${result.reason}`,
            data: result
        });
    } catch (error) {
        console.error('Tek etiket matching hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Eşleştirme sırasında hata oluştu',
            error: error.message
        });
    }
});

// Etiket Detayı
router.get('/:id', async (req, res) => {
    try {
        const tag = await WebTag.findOne({ _id: req.params.id, site: req.site });

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

        const tag = await WebTag.findOne({ _id: req.params.id, site: req.site });

        if (!tag) {
            return res.status(404).json({
                success: false,
                message: 'Etiket bulunamadı'
            });
        }

        // SEO URL kontrolü (değiştiriliyorsa — etiketin kendi sitesi içinde)
        if (seoUrl && seoUrl !== tag.seoUrl) {
            const existing = await WebTag.findOne({ site: tag.site, seoUrl, _id: { $ne: req.params.id } });
            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: 'Bu SEO URL bu sitede zaten kullanılıyor'
                });
            }
        }

        // Eski slug'ı sakla (cache invalidate için)
        const oldSeoUrl = tag.seoUrl;

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

        // Web cache'ini temizle (fire-and-forget)
        if (oldSeoUrl) {
            revalidateWebTag(`tag-${oldSeoUrl}`).catch(() => { });
        }
        if (tag.seoUrl && tag.seoUrl !== oldSeoUrl) {
            revalidateWebTag(`tag-${tag.seoUrl}`).catch(() => { });
        }

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
        const tag = await WebTag.findOneAndDelete({ _id: req.params.id, site: req.site });

        if (!tag) {
            return res.status(404).json({
                success: false,
                message: 'Etiket bulunamadı'
            });
        }

        // Web cache'ini temizle (fire-and-forget)
        if (tag.seoUrl) {
            revalidateWebTag(`tag-${tag.seoUrl}`).catch(() => { });
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

        const tag = await WebTag.findOne({ _id: req.params.id, site: req.site });

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
        const tag = await WebTag.findOne({ _id: req.params.id, site: req.site });

        if (!tag) {
            return res.status(404).json({
                success: false,
                message: 'Etiket bulunamadı'
            });
        }

        const filter = {
            _id: { $nin: tag.products }, // Zaten eklenmiş ürünleri hariç tut
            'syncInfo.diaStatus': 'synced',
            'diaData.durum': 'A',
            sites: req.site
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
        const tag = await WebTag.findOne({ _id: req.params.id, site: req.site });

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