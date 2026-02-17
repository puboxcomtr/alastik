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

        // Filtre oluştur
        const filter = {};

        // Sadece görünür markalar
        if (visible_only === 'true' || visible_only === '1') {
            filter.webVisible = true;
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

        // Sıralama
        const sortOptions = {};
        const validSortFields = ['name', 'productCount', 'totalStock', 'webOrder'];
        const sortField = validSortFields.includes(sort_by) ? sort_by : 'name';
        sortOptions[sortField] = sort_order === 'desc' ? -1 : 1;

        // Sayfalama
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Markaları getir
        const [brands, total] = await Promise.all([
            WebBrand.find(filter)
                .select('name slug diaBrand diaMarkaAck seoUrl seoTitle logo productCount activeProductCount totalStock webVisible webOrder')
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
                name: brand.diaBrand || brand.diaMarkaAck || brand.name,
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
            webVisible: true,
            showOnHomepage: true
        })
            .select('name diaBrand diaMarkaAck slug seoUrl logo productCount homepageOrder')
            .sort({ homepageOrder: 1, name: 1 })
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
                name: brand.diaBrand || brand.diaMarkaAck || brand.name,
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
            webVisible: true
        })
            .select('name diaBrand diaMarkaAck seoUrl seoTitle seoDescription description logo productCount activeProductCount totalStock priceRange categoryDistribution brandInfo')
            .lean();

        if (!brand) {
            return res.status(404).json({
                success: false,
                error: 'Marka bulunamadı'
            });
        }

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
                logo: formattedLogoUrl,
                logoAlt: brand.logo?.alt || `${brand.name} Logo`,
                description: brand.description,
                seoTitle: brand.seoTitle,
                seoDescription: brand.seoDescription,
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