const express = require('express');
const TiresCatalogService = require('../services/web/TiresCatalogService');
const logger = require('../utils/logger');

const router = express.Router();
const tiresCatalogService = new TiresCatalogService();

/**
 * Lastik markalarını getirir
 * GET /api/tires/brands
 */
router.get('/brands', async (req, res) => {
    try {
        const options = {};
        
        if (req.query.price_segment) {
            options.priceSegment = Array.isArray(req.query.price_segment) 
                ? req.query.price_segment 
                : [req.query.price_segment];
        }

        const result = await tiresCatalogService.getBrands(options);
        
        res.json({
            success: true,
            data: result.data,
            meta: result.meta
        });
    } catch (error) {
        logger.error('Lastik markaları endpoint hatası', {
            error: error.message,
            stack: error.stack
        });
        
        res.status(500).json({
            success: false,
            message: 'Lastik markaları alınırken hata oluştu',
            error: error.message
        });
    }
});

/**
 * Marka ürünlerini getirir
 * GET /api/tires/brands/:brandSlug/products
 */
router.get('/brands/:brandSlug/products', async (req, res) => {
    try {
        const { brandSlug } = req.params;
        const options = {};
        
        if (req.query.region) {
            options.region = Array.isArray(req.query.region) 
                ? req.query.region 
                : [req.query.region];
        }
        if (req.query.season) {
            options.season = Array.isArray(req.query.season) 
                ? req.query.season 
                : [req.query.season];
        }
        if (req.query.automobile_type) {
            options.automobileType = req.query.automobile_type;
        }
        if (req.query.runflat !== undefined) {
            options.runflat = req.query.runflat === 'true';
        }
        if (req.query.show_discontinued !== undefined) {
            options.showDiscontinued = req.query.show_discontinued === 'true';
        }
        if (req.query.show_oe !== undefined) {
            options.showOe = req.query.show_oe === 'true';
        }
        if (req.query.ordering) {
            options.ordering = req.query.ordering;
        }

        const result = await tiresCatalogService.getBrandProducts(brandSlug, options);
        
        res.json({
            success: true,
            data: result.data,
            meta: result.meta
        });
    } catch (error) {
        logger.error('Marka ürünleri endpoint hatası', {
            brandSlug: req.params.brandSlug,
            error: error.message,
            stack: error.stack
        });
        
        res.status(500).json({
            success: false,
            message: 'Marka ürünleri alınırken hata oluştu',
            error: error.message
        });
    }
});

/**
 * Ürün detaylarını getirir
 * GET /api/tires/products/:brandSlug/:productSlug
 */
router.get('/products/:brandSlug/:productSlug', async (req, res) => {
    try {
        const { brandSlug, productSlug } = req.params;
        
        const result = await tiresCatalogService.getProductDetails(brandSlug, productSlug);
        
        res.json({
            success: true,
            data: result.data,
            meta: result.meta
        });
    } catch (error) {
        logger.error('Ürün detayları endpoint hatası', {
            brandSlug: req.params.brandSlug,
            productSlug: req.params.productSlug,
            error: error.message,
            stack: error.stack
        });
        
        res.status(500).json({
            success: false,
            message: 'Ürün detayları alınırken hata oluştu',
            error: error.message
        });
    }
});

/**
 * Ürün BNB nedenlerini getirir
 * GET /api/tires/products/:brandSlug/:productSlug/bnb
 */
router.get('/products/:brandSlug/:productSlug/bnb', async (req, res) => {
    try {
        const { brandSlug, productSlug } = req.params;
        
        const result = await tiresCatalogService.getProductBNB(brandSlug, productSlug);
        
        res.json({
            success: true,
            data: result.data,
            meta: result.meta
        });
    } catch (error) {
        logger.error('Ürün BNB endpoint hatası', {
            brandSlug: req.params.brandSlug,
            productSlug: req.params.productSlug,
            error: error.message,
            stack: error.stack
        });
        
        res.status(500).json({
            success: false,
            message: 'Ürün BNB nedenleri alınırken hata oluştu',
            error: error.message
        });
    }
});

/**
 * Ürün modifikasyonlarını getirir
 * GET /api/tires/products/:brandSlug/:productSlug/modes
 */
