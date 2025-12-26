// apps/api/src/services/plugins/wheelsize/WheelSizeTireService.js
const axios = require('axios');
const cheerio = require('cheerio');
const WebProduct = require('../../../../models/web/catalog/WebProduct');
const WebWheelSize = require('../../../../models/web/catalog/WebWheelSize');
const Blog = require('../../../../models/admin/content/Blog');
const TranslateService = require('../../translate/TranslateService');

/**
 * WheelSize TiresVote Entegrasyon Servisi
 * matchPatterns() → WebProduct'ları WheelSize desenleriyle eşleştirir
 * syncMatchedPatterns() → Eşleşen pattern'leri WebWheelSize collection'a kaydeder
 * syncAllPatternRatings() → Tüm pending pattern'ların rating verilerini sırayla çeker
 * syncPatternRatings() → Tek pattern için rating verisini DB'ye kaydeder
 * fetchPatternRatings() → WheelSize API'den pattern detaylarını çeker
 * fetchPatternBuyNotBuy() → Pattern buy/not buy verilerini API'den getirir
 * fetchPatternMaterials() → Pattern materials (videolar ve article'lar) API'den getirir
 * saveMaterialsToBlogs() → Article/benchmark içeriklerini scrape edip blogs collection'a kaydeder
 * fetchArticleContent() → Article sayfasından içeriği web scraping ile çeker ve temizler
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

        let weThink = null;
        if (data.data.tags && data.data.tags.length > 0) {
            const translations = await this.translator.translateBatch(data.data.tags);

            weThink = data.data.tags.map((tag, index) => ({
                slug: tag.toLowerCase().replace(/\s+/g, '-'),
                display: translations[index]
                    .toLowerCase()
                    .split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ')
            }));
        }

        let buyNotBuy = null;
        try {
            const bnbData = await this.fetchPatternBuyNotBuy(brandSlug, patternSlug);

            if (bnbData.data) {
                const buyTexts = bnbData.data.buy ? bnbData.data.buy.map(item => item.text) : [];
                const notBuyTexts = bnbData.data.not_buy ? bnbData.data.not_buy.map(item => item.text) : [];

                const buyTranslations = buyTexts.length > 0 ? await this.translator.translateBatch(buyTexts) : [];
                const notBuyTranslations = notBuyTexts.length > 0 ? await this.translator.translateBatch(notBuyTexts) : [];

                buyNotBuy = {
                    buy: bnbData.data.buy ? bnbData.data.buy.map((item, index) => ({
                        text: buyTranslations[index],
                        upvotes: item.upvotes
                    })) : [],
                    notBuy: bnbData.data.not_buy ? bnbData.data.not_buy.map((item, index) => ({
                        text: notBuyTranslations[index],
                        upvotes: item.upvotes
                    })) : []
                };
            }
        } catch (error) { }

        let materials = null;
        try {
            const materialsData = await this.fetchPatternMaterials(brandSlug, patternSlug);
            if (materialsData.data && materialsData.data.length > 0) {
                await this.saveMaterialsToBlogs(materialsData.data, patternSlug);

                const videos = materialsData.data.filter(item => item.type === 'video');

                if (videos.length > 0) {
                    const titles = videos.map(v => v.title);
                    const translatedTitles = await this.translator.translateBatch(titles);

                    materials = videos.map((video, index) => ({
                        title: translatedTitles[index],
                        url: video.video_url,
                        publishedAt: video.publication_date
                    }));
                }
            }
        } catch (error) { }

        await WebWheelSize.findOneAndUpdate(
            { patternSlug },
            {
                'wheelsizeData.ratings': { ...rating, weThink },
                'wheelsizeData.buyNotBuy': buyNotBuy,
                'wheelsizeData.year': data.data.year || null,
                'wheelsizeData.materials': materials,
                syncStatus: 'synced',
                lastSync: new Date()
            }
        );
    }
    /**
     * Pattern buy/not buy verilerini API'den getirir
     */
    async fetchPatternBuyNotBuy(brandSlug, patternSlug) {
        const response = await axios.get(
            `${this.baseURL}/tires/catalog/${brandSlug}/${patternSlug}/bnb/`,
            {
                params: { user_key: this.apiKey },
                timeout: 30000
            }
        );
        return response.data;
    }
    /**
     * Pattern materials (videolar) API'den getirir
     */
    async fetchPatternMaterials(brandSlug, patternSlug) {
        const response = await axios.get(
            `${this.baseURL}/tires/catalog/${brandSlug}/${patternSlug}/materials/`,
            {
                params: { user_key: this.apiKey },
                timeout: 30000
            }
        );
        return response.data;
    }
    /**
     * Wheelsize Lastik Test Sonuçları Blogs'a kaydeder
     */
    async saveMaterialsToBlogs(materialsData, patternSlug) {
        if (!materialsData || !materialsData.length) return;
        const articles = materialsData.filter(item => item.type === 'article');

        console.log(`${articles.length} article bulundu`);

        for (const article of articles) {
            try {
                const title = await this.translator.translateText(article.title);
                let content;
                const scrapedContent = await this.fetchArticleContent(article.canonical_link);
                if (scrapedContent) {
                    content = await this.translator.translateText(scrapedContent);
                } else {
                    const description = article.lead || '';
                    content = `<p>${await this.translator.translateText(description)}</p>`;
                }

                const slug = (title + '-' + article.publication_date)
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
                    .trim();

                console.log('Blog oluşturuluyor:', title);

                await Blog.create({
                    title,
                    slug,
                    content,
                    excerpt: content.replace(/<[^>]*>/g, '').substring(0, 150),
                    wheelSizePattern: patternSlug,
                    publishedAt: new Date(article.publication_date),
                    createdAt: new Date(article.publication_date),
                    status: 'published'
                });

                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.error('Blog kayıt hatası:', error.message);
            }
        }
    }
    async fetchArticleContent(articleUrl) {
        try {
            const response = await axios.get(articleUrl, { timeout: 30000 });
            const $ = cheerio.load(response.data);
            let content = $('[itemprop="description"]').html();

            if (!content) {
                console.log('İçerik bulunamadı:', articleUrl);
                return null;
            }
            const allowedTags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'a', 'ul', 'li', 'ol', 'br'];
            const $content = cheerio.load(content);

            $content('*').each(function () {
                const tagName = this.tagName;
                if (!allowedTags.includes(tagName)) {
                    $content(this).replaceWith($content(this).html() || '');
                }
            });
            $content('script, style, section, div, span').remove();

            return $content.html().trim();
        } catch (error) {
            console.error('Article scrape hatası:', error.message);
            return null;
        }
    }
}

module.exports = WheelSizeTireService;