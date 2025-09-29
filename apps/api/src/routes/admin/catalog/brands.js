const express = require('express');

// Models
const DiaStock = require('../../../models/DiaStock');
const WebProduct = require('../../../models/WebProduct');
const WebCategory = require('../../../models/WebCategory');
const WebBrand = require('../../../models/WebBrand');

// Middleware
const { authenticateAdmin } = require('../../../middleware/auth');
const { body, validationResult } = require('express-validator');

// @IMPORT Library
const DiaStockService = require('../../../services/DiaStockService');

// Config
const { MAIN_DIA_FILTERS } = require('../../../config/diaFilters');

const router = express.Router();

// Auth kontrolü - production'da zorunlu
const maybeAuth = process.env.NODE_ENV === 'production' ? authenticateAdmin : (req, res, next) => next();

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

        // WebBrand filtreleri
        const webFilter = {};

        // Sadece görünür markalar mı?
        if (visible_only === 'true') {
            webFilter.webVisible = true;
        }

        // Web durumu filtreleme
        if (web_status && web_status.trim() !== '') {
            if (web_status.trim() === 'active') {
                webFilter.webVisible = true;
                webFilter.productCount = { $gt: 0 };
            } else if (web_status.trim() === 'hidden') {
                webFilter.webVisible = false;
            } else if (web_status.trim() === 'empty') {
                webFilter.productCount = 0;
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
        sortOptions[sortField] = sort_order === 'desc' ? -1 : 1;

        const brands = await WebBrand.find(webFilter)
            .select({
                name: 1,
                slug: 1,
                diaBrand: 1,
                diaMarkaAck: 1,
                diaKey: 1,
                webVisible: 1,
                webOrder: 1,
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
            let webStatus = 'Inactive';
            if (brand.webVisible && brand.productCount > 0) {
                webStatus = 'Active';
            } else if (brand.webVisible && brand.productCount === 0) {
                webStatus = 'Empty';
            } else if (!brand.webVisible) {
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

                // Web yönetimi
                webVisible: brand.webVisible,
                webOrder: brand.webOrder,
                status: webStatus,

                // SEO
                seoTitle: brand.seoTitle || brand.name,
                seoDescription: brand.seoDescription || `${brand.name} markası ürünleri`,
                seoUrl: brand.seoUrl || brand.slug,
                seoKeywords: brand.seoKeywords || [],

                // İçerik
                description: brand.description || '',

                // Görseller
                logo: brand.logo?.url || null,
                logoAlt: brand.logo?.alt || `${brand.name} Logo`,
                bannerImage: brand.bannerImage?.url || null,
                customImage: brand.customImage?.url || '/images/brands/default-brand.jpg',

                // Marka bilgileri
                brandInfo: {
                    foundedYear: brand.brandInfo?.foundedYear || null,
                    country: brand.brandInfo?.country || null,
                    website: brand.brandInfo?.website || null,
                    about: brand.brandInfo?.about || null
                },

                // İstatistikler
                productCount: brand.productCount || 0,
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
                hasLogo: !!(brand.logo?.url),
                hasDescription: !!(brand.description),
                hasBrandInfo: !!(brand.brandInfo?.about),
                hasWebsite: !!(brand.brandInfo?.website)
            };
        });

        // Kalite skoru hesaplama fonksiyonu
        function calculateBrandCompleteness(brand) {
            let score = 0;
            const checks = [
                !!(brand.logo?.url),           // Logo var mı? +20
                !!(brand.description),         // Açıklama var mı? +20  
                !!(brand.brandInfo?.about),    // Hakkında var mı? +20
                !!(brand.brandInfo?.website),  // Website var mı? +15
                !!(brand.seoDescription),      // SEO açıklama var mı? +15
                brand.productCount > 0         // Ürün var mı? +10
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


module.exports = router;