router.get('/products/:brandSlug/:productSlug/modes', async (req, res) => {
    try {
        const { brandSlug, productSlug } = req.params;
        
        const result = await tiresCatalogService.getProductModes(brandSlug, productSlug);
        
        res.json({
            success: true,
            data: result.data,
            meta: result.meta
        });
    } catch (error) {
        logger.error('Ürün modifikasyonları endpoint hatası', {
            brandSlug: req.params.brandSlug,
            productSlug: req.params.productSlug,
            error: error.message,
            stack: error.stack
        });
        
        res.status(500).json({
            success: false,
            message: 'Ürün modifikasyonları alınırken hata oluştu',
            error: error.message
        });
    }
});

/**
 * Ürün materyallerini getirir
 * GET /api/tires/products/:brandSlug/:productSlug/materials
 */
router.get('/products/:brandSlug/:productSlug/materials', async (req, res) => {
    try {
        const { brandSlug, productSlug } = req.params;
        const type = req.query.type || null;
        
        const result = await tiresCatalogService.getProductMaterials(brandSlug, productSlug, type);
        
        res.json({
            success: true,
            data: result.data,
            meta: result.meta
        });
    } catch (error) {
        logger.error('Ürün materyalleri endpoint hatası', {
            brandSlug: req.params.brandSlug,
            productSlug: req.params.productSlug,
            type: req.query.type,
            error: error.message,
            stack: error.stack
        });
        
        res.status(500).json({
            success: false,
            message: 'Ürün materyalleri alınırken hata oluştu',
            error: error.message
        });
    }
});


/**
 * Bölgeleri getirir
 * GET /api/tires/regions
 */
router.get('/regions', async (req, res) => {
    try {
        const result = await tiresCatalogService.getRegions();
        
        res.json({
            success: true,
            data: result.data,
            meta: result.meta
        });
    } catch (error) {
        logger.error('Bölgeler endpoint hatası', {
            error: error.message,
            stack: error.stack
        });
        
        res.status(500).json({
            success: false,
            message: 'Bölgeler alınırken hata oluştu',
            error: error.message
        });
    }
});

/**
 * Performans kategorilerini getirir
 * GET /api/tires/performance-categories
 */
router.get('/performance-categories', async (req, res) => {
    try {
        const result = await tiresCatalogService.getPerformanceCategories();
        
        res.json({
            success: true,
            data: result.data,
            meta: result.meta
        });
    } catch (error) {
        logger.error('Performans kategorileri endpoint hatası', {
            error: error.message,
            stack: error.stack
        });
        
        res.status(500).json({
            success: false,
            message: 'Performans kategorileri alınırken hata oluştu',
            error: error.message
        });
    }
});

/**
 * Testleri getirir
 * GET /api/tires/tests
 */
router.get('/tests', async (req, res) => {
    try {
        const options = {};
        
        if (req.query.year) {
            options.year = Array.isArray(req.query.year) 
                ? req.query.year 
                : [req.query.year];
        }
        if (req.query.season) {
            options.season = Array.isArray(req.query.season) 
                ? req.query.season 
                : [req.query.season];
        }
        if (req.query.automobile_type) {
            options.automobileType = req.query.automobile_type;
        }
        if (req.query.page) {
            options.page = parseInt(req.query.page);
        }
        if (req.query.per_page) {
            options.perPage = parseInt(req.query.per_page);
        }

        const result = await tiresCatalogService.getTests(options);
        
        res.json({
            success: true,
            data: result.data,
            meta: result.meta
        });
    } catch (error) {
        logger.error('Testler endpoint hatası', {
            error: error.message,
            stack: error.stack
        });
        
        res.status(500).json({
            success: false,
            message: 'Testler alınırken hata oluştu',
            error: error.message
        });
    }
});

/**
 * Lastik arama yapar
 * GET /api/tires/search
 */
router.get('/search', async (req, res) => {
    try {
        const query = req.query;
        
        const result = await tiresCatalogService.searchTires(query);
        
        res.json({
            success: true,
            data: result.data,
            meta: result.meta
        });
    } catch (error) {
        logger.error('Lastik arama endpoint hatası', {
            query: req.query,
            error: error.message,
            stack: error.stack
        });
        
        res.status(500).json({
            success: false,
            message: 'Lastik arama sırasında hata oluştu',
            error: error.message
        });
    }
});

/**
 * Gelişmiş lastik arama yapar
 * GET /api/tires/search/advanced
 */
