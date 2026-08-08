// apps/api/src/routes/web/catalog/brands.js
const express = require('express');
const router = express.Router();
const WebBrand = require('../../../models/web/catalog/WebBrand');

/**
 * GET /api/brands
 * TÜM MARKALARI LİSTELE - Frontend için (Public)
 */
router.get('/', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 500,
            search,
            visible_only = 'true',
            sort_by = 'name',
            sort_order = 'asc',
            has_logo,
            min_products
        } = req.query;

        // Filtre oluştur (görünürlük ziyaret edilen siteye göre)
        const filter = {};

        // Sadece görünür markalar (sitede yayınlanmış ürünü olmayan marka otomatik gizlenir)
        if (visible_only === 'true' || visible_only === '1') {
            filter[`siteSettings.${req.site}.webVisible`] = true;
            filter[`siteSettings.${req.site}.productCount`] = { $gt: 0 };
        }

        // Arama
        if (search && search.trim() !== '') {
            const searchTerm = search.trim();
            filter.$or = [
                { name: { $regex: searchTerm, $options: 'i' } },
                { diaBrand: { $regex: searchTerm, $options: 'i' } },
                { diaMarkaAck: { $regex: searchTerm, $options: 'i' } }
            ];
        }

        // Logo varlığı
        if (has_logo === 'true') {
            filter['logo.url'] = { $exists: true, $ne: null, $ne: '' };
        }

        // Minimum ürün sayısı
        if (min_products && !isNaN(min_products)) {
            filter.productCount = { $gte: parseInt(min_products) };
        }

        // Sıralama (webOrder site bazlı alandan okunur)
        const sortOptions = {};
        const validSortFields = ['name', 'productCount', 'totalStock', 'webOrder'];
        const sortField = validSortFields.includes(sort_by) ? sort_by : 'name';
        const resolvedSortField = sortField === 'webOrder' ? `siteSettings.${req.site}.webOrder` : sortField;
        sortOptions[resolvedSortField] = sort_order === 'desc' ? -1 : 1;

        // Sayfalama
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Markaları getir
        const [brands, total] = await Promise.all([
            WebBrand.find(filter)
                .select('name slug diaBrand diaMarkaAck customName seoUrl seoTitle logo productCount activeProductCount totalStock webVisible webOrder')
                .sort(sortOptions)
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            WebBrand.countDocuments(filter)
        ]);

        // Frontend formatına dönüştür
        const formattedBrands = brands.map(brand => {
            const logoUrl = brand.logo?.url;
            let formattedLogoUrl = '/images/urun/gorsel-bulunamadi.jpg';

            if (logoUrl) {
                if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) {
                    formattedLogoUrl = logoUrl;
                } else if (logoUrl.startsWith('/marka/')) {
                    formattedLogoUrl = logoUrl;
                } else if (logoUrl.startsWith('/')) {
                    formattedLogoUrl = logoUrl;
                } else {
                    formattedLogoUrl = `/marka/${logoUrl}`;
                }
            }

            return {
                _id: brand._id,
                name: brand.customName || brand.diaBrand || brand.diaMarkaAck || brand.name,
                diaBrand: brand.diaBrand,
                slug: brand.seoUrl || brand.slug,
                seoUrl: brand.seoUrl || brand.slug,
                logo: formattedLogoUrl,
                logoAlt: brand.logo?.alt || `${brand.name} Logo`,
                productCount: brand.productCount || 0
            };
        });

        res.json({
            success: true,
            data: formattedBrands,
            brands: formattedBrands,
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit)),
                hasNextPage: skip + brands.length < total,
                hasPrevPage: parseInt(page) > 1
            }
        });

    } catch (error) {
        console.error('Marka listesi hatası:', error);
        res.status(500).json({
            success: false,
            error: 'Markalar yüklenirken bir hata oluştu',
            message: error.message
        });
    }
});

/**
 * GET /api/brands/homepage
 * Anasayfada gösterilecek markaları getirir
 */
