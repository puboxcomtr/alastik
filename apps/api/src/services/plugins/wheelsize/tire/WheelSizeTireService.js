// apps/api/src/services/plugins/wheelsize/WheelSizeTireService.js
const axios = require('axios');
const WebProduct = require('../../../../models/web/catalog/WebProduct');
const WebWheelSize = require('../../../../models/web/catalog/WebWheelSize');

const TranslateService = require('../../translate/TranslateService');

/**
 * WheelSize TiresVote Entegrasyon Servisi
 * 
 * Fonksiyon Akışı:
 * 1. matchPatterns() → WebProduct'ları WheelSize desenleriyle eşleştirir
 * 2. syncMatchedPatterns() → Eşleşen pattern'leri WebWheelSize collection'a kaydeder
 * 3. syncAllPatternRatings() → Tüm pending pattern'ların rating verilerini sırayla çeker
 * 4. syncPatternRatings() → Tek pattern için rating verisini DB'ye kaydeder
 * 5. fetchPatternRatings() → WheelSize API'den pattern detaylarını çeker
 */
class WheelSizeTireService {
    constructor() {
        this.apiKey = process.env.WHEEL_SIZE_API_KEY;
        this.baseURL = process.env.WHEEL_SIZE_API_URL;
        this.translator = new TranslateService();
        if (!this.apiKey) {
            throw new Error('WHEEL_SIZE_API_KEY bulunamadi!');
        }
    }
    /**
     * Desen adını normalize eder (küçük harf, boşluk temizleme, özel karakter silme)
    */
    normalizePattern(pattern) {
        if (!pattern) return '';
        return pattern
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s]/g, '');
    }
    /**
     * WheelSize API'den tüm marka ve desenlerini çeker
    */
    async getTiresVotePatterns() {
        try {
            const brandsResponse = await axios.get(`${this.baseURL}/tires/catalog/`, {
                params: { user_key: this.apiKey },
                timeout: 30000
            });
            const brands = brandsResponse.data.data;
            const allPatterns = [];
            for (const brand of brands) {
                try {
                    const response = await axios.get(`${this.baseURL}/tires/catalog/${brand.slug}/`, {
                        params: { user_key: this.apiKey },
                        timeout: 30000
                    });
                    if (response.data && response.data.data) {
                        const brandPatterns = response.data.data.map(item => ({
                            slug: item.slug,
                            name: item.display,
                            brand: brand.display,
                            normalizedName: this.normalizePattern(item.display)
                        }));

                        allPatterns.push(...brandPatterns);
                    }
                    await new Promise(resolve => setTimeout(resolve, 100));

                } catch (error) { }
            }
            return allPatterns;

        } catch (error) {
            console.error('Desenler cekilemedi:', error.message);
            throw error;
        }
    }
    /**
     * WebProduct'ları WheelSize desenleriyle eşleştirir ve WebWheelSize collection'a kaydeder
     */
    async matchPatterns() {
        try {
            const wheelsizePatterns = await this.getTiresVotePatterns();

            const patternMap = new Map();
            wheelsizePatterns.forEach(pattern => {
                patternMap.set(pattern.normalizedName, pattern);
            });
            const products = await WebProduct.find({})
                .select('_key diaData.ozelkod5kodu diaData.marka diaData.aciklama');

            const results = {
                matched: [],
                unmatched: [],
                stats: {
                    totalProducts: products.length,
                    totalWheelsizePatterns: wheelsizePatterns.length,
                    matchedCount: 0,
                    unmatchedCount: 0
                }
            };
            products.forEach(product => {
                const productPattern = product.diaData.ozelkod5kodu;

                if (!productPattern || productPattern === '' || productPattern.toLowerCase() === 'yok') {
                    results.unmatched.push({
                        productKey: product._key,
                        productPattern: productPattern || '(BOŞ)',
                        productBrand: product.diaData.marka,
                        productName: product.diaData.aciklama
                    });
                    results.stats.unmatchedCount++;
                    return;
                }

                const normalized = this.normalizePattern(productPattern);
                const match = patternMap.get(normalized);

                if (match) {
                    results.matched.push({
                        productKey: product._key,
                        productPattern: productPattern,
                        productBrand: product.diaData.marka,
                        productName: product.diaData.aciklama,
                        wheelsizeSlug: match.slug,
                        wheelsizeName: match.name,
                        wheelsizeBrand: match.brand
                    });
                    results.stats.matchedCount++;
                } else {
                    results.unmatched.push({
                        productKey: product._key,
                        productPattern: productPattern,
                        productBrand: product.diaData.marka,
                        productName: product.diaData.aciklama
                    });
                    results.stats.unmatchedCount++;
                }
            });
            const syncResult = await this.syncMatchedPatterns(results.matched);
            results.syncResult = syncResult;
            return results;

        } catch (error) {
            throw error;
        }
    }
    /**
     * Eşleşen ürünleri pattern bazlı gruplara ayırıp WebWheelSize collection'a kaydeder
     */
    async syncMatchedPatterns(matchedResults) {
        try {
            const patternMap = new Map();
            matchedResults.forEach(item => {
                const key = item.wheelsizeSlug;

                if (!patternMap.has(key)) {
                    patternMap.set(key, {
                        patternSlug: item.wheelsizeSlug,
                        patternName: item.wheelsizeName,
                        brandSlug: item.wheelsizeBrand.toLowerCase().replace(/\s+/g, '-'),
                        productKeys: []
                    });
                }

                patternMap.get(key).productKeys.push(item.productKey);
            });

            let savedCount = 0;
            let updatedCount = 0;

            for (const [slug, data] of patternMap) {
                const existing = await WebWheelSize.findOne({ patternSlug: slug });

                if (existing) {
                    const newKeys = data.productKeys.filter(k => !existing.productKeys.includes(k));
                    if (newKeys.length > 0) {
                        existing.productKeys.push(...newKeys);
                        await existing.save();
                        updatedCount++;
                    }
                } else {
                    await WebWheelSize.create(data);
                    savedCount++;
                }
            }

            return {
                totalPatterns: patternMap.size,
                saved: savedCount,
                updated: updatedCount
            };

        } catch (error) {
            console.error('Pattern sync hatasi:', error.message);
            throw error;
        }
    }
    /**
     * Tüm pending pattern'ların rating verilerini sırayla çeker ve kaydeder
     */
    async syncAllPatternRatings() {
        const patterns = await WebWheelSize.find({ syncStatus: 'pending' });

        for (const pattern of patterns) {
            try {
                await this.syncPatternRatings(pattern.patternSlug, pattern.brandSlug);
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) { }
        }
    }
    /**
    * Pattern yorum detaylarını API'den getirir
    */
    async fetchPatternRatings(brandSlug, patternSlug) {
        const response = await axios.get(
            `${this.baseURL}/tires/catalog/${brandSlug}/${patternSlug}/`,
            {
                params: { user_key: this.apiKey },
                timeout: 30000
            }
        );

        return response.data;
    }
    /**
     * Pattern rating verilerini DB'ye kaydeder
     */
    async syncPatternRatings(patternSlug, brandSlug) {
        const data = await this.fetchPatternRatings(brandSlug, patternSlug);
        const rating = data.data.rating;

        if (rating && rating.tags && rating.tags.length > 0) {
            const displayTexts = rating.tags.map(tag => tag.display);
            const displayTranslations = await this.translator.translateBatch(displayTexts);

            const connotationTexts = rating.tags.map(tag => tag.connotation);
            const connotationTranslations = await this.translator.translateBatch(connotationTexts);

            rating.tags = rating.tags.map((tag, index) => ({
                slug: tag.slug,
                display: displayTranslations[index],
                connotation: connotationTranslations[index]
            }));
        }

        await WebWheelSize.findOneAndUpdate(
            { patternSlug },
            {
                'wheelsizeData.ratings': rating,
                syncStatus: 'synced',
                lastSync: new Date()
            }
        );
    }
}

module.exports = WheelSizeTireService;