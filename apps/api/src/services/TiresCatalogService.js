const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Tires Catalog API Servisi
 * http://217.195.202.170:5000 üzerindeki lastik kataloğu API'si ile iletişim kurar
 */

class TiresCatalogService {
    constructor() {
        this.baseURL = 'http://wheelsizeapi.compiturk.com.tr';
        this.timeout = 30000; // 30 saniye timeout (WheelSize API yavaş olabilir)
        
        logger.info('TiresCatalogService başlatıldı', {
            baseURL: this.baseURL
        });
    }

    /**
     * HTTP istek gönderme yardımcı metodu
     */
    async sendRequest(endpoint, params = {}) {
        try {
            const url = `${this.baseURL}${endpoint}`;
            
            logger.info('Tires API isteği gönderiliyor', {
                url,
                endpoint,
                params
            });

            const response = await axios.get(url, {
                params,
                timeout: this.timeout,
                validateStatus: () => true
            });

            logger.info('Tires API yanıtı alındı', {
                endpoint,
                statusCode: response.status,
                dataCount: response.data?.data?.length || (response.data?.data ? 1 : 0)
            });

            if (response.status !== 200) {
                throw new Error(`API Error: ${response.status} - ${response.statusText}`);
            }

            return response.data;
        } catch (error) {
            logger.error('Tires API isteği sırasında hata oluştu', {
                endpoint,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Tüm lastik markalarını getirir
     */
    async getBrands(options = {}) {
        try {
            const params = {};
            
            if (options.priceSegment) {
                if (Array.isArray(options.priceSegment)) {
                    options.priceSegment.forEach(segment => {
                        params.price_segment = params.price_segment || [];
                        params.price_segment.push(segment);
                    });
                } else {
                    params.price_segment = options.priceSegment;
                }
            }

            const result = await this.sendRequest('/api/tires/catalog/', params);
            
            logger.info('Lastik markaları başarıyla alındı', {
                brandCount: result.data?.length || 0
            });

            return result;
        } catch (error) {
            logger.error('Lastik markaları alınırken hata oluştu', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Belirli bir markanın ürünlerini getirir
     */
    async getBrandProducts(brandSlug, options = {}) {
        try {
            const params = {};
            
            if (options.region) {
                params.region = Array.isArray(options.region) ? options.region : [options.region];
            }
            if (options.season) {
                params.season = Array.isArray(options.season) ? options.season : [options.season];
            }
            if (options.automobileType) {
                params.automobile_type = options.automobileType;
            }
            if (options.runflat !== undefined) {
                params.runflat = options.runflat;
            }
            if (options.showDiscontinued !== undefined) {
                params.show_discontinued = options.showDiscontinued;
            }
            if (options.showOe !== undefined) {
                params.show_oe = options.showOe;
            }
            if (options.ordering) {
                params.ordering = options.ordering;
            }

            const result = await this.sendRequest(`/api/tires/catalog/${brandSlug}/`, params);
            
            logger.info('Marka ürünleri başarıyla alındı', {
                brandSlug,
                productCount: result.data?.length || 0
            });

            return result;
        } catch (error) {
            logger.error('Marka ürünleri alınırken hata oluştu', {
                brandSlug,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Tek lastik ürününün detay bilgilerini getirir
     */
    async getProductDetails(brandSlug, productSlug) {
        try {
            const result = await this.sendRequest(`/api/tires/catalog/${brandSlug}/${productSlug}/`);
            
            logger.info('Ürün detayları başarıyla alındı', {
                brandSlug,
                productSlug,
                productName: result.data?.display
            });

            return result;
        } catch (error) {
            logger.error('Ürün detayları alınırken hata oluştu', {
                brandSlug,
                productSlug,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Ürünün Buy/Not-Buy nedenlerini getirir
     */
    async getProductBNB(brandSlug, productSlug) {
        try {
            const result = await this.sendRequest(`/api/tires/catalog/${brandSlug}/${productSlug}/bnb`);
            
            logger.info('Ürün BNB nedenleri başarıyla alındı', {
                brandSlug,
                productSlug
            });

            return result;
        } catch (error) {
            logger.error('Ürün BNB nedenleri alınırken hata oluştu', {
                brandSlug,
                productSlug,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Ürünün modifikasyonlarını (ebat varyasyonları) getirir
     */
    async getProductModes(brandSlug, productSlug) {
        try {
            const result = await this.sendRequest(`/api/tires/catalog/${brandSlug}/${productSlug}/modes`);
            
            logger.info('Ürün modifikasyonları başarıyla alındı', {
                brandSlug,
                productSlug,
                modeCount: result.data?.length || 0
            });

            return result;
        } catch (error) {
            logger.error('Ürün modifikasyonları alınırken hata oluştu', {
                brandSlug,
                productSlug,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Ürünün ilgili materyallerini getirir
     */
    async getProductMaterials(brandSlug, productSlug, type = null) {
        try {
            const params = {};
            if (type) {
                params.type = type; // article, video, benchmark, link
            }

            const result = await this.sendRequest(`/api/tires/catalog/${brandSlug}/${productSlug}/materials`, params);
            
            logger.info('Ürün materyalleri başarıyla alındı', {
                brandSlug,
                productSlug,
                type,
                materialCount: result.data?.length || 0,
                sampleMaterial: result.data?.[0] ? {
                    type: result.data[0].type,
                    title: result.data[0].title,
                    url: result.data[0].url,
                    link: result.data[0].link,
                    thumbnail: result.data[0].thumbnail,
                    source: result.data[0].source,
                    date: result.data[0].date,
                    published_at: result.data[0].published_at,
                    author: result.data[0].author,
                    description: result.data[0].description?.substring(0, 100) + '...',
                    availableFields: Object.keys(result.data[0])
                } : null
            });

            return result;
        } catch (error) {
            logger.error('Ürün materyalleri alınırken hata oluştu', {
                brandSlug,
                productSlug,
                type,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Bölgeleri getirir
     */
    async getRegions() {
        try {
            const result = await this.sendRequest('/api/tires/regions');
            
            logger.info('Bölgeler başarıyla alındı', {
                regionCount: result.data?.length || 0
            });

            return result;
        } catch (error) {
            logger.error('Bölgeler alınırken hata oluştu', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Performans kategorilerini getirir
     */
    async getPerformanceCategories() {
        try {
            const result = await this.sendRequest('/api/tires/performance-categories');
            
            logger.info('Performans kategorileri başarıyla alındı', {
                categoryCount: result.data?.length || 0
            });

            return result;
        } catch (error) {
            logger.error('Performans kategorileri alınırken hata oluştu', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Profesyonel testleri getirir
     */
    async getTests(options = {}) {
        try {
            const params = {};
            
            if (options.year) {
                params.year = Array.isArray(options.year) ? options.year : [options.year];
            }
            if (options.season) {
                params.season = Array.isArray(options.season) ? options.season : [options.season];
            }
            if (options.automobileType) {
                params.automobile_type = options.automobileType;
            }
            if (options.page) {
                params.page = options.page;
            }
            if (options.perPage) {
                params.per_page = options.perPage;
            }

            const result = await this.sendRequest('/api/tires/tests', params);
            
            logger.info('Testler başarıyla alındı', {
                testCount: result.data?.length || 0,
                page: options.page || 1
            });

            return result;
        } catch (error) {
            logger.error('Testler alınırken hata oluştu', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Tek test detayını getirir
     */
    async getTestDetails(testSlug, options = {}) {
        try {
            const params = {};
            
            if (options.hasMode) {
                params.has_mode = Array.isArray(options.hasMode) ? options.hasMode : [options.hasMode];
            }

            const result = await this.sendRequest(`/api/tires/tests/${testSlug}`, params);
            
            logger.info('Test detayları başarıyla alındı', {
                testSlug
            });

            return result;
        } catch (error) {
            logger.error('Test detayları alınırken hata oluştu', {
                testSlug,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Top-Charts listesini getirir
     */
    async getTopCharts(options = {}) {
        try {
            const params = {};
            
            if (options.year) {
                params.year = Array.isArray(options.year) ? options.year : [options.year];
            }
            if (options.season) {
                params.season = Array.isArray(options.season) ? options.season : [options.season];
            }
            if (options.automobileType) {
                params.automobile_type = options.automobileType;
            }
            if (options.page) {
                params.page = options.page;
            }
            if (options.perPage) {
                params.per_page = options.perPage;
            }

            const result = await this.sendRequest('/api/tires/top-charts', params);
            
            logger.info('Top-Charts başarıyla alındı', {
                chartCount: result.data?.length || 0,
                page: options.page || 1
            });

            return result;
        } catch (error) {
            logger.error('Top-Charts alınırken hata oluştu', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Top-Chart detayını getirir
     */
    async getTopChartDetails(chartSlug, options = {}) {
        try {
            const params = {};
            
            if (options.hasMode) {
                params.has_mode = Array.isArray(options.hasMode) ? options.hasMode : [options.hasMode];
            }

            const result = await this.sendRequest(`/api/tires/top-charts/${chartSlug}`, params);
            
            logger.info('Top-Chart detayları başarıyla alındı', {
                chartSlug
            });

            return result;
        } catch (error) {
            logger.error('Top-Chart detayları alınırken hata oluştu', {
                chartSlug,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Basit arama yapar
     */
    async searchTires(query) {
        try {
            const result = await this.sendRequest('/api/tires/search', query);
            
            logger.info('Lastik arama başarıyla tamamlandı', {
                query,
                resultCount: result.data?.length || 0
            });

            return result;
        } catch (error) {
            logger.error('Lastik arama sırasında hata oluştu', {
                query,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Gelişmiş arama yapar
     */
    async advancedSearchTires(query) {
        try {
            const result = await this.sendRequest('/api/tires/search/advanced', query);
            
            logger.info('Gelişmiş lastik arama başarıyla tamamlandı', {
                query,
                resultCount: result.data?.length || 0
            });

            return result;
        } catch (error) {
            logger.error('Gelişmiş lastik arama sırasında hata oluştu', {
                query,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Lastik adından marka ve ürün slug'larını çıkarır
     */
    parseProductName(productName) {
        try {
            // Yaygın lastik marka adları ve WheelSize'daki karşılıkları
            const brandPatterns = [
                { brand: 'michelin', regex: /michelin|mıchelın/i },
                { brand: 'bridgestone', regex: /bridgestone|brıdgestone/i },
                { brand: 'continental', regex: /continental|contınental/i },
                { brand: 'pirelli', regex: /pirelli|pırellı/i },
                { brand: 'goodyear', regex: /goodyear/i },
                { brand: 'dunlop', regex: /dunlop/i },
                { brand: 'yokohama', regex: /yokohama/i },
                { brand: 'hankook', regex: /hankook/i },
                { brand: 'kumho', regex: /kumho/i },
                { brand: 'toyo', regex: /toyo/i },
                { brand: 'falken', regex: /falken/i },
                { brand: 'nexen', regex: /nexen/i },
                { brand: 'nokian', regex: /nokian/i },
                { brand: 'maxxis', regex: /maxxis/i },
                { brand: 'nitto', regex: /nitto/i },
                { brand: 'bf-goodrich', regex: /bf.?goodrich|bfgoodrich/i },
                { brand: 'cooper', regex: /cooper/i },
                { brand: 'general', regex: /general/i },
                { brand: 'uniroyal', regex: /uniroyal/i },
                { brand: 'firestone', regex: /firestone/i },
                { brand: 'laufenn', regex: /laufenn/i },
                { brand: 'starmaxx', regex: /starmaxx/i },
                { brand: 'milestone', regex: /milestone|mılestone/i }
            ];

            let detectedBrand = null;
            
            // Marka adını bul
            for (const pattern of brandPatterns) {
                if (pattern.regex.test(productName)) {
                    detectedBrand = pattern.brand;
                    break;
                }
            }

            if (!detectedBrand) {
                logger.warn('Ürün adından marka tespit edilemedi', { productName });
                return null;
            }

            // Ürün adından model adını çıkar
            let productModel = productName;
            
            // Marka adını kaldır
            productModel = productModel.replace(new RegExp(detectedBrand, 'gi'), '').trim();
            
            // Lastik ebatını kaldır (205/60R16, 245/45ZR18 vb.)
            productModel = productModel.replace(/\b\d{3}\/\d{2}[rz]?\d{2}\b/gi, '').trim();
            
            // Yük ve hız indekslerini kaldır (96V, 100Y XL vb.)
            productModel = productModel.replace(/\b\d{2,3}[a-z]\s*(xl|rf|rft|runflat)?\b/gi, '').trim();
            
            // Özel kodları kaldır (BMW(*), Mercedes(MO), M+S, 3PMSF vb.)
            productModel = productModel.replace(/\b(bmw\s*\(\*?\)|mercedes\s*\(mo\)|m\+s|3pmsf|rft|runflat|xl|rf)\b/gi, '').trim();
            
            // Fazla boşlukları temizle
            productModel = productModel.replace(/\s+/g, ' ').trim();
            
            // Bilinen model adlarını normalize et
            const modelMappings = {
                'cinturato rosso pc01': 'cinturato-rosso',
                'cinturato p7': 'cinturato-p7',
                'cinturato all season sf3': 'cinturato-all-season',
                'powergy all season sf': 'powergy-all-season',
                'sottozero serie 3': 'sottozero-serie-3',
                'pilot sport 4s': 'pilot-sport-4s',
                'pilot sport 4': 'pilot-sport-4',
                'primacy 4': 'primacy-4',
                's fit eq+ lk01': 's-fit-eq',
                'maxx out st582': 'maxx-out',
                'novaro st532': 'novaro',
                'naturen st542': 'naturen',
                'carmile': 'carmile'
            };
            
            // Model adını slug haline getir
            let productSlug = productModel.toLowerCase();
            
            // Bilinen model eşleştirmeleri kontrol et
            for (const [key, value] of Object.entries(modelMappings)) {
                if (productSlug.includes(key.toLowerCase())) {
                    productSlug = value;
                    break;
                }
            }
            
            // Eğer eşleştirme bulunamadıysa, genel slug oluştur
            if (!Object.values(modelMappings).includes(productSlug)) {
                productSlug = productModel
                    .toLowerCase()
                    .replace(/[^a-z0-9\s\-]/g, '') // Özel karakterleri kaldır
                    .replace(/\s+/g, '-') // Boşlukları tire ile değiştir
                    .replace(/^-+|-+$/g, '') // Başındaki ve sonundaki tireleri kaldır
                    .replace(/-+/g, '-'); // Çoklu tireleri tek tire yap
            }

            logger.info('Ürün adı parse edildi', {
                originalName: productName,
                detectedBrand,
                extractedModel: productModel,
                productSlug
            });

            return {
                brand: detectedBrand,
                product: productSlug,
                originalModel: productModel
            };
        } catch (error) {
            logger.error('Ürün adı parse edilirken hata oluştu', {
                productName,
                error: error.message
            });
            return null;
        }
    }

    /**
     * Ürün adından tüm lastik verilerini getirir
     */
    async getTireDataByProductName(productName) {
        try {
            const parsed = this.parseProductName(productName);
            if (!parsed) {
                return null;
            }

            const { brand, product } = parsed;

            // Paralel olarak tüm verileri çek
            const [details, bnb, modes, materials] = await Promise.allSettled([
                this.getProductDetails(brand, product),
                this.getProductBNB(brand, product),
                this.getProductModes(brand, product),
                this.getProductMaterials(brand, product)
            ]);

            const result = {
                brand,
                product,
                details: details.status === 'fulfilled' ? details.value : null,
                bnb: bnb.status === 'fulfilled' ? bnb.value : null,
                modes: modes.status === 'fulfilled' ? modes.value : null,
                materials: materials.status === 'fulfilled' ? materials.value : null
            };

            logger.info('Ürün adından lastik verileri başarıyla alındı', {
                productName,
                brand,
                product,
                hasDetails: !!result.details,
                hasBnb: !!result.bnb,
                hasModes: !!result.modes,
                hasMaterials: !!result.materials
            });

            return result;
        } catch (error) {
            logger.error('Ürün adından lastik verileri alınırken hata oluştu', {
                productName,
                error: error.message
            });
            return null;
        }
    }
}

module.exports = TiresCatalogService;