router.get('/search/advanced', async (req, res) => {
    try {
        const query = req.query;
        
        const result = await tiresCatalogService.advancedSearchTires(query);
        
        res.json({
            success: true,
            data: result.data,
            meta: result.meta
        });
    } catch (error) {
        logger.error('Gelişmiş lastik arama endpoint hatası', {
            query: req.query,
            error: error.message,
            stack: error.stack
        });
        
        res.status(500).json({
            success: false,
            message: 'Gelişmiş lastik arama sırasında hata oluştu',
            error: error.message
        });
    }
});

/**
 * Ürün adından lastik verilerini getirir
 * POST /api/tires/product-data
 */
router.post('/product-data', async (req, res) => {
    try {
        const { productName } = req.body;
        
        if (!productName) {
            return res.status(400).json({
                success: false,
                message: 'productName parametresi gereklidir'
            });
        }

        logger.info('Ürün verisi isteniyor', { productName });

        // Parse product name for mock data
        const parsed = tiresCatalogService.parseProductName(productName);
        if (!parsed) {
            return res.status(400).json({
                success: false,
                message: 'Ürün adı parse edilemedi'
            });
        }

        const { brand, product } = parsed;

        // WheelSize API'den paralel olarak tüm verileri çek
        try {
            logger.info('WheelSize API\'den veri çekiliyor', {
                productName,
                brand,
                product,
                endpoints: [
                    `/api/tires/catalog/${brand}/${product}`,
                    `/api/tires/catalog/${brand}/${product}/bnb`,
                    `/api/tires/catalog/${brand}/${product}/modes`, 
                    `/api/tires/catalog/${brand}/${product}/materials`
                ]
            });

            // Paralel API çağrıları
            const [detailsResult, bnbResult, modesResult, materialsResult] = await Promise.allSettled([
                tiresCatalogService.getProductDetails(brand, product),
                tiresCatalogService.getProductBNB(brand, product),
                tiresCatalogService.getProductModes(brand, product),
                tiresCatalogService.getProductMaterials(brand, product)
            ]);

            // Sonuçları işle
            const result = {
                brand,
                product,
                details: detailsResult.status === 'fulfilled' ? detailsResult.value?.data : null,
                bnb: bnbResult.status === 'fulfilled' ? bnbResult.value?.data : null,
                modes: modesResult.status === 'fulfilled' ? modesResult.value?.data : null,
                materials: materialsResult.status === 'fulfilled' ? materialsResult.value?.data : null
            };

            // En az bir veri geldi mi kontrol et
            if (result.details || result.bnb || result.modes || result.materials) {
                logger.info('WheelSize API\'den veri başarıyla alındı', {
                    productName,
                    brand,
                    product,
                    hasDetails: !!result.details,
                    hasBnb: !!result.bnb,
                    hasModes: !!result.modes,
                    hasMaterials: !!result.materials,
                    errors: [
                        detailsResult.status === 'rejected' ? detailsResult.reason?.message : null,
                        bnbResult.status === 'rejected' ? bnbResult.reason?.message : null,
                        modesResult.status === 'rejected' ? modesResult.reason?.message : null,
                        materialsResult.status === 'rejected' ? materialsResult.reason?.message : null
                    ].filter(Boolean)
                });

                return res.json({
                    success: true,
                    data: result
                });
            }

            // Hiç veri gelmezse hata döndür
            throw new Error('WheelSize API\'den hiçbir veri alınamadı');
        } catch (apiError) {
            logger.error('WheelSize API hatası', {
                productName,
                brand,
                product,
                error: apiError.message,
                stack: apiError.stack
            });

            return res.status(503).json({
                success: false,
                message: 'Lastik verisi şu anda alınamıyor. Lütfen daha sonra tekrar deneyin.',
                error: apiError.message,
                brand,
                product
            });
        }
    } catch (error) {
        logger.error('Ürün verisi endpoint hatası', {
            productName: req.body.productName,
            error: error.message,
            stack: error.stack
        });
        
        res.status(500).json({
            success: false,
            message: 'Ürün verisi alınırken hata oluştu',
            error: error.message
        });
    }
});

/**
 * Wheelsize ID ile tek ürün detayını getirir
 * GET /api/tires/wheelsize/:wheelsizeId
 */