router.get('/homepage', async (req, res) => {
    try {
        const brands = await WebBrand.find({
            [`siteSettings.${req.site}.webVisible`]: true,
            [`siteSettings.${req.site}.showOnHomepage`]: true,
            [`siteSettings.${req.site}.productCount`]: { $gt: 0 }
        })
            .select('name diaBrand diaMarkaAck customName slug seoUrl logo productCount siteSettings')
            .sort({ [`siteSettings.${req.site}.homepageOrder`]: 1, name: 1 })
            .lean();

        const formattedBrands = brands.map(brand => {
            const logoUrl = brand.logo?.url;
            let formattedLogoUrl = null;

            if (logoUrl) {
                if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) {
                    formattedLogoUrl = logoUrl;
                } else if (logoUrl.startsWith('/marka/')) {
                    formattedLogoUrl = logoUrl;
                } else {
                    formattedLogoUrl = `/marka/${logoUrl}`;
                }
            }

            return {
                _id: brand._id,
                name: brand.customName || brand.diaBrand || brand.diaMarkaAck || brand.name,
                slug: brand.seoUrl || brand.slug,
                logo: formattedLogoUrl,
                logoAlt: brand.logo?.alt || `${brand.name} Logo`,
                productCount: brand.productCount || 0
            };
        });

        res.json({
            success: true,
            data: formattedBrands,
            count: formattedBrands.length
        });

    } catch (error) {
        console.error('Homepage brands error:', error);
        res.status(500).json({
            success: false,
            message: 'Markalar yüklenirken hata oluştu',
            error: error.message
        });
    }
});

/**
 * GET /api/brands/:slug
 * Tekil marka detayı - Frontend için
 */
router.get('/:slug', async (req, res) => {
    try {
        const { slug } = req.params;

        const brand = await WebBrand.findOne({
            $or: [
                { seoUrl: slug },
                { slug: slug },
                { diaBrand: { $regex: new RegExp(`^${slug}$`, 'i') } },
                { diaMarkaAck: { $regex: new RegExp(`^${slug}$`, 'i') } },
                { name: { $regex: new RegExp(`^${slug}$`, 'i') } }
            ],
            [`siteSettings.${req.site}.webVisible`]: true,
            [`siteSettings.${req.site}.productCount`]: { $gt: 0 }
        })
            .select('name slug diaBrand diaMarkaAck seoUrl seoTitle seoDescription description siteContent logo productCount activeProductCount totalStock priceRange categoryDistribution brandInfo')
            .lean();

        if (!brand) {
            return res.status(404).json({
                success: false,
                error: 'Marka bulunamadı'
            });
        }

        // Sitenin kendi içerik/SEO metinleri (yoksa ortak alanlar)
        const sc = brand.siteContent?.[req.site] || {};

        // Logo URL düzenleme
        const logoUrl = brand.logo?.url;
        let formattedLogoUrl = null;

        if (logoUrl) {
            if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) {
                formattedLogoUrl = logoUrl;
            } else if (logoUrl.startsWith('/marka/')) {
                formattedLogoUrl = logoUrl;
            } else {
                formattedLogoUrl = `/marka/${logoUrl}`;
            }
        }

        res.json({
            success: true,
            data: {
                name: brand.diaBrand || brand.diaMarkaAck || brand.name,
                slug: brand.seoUrl || brand.slug,
                diaBrand: brand.diaBrand,
                diaMarkaAck: brand.diaMarkaAck,
                logo: formattedLogoUrl,
                logoAlt: brand.logo?.alt || `${brand.name} Logo`,
                description: sc.description || brand.description,
                seoTitle: sc.seoTitle || brand.seoTitle,
                seoDescription: sc.seoDescription || brand.seoDescription,
                productCount: brand.productCount || 0,
                activeProductCount: brand.activeProductCount || 0,
                totalStock: brand.totalStock || 0,
                priceRange: brand.priceRange,
                categoryDistribution: brand.categoryDistribution,
                brandInfo: brand.brandInfo,
                visible: brand.webVisible !== false
            }
        });

    } catch (error) {
        console.error('Marka detay hatası:', error);
        res.status(500).json({
            success: false,
            error: 'Marka detayı yüklenirken bir hata oluştu',
            message: error.message
        });
    }
});

module.exports = router;