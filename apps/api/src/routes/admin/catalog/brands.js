// ============================================
// DEPENDENCIES
// ============================================
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const MediaService = require('../../../services/web/MediaService');

// ============================================
// MODELS
// ============================================
// DIA ERP stock model (raw data from ERP system)
const DiaStock = require('../../../models/plugins/DiaStock');

// Web product model (for brand statistics)
const WebProduct = require('../../../models/web/catalog/WebProduct');

// Web category model (for brand-category relations)
const WebCategory = require('../../../models/web/catalog/WebCategory');

// Web brand model (synced and enhanced version for frontend)
const WebBrand = require('../../../models/web/catalog/WebBrand');

// ============================================
// MIDDLEWARE
// ============================================
// Authentication middleware for admin routes
const { authenticateAdmin } = require('../../../middleware/auth');

// Request validation middleware
const { body, validationResult } = require('express-validator');

// ============================================
// SERVICES
// ============================================
// DIA ERP integration service
const DiaStockService = require('../../../services/plugins/dia/DiaStockService');

// ============================================
// MULTER CONFIG - Marka Logo Upload
// ============================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../../../public/marka');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Benzersiz dosya adı: marka-slug-timestamp.ext
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `brand-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Sadece resim dosyaları yüklenebilir (jpeg, jpg, png, gif, webp, svg)'));
    }
});

// ============================================
// ROUTER INITIALIZATION
// ============================================
const router = express.Router();

// ============================================
// AUTHENTICATION STRATEGY
// ============================================
// Conditional authentication based on environment
// - Development (DISABLE_AUTH=true): Bypasses authentication for easier testing
// - Production (DISABLE_AUTH=false): Enforces admin authentication
const maybeAuth = process.env.DISABLE_AUTH === 'true'
    ? (req, res, next) => next()
    : authenticateAdmin;
// Multer uploader

const uploadLogo = MediaService.createUploader('brand', 'logo');

/**
 * Marka Listeleme - WebBrand Collection'dan
 * GET /api/brands
 */
router.get('/', maybeAuth, async (req, res) => {
    try {
        const {
            search,
            web_status,
            visible_only = 'true',
            sort_by = 'name',
            sort_order = 'asc',
            min_products,
            max_products,
            has_logo
        } = req.query;

        // WebBrand filtreleri (görünürlük/sıralama seçili siteye göre)
        const siteVisibleField = `siteSettings.${req.site}.webVisible`;
        const siteOrderField = `siteSettings.${req.site}.webOrder`;
        const webFilter = {};

        // Web durumu filtreleme (ürün sayısı seçili sitenin yayın durumuna göre)
        const siteCountField = `siteSettings.${req.site}.productCount`;

        // Sadece görünür markalar mı? (seçili sitede yayınlanmış ürünü olmayan marka listelenmez;
        // görmek için "Boş" durum filtresi kullanılır)
        if (visible_only === 'true') {
            webFilter[siteVisibleField] = true;
            webFilter[siteCountField] = { $gt: 0 };
        }
        if (web_status && web_status.trim() !== '') {
            if (web_status.trim() === 'active') {
                webFilter[siteVisibleField] = true;
                webFilter[siteCountField] = { $gt: 0 };
            } else if (web_status.trim() === 'hidden') {
                webFilter[siteVisibleField] = false;
            } else if (web_status.trim() === 'empty') {
                webFilter[siteCountField] = 0;
            }
        }

        // Ürün sayısı filtreleme
        if (min_products && !isNaN(min_products)) {
            webFilter.productCount = { ...webFilter.productCount, $gte: parseInt(min_products) };
        }
        if (max_products && !isNaN(max_products)) {
            webFilter.productCount = { ...webFilter.productCount, $lte: parseInt(max_products) };
        }

        // Logo varlığı filtreleme
        if (has_logo === 'true') {
            webFilter['logo.url'] = { $exists: true, $ne: null, $ne: '' };
        } else if (has_logo === 'false') {
            webFilter.$or = [
                { 'logo.url': { $exists: false } },
                { 'logo.url': null },
                { 'logo.url': '' }
            ];
        }

        if (search && search.trim() !== '') {
            const searchTerm = search.trim();
            webFilter.$or = [
                { name: { $regex: searchTerm, $options: 'i' } },
                { diaBrand: { $regex: searchTerm, $options: 'i' } },
                { seoTitle: { $regex: searchTerm, $options: 'i' } }
            ];
        }

        const sortOptions = {};
        const validSortFields = ['name', 'productCount', 'totalStock', 'createdAt', 'webOrder'];
        const sortField = validSortFields.includes(sort_by) ? sort_by : 'name';
        const resolvedSortField = sortField === 'webOrder' ? siteOrderField : sortField;
        sortOptions[resolvedSortField] = sort_order === 'desc' ? -1 : 1;

        const brands = await WebBrand.find(webFilter)
            .select({
                name: 1,
                slug: 1,
                diaBrand: 1,
                diaMarkaAck: 1,
                diaKey: 1,
                webVisible: 1,
                webOrder: 1,
                showOnHomepage: 1,
                homepageOrder: 1,
                siteSettings: 1,
                siteContent: 1,
                seoTitle: 1,
                seoDescription: 1,
                seoUrl: 1,
                seoKeywords: 1,
                description: 1,
                logo: 1,
                bannerImage: 1,
                customImage: 1,
                brandInfo: 1,
                productCount: 1,
                activeProductCount: 1,
                totalStock: 1,
                totalValue: 1,
                priceRange: 1,
                categoryDistribution: 1,
                'syncInfo.lastSync': 1,
                'syncInfo.syncStatus': 1,
                'syncInfo.lastDiaSync': 1,
                'syncInfo.lastProductSync': 1,
                createdAt: 1,
                updatedAt: 1
            })
            .sort(sortOptions)
            .lean();

        // Response formatı
        const formattedBrands = brands.map(brand => {
            // Seçili sitenin ayarları (eski ortak alanlar yedek)
            const siteSet = brand.siteSettings?.[req.site] || {};
            const siteVisible = siteSet.webVisible !== undefined ? siteSet.webVisible : brand.webVisible;
            const siteOrder = siteSet.webOrder !== undefined ? siteSet.webOrder : (brand.webOrder || 0);
            const siteShowOnHomepage = siteSet.showOnHomepage !== undefined ? siteSet.showOnHomepage : (brand.showOnHomepage || false);
            const siteHomepageOrder = siteSet.homepageOrder !== undefined ? siteSet.homepageOrder : (brand.homepageOrder || 0);
            const siteProductCount = siteSet.productCount !== undefined ? siteSet.productCount : (brand.productCount || 0);

            // Seçili sitenin içerik/SEO metinleri (yoksa ortak alanlar)
            const sc = brand.siteContent?.[req.site] || {};

            let webStatus = 'Inactive';
            if (siteVisible && siteProductCount > 0) {
                webStatus = 'Active';
            } else if (siteVisible && siteProductCount === 0) {
                webStatus = 'Empty';
            } else if (!siteVisible) {
                webStatus = 'Hidden';
            }

            const categoryText = brand.categoryDistribution && brand.categoryDistribution.length > 0
                ? brand.categoryDistribution.map(cat => `${cat.categoryName} (${cat.productCount})`).join(', ')
                : 'Kategori yok';

            const avgPrice = brand.priceRange?.average || 0;
            const formattedAvgPrice = avgPrice > 0 ? `₺${avgPrice.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}` : '₺0';

            const minPrice = brand.priceRange?.min || 0;
            const maxPrice = brand.priceRange?.max || 0;
            const priceRangeText = minPrice > 0 && maxPrice > 0
                ? `₺${minPrice.toLocaleString('tr-TR')} - ₺${maxPrice.toLocaleString('tr-TR')}`
                : 'Fiyat bilgisi yok';

            return {
                id: brand._id,
                name: brand.name,
                slug: brand.slug,

                // DIA bağlantısı
                diaBrand: brand.diaBrand,
                diaMarkaAck: brand.diaMarkaAck,
                diaKey: brand.diaKey,

                // Web yönetimi (seçili site)
                webVisible: siteVisible,
                webOrder: siteOrder,
                status: webStatus,

                // Anasayfa Gösterimi (seçili site)
                showOnHomepage: siteShowOnHomepage,
                homepageOrder: siteHomepageOrder,

                // SEO (seçili site öncelikli)
                seoTitle: sc.seoTitle || brand.seoTitle || brand.name,
                seoDescription: sc.seoDescription || brand.seoDescription || `${brand.name} markası ürünleri`,
                seoUrl: brand.seoUrl || brand.slug,
                seoKeywords: (sc.seoKeywords && sc.seoKeywords.length ? sc.seoKeywords : brand.seoKeywords) || [],

                // İçerik (seçili site öncelikli)
                description: sc.description || brand.description || '',

                // Görseller — seçili site logosu öncelikli (siteContent.<site>.logoUrl), yoksa ortak logo
                logo: (() => {
                    const logoUrl = sc.logoUrl || brand.logo?.url || brand.bannerImage?.url || brand.customImage?.url;
                    if (!logoUrl) {
                        return '/images/urun/gorsel-bulunamadi.jpg';
                    }
                    if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) {
                        return logoUrl;
                    }
                    if (logoUrl.startsWith('/marka/')) {
                        return logoUrl;
                    }
                    return `/marka/${logoUrl}`;
                })(),
                logoAlt: sc.logoAlt || brand.logo?.alt || `${brand.name} Logo`,
                bannerImage: brand.bannerImage?.url || null,
                customImage: brand.customImage?.url || '/images/urun/gorsel-bulunamadi.jpg',
                brandInfo: {
                    foundedYear: brand.brandInfo?.foundedYear || null,
                    country: brand.brandInfo?.country || null,
                    website: brand.brandInfo?.website || null,
                    about: brand.brandInfo?.about || null
                },

                // İstatistikler (ürün sayısı seçili sitenin yayınlanmış ürünleri)
                productCount: siteProductCount,
                totalDiaProductCount: brand.productCount || 0,
                activeProductCount: brand.activeProductCount || 0,
                totalStock: brand.totalStock || 0,
                totalValue: brand.totalValue || 0,

                // Fiyat bilgileri
                priceRange: {
                    min: minPrice,
                    max: maxPrice,
                    average: avgPrice,
                    text: priceRangeText,
                    averageFormatted: formattedAvgPrice
                },

                // Kategori dağılımı
                categories: brand.categoryDistribution || [],
                categoriesText: categoryText,
                mainCategory: brand.categoryDistribution && brand.categoryDistribution.length > 0
                    ? brand.categoryDistribution[0].categoryName
                    : 'Kategori yok',

                // Tarihler
                createdAt: brand.createdAt,
                updatedAt: brand.updatedAt,
                lastSync: brand.syncInfo?.lastSync,
                lastDiaSync: brand.syncInfo?.lastDiaSync,
                lastProductSync: brand.syncInfo?.lastProductSync,
                syncStatus: brand.syncInfo?.syncStatus || 'unknown',

                // Kalite skorları
                completenessScore: calculateBrandCompleteness(brand),
                hasLogo: !!(sc.logoUrl || brand.logo?.url),
                hasDescription: !!(brand.description),
                hasBrandInfo: !!(brand.brandInfo?.about),
                hasWebsite: !!(brand.brandInfo?.website)
            };
        });

        // Kalite skoru hesaplama fonksiyonu
        function calculateBrandCompleteness(brand) {
            let score = 0;
            const checks = [
                !!(brand.logo?.url),          
                !!(brand.description),         
                !!(brand.brandInfo?.about),    
                !!(brand.brandInfo?.website),  
                !!(brand.seoDescription),      
                brand.productCount > 0         
            ];

            const weights = [20, 20, 20, 15, 15, 10];
            checks.forEach((check, index) => {
                if (check) score += weights[index];
            });

            return score;
        }

        res.json({
            success: true,
            data: formattedBrands,
            total: formattedBrands.length,
            meta: {
                totalBrands: formattedBrands.length,
                visibleBrands: formattedBrands.filter(b => b.webVisible).length,
                activeBrands: formattedBrands.filter(b => b.status === 'Active').length,
                emptyBrands: formattedBrands.filter(b => b.status === 'Empty').length,
                hiddenBrands: formattedBrands.filter(b => b.status === 'Hidden').length,
                brandsWithLogo: formattedBrands.filter(b => b.hasLogo).length,
                brandsWithDescription: formattedBrands.filter(b => b.hasDescription).length,
                totalProducts: formattedBrands.reduce((sum, b) => sum + b.productCount, 0),
                totalStock: formattedBrands.reduce((sum, b) => sum + b.totalStock, 0),
                averageCompleteness: Math.round(
                    formattedBrands.reduce((sum, b) => sum + b.completenessScore, 0) / formattedBrands.length
                )
            }
        });

    } catch (error) {
        console.error('Brands get error:', error);
        res.status(500).json({
            success: false,
            message: 'Markalar getirilirken hata oluştu',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
/**
 * Marka Detay Güncelleme - WebBrand Collection'dan
 */
router.patch('/:id', maybeAuth, [
    body('description').optional().isLength({ max: 500 }).withMessage('Açıklama en fazla 500 karakter olabilir'),
    body('seoTitle').optional().isLength({ max: 100 }).withMessage('SEO başlığı en fazla 100 karakter olabilir'),
    body('seoDescription').optional().isLength({ max: 200 }).withMessage('SEO açıklaması en fazla 200 karakter olabilir'),
    body('seoUrl').optional().matches(/^[a-z0-9-]*$/).withMessage('SEO URL sadece küçük harf, sayı ve tire içermelidir'),
    body('webOrder').optional().isInt({ min: 0 }).withMessage('Sıralama 0 veya daha büyük olmalıdır'),
    body('webVisible').optional().isBoolean().withMessage('Görünürlük true veya false olmalıdır')
], async (req, res) => {
    try {
        const { id } = req.params
        const { description, seoTitle, seoDescription, seoUrl, webOrder, webVisible } = req.body

        const updateData = {}
        // İçerik/SEO metinleri seçili siteye yazılır; seoUrl ortak kalır (URL kimliği tek)
        if (description !== undefined) updateData[`siteContent.${req.site}.description`] = description
        if (seoTitle !== undefined) updateData[`siteContent.${req.site}.seoTitle`] = seoTitle?.trim()
        if (seoDescription !== undefined) updateData[`siteContent.${req.site}.seoDescription`] = seoDescription?.trim()
        if (seoUrl !== undefined) updateData.seoUrl = seoUrl?.trim().toLowerCase()
        if (webOrder !== undefined) updateData[`siteSettings.${req.site}.webOrder`] = Number(webOrder) || 0
        if (webVisible !== undefined) updateData[`siteSettings.${req.site}.webVisible`] = webVisible === true || webVisible === 'true'

        updateData.updatedAt = new Date()

        const updatedBrand = await WebBrand.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, strict: false }
        )

        if (!updatedBrand) {
            return res.status(404).json({
                success: false,
                message: 'Marka bulunamadı'
            })
        }

        res.json({
            success: true,
            data: updatedBrand,
            message: 'Marka başarıyla güncellendi'
        })

    } catch (error) {
        console.error('Marka güncelleme hatası:', error)
        res.status(500).json({
            success: false,
            message: 'Marka güncellenirken hata oluştu'
        })
    }
})

/**
 * Marka Güncelleme - PUT
 * PUT /api/brands/:id
 */
router.put('/:id', maybeAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // İzin verilen alanlar: içerik/SEO metinleri siteContent, yönetim alanları siteSettings altına yazılır
        // seoUrl ve brandInfo ortak kalır (URL kimliği tek, marka bilgisi olgusal)
        const allowedFields = ['seoUrl', 'brandInfo'];
        const siteContentFields = ['description', 'seoTitle', 'seoDescription', 'seoKeywords'];
        const siteScopedFields = ['webVisible', 'webOrder', 'showOnHomepage', 'homepageOrder'];

        const filteredData = {};
        allowedFields.forEach(field => {
            if (updateData[field] !== undefined) {
                filteredData[field] = updateData[field];
            }
        });
        siteContentFields.forEach(field => {
            if (updateData[field] !== undefined) {
                filteredData[`siteContent.${req.site}.${field}`] = updateData[field];
            }
        });
        siteScopedFields.forEach(field => {
            if (updateData[field] !== undefined) {
                filteredData[`siteSettings.${req.site}.${field}`] = updateData[field];
            }
        });

        filteredData.updatedAt = new Date();

        const brand = await WebBrand.findByIdAndUpdate(
            id,
            { $set: filteredData },
            { new: true }
        );

        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Marka bulunamadı'
            });
        }

        res.json({
            success: true,
            message: 'Marka güncellendi',
            data: brand
        });

    } catch (error) {
        console.error('Brand update error:', error);
        res.status(500).json({
            success: false,
            message: 'Marka güncellenirken hata oluştu',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * Marka Logo Yükleme
 * POST /api/brands/:id/logo
 */
router.post('/:id/logo', maybeAuth, uploadLogo, async (req, res) => {
    try {
        const { id } = req.params;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Dosya yuklenmedi'
            });
        }

        const brand = await WebBrand.findById(id);
        if (!brand) {
            MediaService.deleteFile(`/marka/${req.file.filename}`);
            return res.status(404).json({
                success: false,
                message: 'Marka bulunamadi'
            });
        }
        // Logo SEÇİLİ SİTEYE yazılır (siteContent.<site>.logoUrl); ortak logo alanına DOKUNULMAZ.
        // Eski site logosu (varsa) silinir; ortak logo fallback olarak korunur.
        const oldSiteLogoUrl = brand.siteContent?.[req.site]?.logoUrl;

        // Yeni logo URL
        const logoUrl = MediaService.getFileUrl('brand', req.file.filename);

        // Güncelle
        const updatedBrand = await WebBrand.findByIdAndUpdate(
            id,
            {
                $set: {
                    [`siteContent.${req.site}.logoUrl`]: logoUrl,
                    [`siteContent.${req.site}.logoAlt`]: `${brand.name} Logo`,
                    updatedAt: new Date()
                }
            },
            { new: true }
        );

        // Yukleme basarili, simdi eski site logosunu sil (ortak logo/başka sitenin logosu değilse)
        if (oldSiteLogoUrl && oldSiteLogoUrl !== logoUrl && oldSiteLogoUrl !== brand.logo?.url) {
            const digerSiteKullaniyor = Object.entries(brand.siteContent || {})
                .some(([slug, sc]) => slug !== req.site && sc?.logoUrl === oldSiteLogoUrl);
            if (!digerSiteKullaniyor) MediaService.deleteFile(oldSiteLogoUrl);
        }
        res.json({
            success: true,
            message: 'Logo basariyla yuklendi',
            data: {
                url: logoUrl,
                brand: updatedBrand
            }
        });

    } catch (error) {
        console.error('Logo upload error:', error);

        if (req.file) {
            MediaService.deleteFile(`/marka/${req.file.filename}`);
        }

        res.status(500).json({
            success: false,
            message: error.message || 'Logo yuklenirken hata olustu'
        });
    }
});

/**
 * Marka Logo Silme
 * DELETE /api/brands/:id/logo
 */
router.delete('/:id/logo', maybeAuth, async (req, res) => {
    try {
        const { id } = req.params;

        const brand = await WebBrand.findById(id);
        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Marka bulunamadi'
            });
        }

        // SEÇİLİ SİTENİN logosu silinir; ortak logo (fallback) korunur.
        const siteLogoUrl = brand.siteContent?.[req.site]?.logoUrl;

        // Dosyayı sil — ortak logo veya başka sitenin logosu değilse
        if (siteLogoUrl && siteLogoUrl !== brand.logo?.url) {
            const digerSiteKullaniyor = Object.entries(brand.siteContent || {})
                .some(([slug, sc]) => slug !== req.site && sc?.logoUrl === siteLogoUrl);
            if (!digerSiteKullaniyor) MediaService.deleteFile(siteLogoUrl);
        }

        // DB güncelle — yalnız seçili sitenin logo alanları temizlenir
        const updatedBrand = await WebBrand.findByIdAndUpdate(
            id,
            { $unset: { [`siteContent.${req.site}.logoUrl`]: '', [`siteContent.${req.site}.logoAlt`]: '' }, $set: { updatedAt: new Date() } },
            { new: true }
        );

        res.json({
            success: true,
            message: 'Logo basariyla silindi',
            data: updatedBrand
        });

    } catch (error) {
        console.error('Logo delete error:', error);
        res.status(500).json({
            success: false,
            message: 'Logo silinirken hata olustu'
        });
    }
});

module.exports = router;