router.get('/wheelsize/:wheelsizeId', async (req, res) => {
    try {
        const { wheelsizeId } = req.params;
        
        logger.info('Wheelsize ID ile ürün detayı isteniyor', {
            wheelsizeId,
            userAgent: req.get('User-Agent')
        });

        // Önce mevcut sistemimizden ürün bilgisini al
        let baseProduct = null;
        
        // Wheelsize ürün listesinden ID'ye göre ürünü bul
        try {
            const wheelsizeResponse = await fetch(`http://wheelsizeapi.compiturk.com.tr/api/lastik/arama?limit=1000`);
            
            if (wheelsizeResponse.ok) {
                const wheelsizeData = await wheelsizeResponse.json();
                baseProduct = wheelsizeData.find(p => p._id == wheelsizeId || p.id == wheelsizeId);
            }
        } catch (error) {
            logger.warn('Wheelsize arama API hatası', { error: error.message });
        }

        // baseProduct bulunamazsa, brand/name ipuçları ile devam etmeyi deneyeceğiz (fallback)

        // Brand ve product slug'larını oluştur (query ipuçları + parser)
        const brandHint = (req.query.brand || '').toString();
        const nameHint = (req.query.name || '').toString();

        const slugify = (str) => str.toLowerCase()
            .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
            .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');

        let brandSlug = (baseProduct && baseProduct.marka) ? slugify(baseProduct.marka) : (brandHint ? slugify(brandHint) : null);

        const baseName = (baseProduct && (baseProduct.model || baseProduct.aciklama)) || nameHint || '';
        let productSlug = baseName ? slugify(baseName) : null;

        // Parser ile daha güvenilir tespit
        if (nameHint) {
            const parsed = tiresCatalogService.parseProductName(nameHint);
            if (parsed) {
                brandSlug = parsed.brand || brandSlug;
                productSlug = parsed.product || productSlug;
            }
        }

        const product = baseProduct ? { ...baseProduct } : {};

        // Wheelsize Catalog API'den detaylı bilgi al
        let enhancedProduct = { ...product };
        
        if (brandSlug && productSlug) {
            try {
                logger.info('Wheelsize Catalog API çağrısı', { brandSlug, productSlug, wheelsizeId });
                
                // Genel ürün bilgisi
                const catalogResponse = await fetch(
                    `http://wheelsizeapi.compiturk.com.tr/api/tires/catalog/${brandSlug}/${productSlug}/`
                );

                if (catalogResponse.ok) {
                    const catalogData = await catalogResponse.json();
                    
                    // Catalog verilerini mevcut ürün verisine ekle
                    enhancedProduct.catalogInfo = catalogData;
                    
                    logger.info('Wheelsize Catalog verisi alındı', { 
                        wheelsizeId, 
                        hasRating: !!catalogData.rating,
                        hasPerformance: !!catalogData.performance 
                    });
                } else {
                    logger.warn('Catalog API yanıt hatası', { 
                        status: catalogResponse.status, 
                        brandSlug, 
                        productSlug 
                    });
                }

                // Ürün modları/varyantları
                const modesResponse = await fetch(
                    `http://wheelsizeapi.compiturk.com.tr/api/tires/catalog/${brandSlug}/${productSlug}/modes`
                );

                if (modesResponse.ok) {
                    const modesData = await modesResponse.json();
                    enhancedProduct.modes = modesData;
                    logger.info('Ürün modları alındı', { wheelsizeId, modesCount: modesData?.length || 0 });
                }

                // Buy/Not-Buy bilgileri
                const bnbResponse = await fetch(
                    `http://wheelsizeapi.compiturk.com.tr/api/tires/catalog/${brandSlug}/${productSlug}/bnb`
                );

                if (bnbResponse.ok) {
                    const bnbData = await bnbResponse.json();
                    enhancedProduct.buyNotBuy = bnbData;
                    logger.info('Buy/Not-Buy bilgileri alındı', { wheelsizeId });
                }

            } catch (catalogError) {
                logger.warn('Wheelsize Catalog API hatası', { 
                    wheelsizeId, 
                    brandSlug, 
                    productSlug, 
                    error: catalogError.message 
                });
            }
        } else {
            logger.warn('Brand veya product slug oluşturulamadı', { 
                wheelsizeId,
                brand: baseProduct?.marka || brandHint,
                productName: (baseProduct && (baseProduct.model || baseProduct.aciklama)) || nameHint
            });
        }

        // Eğer catalog verisi bulunamadıysa, arama ile doğru slug'ı tespit etmeyi dene
        if (!enhancedProduct.catalogInfo && brandSlug && (nameHint || baseName)) {
            try {
                logger.info('Wheelsize Catalog SEARCH fallback', { wheelsizeId, brandSlug, query: nameHint || baseName });
                const searchRes = await tiresCatalogService.searchTires({ brand: brandSlug, query: (nameHint || baseName) });
                const first = searchRes?.data?.[0];
                if (first) {
                    const resolvedBrand = first.brand?.slug || brandSlug;
                    const resolvedProduct = first.slug || first.product?.slug;
                    if (resolvedProduct) {
                        // Tekrar catalog çağrılarını dene
                        logger.info('SEARCH ile slug bulundu, catalog çağrısı yapılıyor', { resolvedBrand, resolvedProduct });
                        const catalogResponse2 = await fetch(
                            `http://wheelsizeapi.compiturk.com.tr/api/tires/catalog/${resolvedBrand}/${resolvedProduct}/`
                        );
                        if (catalogResponse2.ok) {
                            const catalogData2 = await catalogResponse2.json();
                            enhancedProduct.catalogInfo = catalogData2;
                        }

                        const modesResponse2 = await fetch(
                            `http://wheelsizeapi.compiturk.com.tr/api/tires/catalog/${resolvedBrand}/${resolvedProduct}/modes`
                        );
                        if (modesResponse2.ok) {
                            enhancedProduct.modes = await modesResponse2.json();
                        }

                        const bnbResponse2 = await fetch(
                            `http://wheelsizeapi.compiturk.com.tr/api/tires/catalog/${resolvedBrand}/${resolvedProduct}/bnb`
                        );
                        if (bnbResponse2.ok) {
                            enhancedProduct.buyNotBuy = await bnbResponse2.json();
                        }

                        // Slugları güncelle
                        brandSlug = resolvedBrand;
                        productSlug = resolvedProduct;
                    }
                } else {
                    logger.warn('SEARCH sonucu boş geldi', { wheelsizeId, brandSlug, query: nameHint || baseName });
                }
            } catch (searchErr) {
                logger.warn('Wheelsize Catalog SEARCH hatası', { wheelsizeId, error: searchErr.message });
            }
        }

        // Dia stok kontrolü yap
        try {
            // Tek ürün için Dia stok kontrolü
            if (baseProduct) {
            const diaStockResponse = await fetch('http://localhost:3082/api/lastik/dia-stok-kontrol', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    wheelsizeProducts: [product]
                })
            });

            if (diaStockResponse.ok) {
                const diaData = await diaStockResponse.json();
                if (diaData.success && diaData.data && diaData.data.length > 0) {
                    // Dia verilerini mevcut veriye merge et
                    const diaProduct = diaData.data[0];
                    enhancedProduct = {
                        ...enhancedProduct,
                        ...diaProduct,
                        // Catalog bilgilerini koru
                        catalogInfo: enhancedProduct.catalogInfo,
                        modes: enhancedProduct.modes,
                        buyNotBuy: enhancedProduct.buyNotBuy
                    };
                }
            }
            }
        } catch (diaError) {
            logger.warn('Dia stok kontrolü başarısız', {
                wheelsizeId,
                error: diaError.message
            });
        }

        // Eğer hiçbir veri elde edilemediyse (ne baseProduct ne de catalogInfo)
        if (!baseProduct && !enhancedProduct.catalogInfo && !enhancedProduct.modes && !enhancedProduct.buyNotBuy) {
            return res.status(404).json({
                success: false,
                message: 'Ürün bulunamadı',
                error: 'PRODUCT_NOT_FOUND'
            });
        }

        // Ürün detaylarını formatla
        const productDetail = {
            _id: enhancedProduct._id || enhancedProduct.id,
            name: enhancedProduct.name || enhancedProduct.model || enhancedProduct.aciklama || enhancedProduct.catalogInfo?.display || 'Lastik',
            brand: enhancedProduct.brand || enhancedProduct.marka || enhancedProduct.realBrand || enhancedProduct.catalogInfo?.brand?.display || (brandSlug || 'Bilinmeyen'),
            images: enhancedProduct.images || enhancedProduct.catalogInfo?.images || [
                {
                    url: enhancedProduct.resim || '/assets/img/shop/tire-placeholder.jpg',
                    isPrimary: true
                }
            ],
            specifications: {
                size: enhancedProduct.specifications?.size || enhancedProduct.ebat || enhancedProduct.catalogInfo?.size || `${enhancedProduct.kesitGenisligi || ''}/${enhancedProduct.yanakOrani || ''}R${enhancedProduct.jantCapi || ''}`,
                loadIndex: enhancedProduct.specifications?.loadIndex || enhancedProduct.yukIndeksi || enhancedProduct.loadIndex || enhancedProduct.catalogInfo?.load_index || '',
                speedIndex: enhancedProduct.specifications?.speedIndex || enhancedProduct.hizIndeksi || enhancedProduct.speedIndex || enhancedProduct.catalogInfo?.speed_index || '',
                season: enhancedProduct.specifications?.season || enhancedProduct.mevsim || enhancedProduct.catalogInfo?.season || 'tum',
                runflat: enhancedProduct.specifications?.runflat || enhancedProduct.runflat || false,
                reinforced: enhancedProduct.specifications?.reinforced || enhancedProduct.reinforced || enhancedProduct.xl || false,
                fuelEfficiency: enhancedProduct.specifications?.fuelEfficiency || enhancedProduct.fuelEfficiency || null,
                wetGrip: enhancedProduct.specifications?.wetGrip || enhancedProduct.wetGrip || null,
                noiseLevel: enhancedProduct.specifications?.noiseLevel || enhancedProduct.noiseLevel || null
            },
            price: enhancedProduct.price || enhancedProduct.realPrice || enhancedProduct.fiyat || 0,
            stock: enhancedProduct.stock || enhancedProduct.realStock || enhancedProduct.stok || 0,
            stockStatus: enhancedProduct.stockStatus || 'unknown',
            description: enhancedProduct.description || enhancedProduct.aciklama || null,
            diaStock: enhancedProduct.diaStock || null,
            diaProductCode: enhancedProduct.diaProductCode || null,
            // Wheelsize Catalog bilgileri
            catalogInfo: enhancedProduct.catalogInfo || null,
            modes: enhancedProduct.modes || null,
            buyNotBuy: enhancedProduct.buyNotBuy || null,
            rating: enhancedProduct.catalogInfo?.rating || enhancedProduct.rating || null,
            performance: enhancedProduct.catalogInfo?.performance || null,
            wheelsizeData: {
                originalId: enhancedProduct._id || enhancedProduct.id,
                kesitGenisligi: enhancedProduct.kesitGenisligi,
                yanakOrani: enhancedProduct.yanakOrani,
                jantCapi: enhancedProduct.jantCapi,
                mevsim: enhancedProduct.mevsim,
                brandSlug,
                productSlug
            }
        };

        logger.info('Wheelsize ürün detayı başarıyla döndürüldü', {
            wheelsizeId,
            productName: productDetail.name,
            brand: productDetail.brand,
            hasStock: productDetail.stock > 0,
            hasDiaStock: !!productDetail.diaStock,
            hasCatalogInfo: !!productDetail.catalogInfo,
            hasModes: !!productDetail.modes,
            hasBuyNotBuy: !!productDetail.buyNotBuy,
            hasRating: !!productDetail.rating
        });

        // Terminal için veri özeti logu (çok büyük payload yerine özet)
        logger.info('Wheelsize ürün detayı DATA ÖZET', {
            wheelsizeId,
            dataSummary: {
                name: productDetail.name,
                brand: productDetail.brand,
                imagesCount: Array.isArray(productDetail.images) ? productDetail.images.length : 0,
                price: productDetail.price,
                stock: productDetail.stock,
                stockStatus: productDetail.stockStatus,
                size: productDetail.specifications?.size,
                modesCount: Array.isArray(productDetail.modes) ? productDetail.modes.length : 0,
                bnb: productDetail.buyNotBuy ? {
                    buyReasons: productDetail.buyNotBuy.buy_reasons?.length || 0,
                    notBuyReasons: productDetail.buyNotBuy.not_buy_reasons?.length || 0
                } : null
            }
        });

        res.json({
            success: true,
            data: productDetail,
            meta: {
                wheelsizeId,
                hasEnhancedData: !!enhancedProduct.diaStock,
                hasCatalogData: !!productDetail.catalogInfo,
                brandSlug,
                productSlug,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        logger.error('Wheelsize ürün detayı endpoint hatası', {
            wheelsizeId: req.params.wheelsizeId,
            error: error.message,
            stack: error.stack
        });
        
        res.status(500).json({
            success: false,
            message: 'Ürün detayları alınırken hata oluştu',
            error: error.message
        });
    }
});

module.exports = router;
