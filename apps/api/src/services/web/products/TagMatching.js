const mongoose = require('mongoose');
const WebProduct = require('../../../models/web/catalog/WebProduct');
const { SITES, DEFAULT_SITE } = require('../../../config/sites');

// Bilinen marka listesi
const KNOWN_BRANDS = {
    'anteo': 'ANTEO',
    'barum': 'Barum',
    'carset': 'Carset',
    'continental': 'Continental',
    'debica': 'Debica',
    'dunlop': 'Dunlop',
    'falken': 'Falken',
    'gislaved': 'Gislaved',
    'goodyear': 'Goodyear',
    'great-spider': 'Great Spider',
    'hankook': 'Hankook',
    'konak': 'Konak',
    'kormoran': 'Kormoran',
    'kumho': 'Kumho',
    'lassa': 'Lassa',
    'laufenn': 'Laufenn',
    'lja': 'Lja',
    'matador': 'Matador',
    'matte': 'Matte',
    'mefatech': 'Mefatech',
    'michelin': 'Michelin',
    'milestone': 'Milestone',
    'pirelli': 'Pirelli',
    'sava': 'Sava',
    'snowwolf': 'Snowwolf',
    'spikes-spider': 'Spikes Spider',
    'starmaxx': 'Starmaxx',
    'triangle': 'Triangle',
    'varta': 'VARTA'
};

const SEASON_MAP = {
    'kis': 'KIŞ',
    'yaz': 'YAZ',
    '4-mevsim': '4 MEVSİM'
};

class TagMatchingService {

    static parseSeoUrl(seoUrl) {
        const result = { size: null, season: null, brand: null };

        const sizeMatch = seoUrl.match(/^(\d{3})-(\d{2})-r?(\d{2})/i);
        if (!sizeMatch) return null;

        result.size = `${sizeMatch[1]}/${sizeMatch[2]}R${sizeMatch[3]}`;

        const rest = seoUrl.replace(sizeMatch[0], '').replace(/^-/, '');

        if (rest.includes('4-mevsim')) {
            result.season = '4-mevsim';
        } else if (rest.includes('kis')) {
            result.season = 'kis';
        } else if (rest.includes('yaz')) {
            result.season = 'yaz';
        }

        for (const [slug, original] of Object.entries(KNOWN_BRANDS)) {
            if (rest.includes(slug)) {
                result.brand = original;
                break;
            }
        }

        return result;
    }

    /**
     * Tüm ürünleri bir kere çekip ebat+mevsim+marka bazlı index oluşturur (site bazlı)
     */
    static async buildProductIndex(site) {
        const products = await WebProduct.find(
            { 'diaData.durum': 'A', 'syncInfo.diaStatus': 'synced', 'diaData.ozelkod7kodu': 'LASTİK', sites: site },
            { '_key': 1, 'diaData.ozelkod3kodu': 1, 'diaData.ozelkod1kodu': 1, 'diaData.marka': 1 }
        ).lean();

        // ebat bazlı grupla
        const index = {};
        for (const p of products) {
            const size = (p.diaData?.ozelkod3kodu || '').toUpperCase();
            if (!size) continue;

            if (!index[size]) index[size] = [];
            index[size].push({
                _key: p._key,
                season: (p.diaData?.ozelkod1kodu || '').toUpperCase(),
                brand: (p.diaData?.marka || '').toLowerCase()
            });
        }

        return index;
    }

    /**
     * Index üzerinden etiketle eşleşen ürünleri filtreler
     */
    static matchFromIndex(parsed, index) {
        const sizeKey = parsed.size.toUpperCase();
        const sizeProducts = index[sizeKey] || [];

        if (sizeProducts.length === 0) return [];

        return sizeProducts.filter(p => {
            // Mevsim filtresi
            if (parsed.season) {
                const target = SEASON_MAP[parsed.season].toUpperCase();
                if (p.season !== target) return false;
            }
            // Marka filtresi
            if (parsed.brand) {
                if (p.brand !== parsed.brand.toLowerCase()) return false;
            }
            return true;
        }).map(p => p._key);
    }

    /**
     * Tüm etiketler için toplu eşleştirme
     */
    static async runMatching(options = {}) {
        const { dryRun = false, tagType = null } = options;
        const db = mongoose.connection.db;
        const webtagsCol = db.collection('webtags');

        // 1. Ürün index'i oluştur (site başına ayrı — her sitenin etiketi kendi ürünleriyle eşleşir)
        console.log('Ürün indexleri oluşturuluyor (site bazlı)...');
        const indexBySite = {};
        for (const siteSlug of Object.keys(SITES)) {
            indexBySite[siteSlug] = await this.buildProductIndex(siteSlug);
            console.log(`${siteSlug}: ${Object.keys(indexBySite[siteSlug]).length} farklı ebat indexlendi.`);
        }

        // 2. Etiketleri al
        const tagFilter = { isActive: true };
        if (tagType) {
            tagFilter.type = tagType;
        } else {
            tagFilter.type = { $in: ['tire_size', 'general'] };
        }

        const tags = await webtagsCol.find(tagFilter).toArray();
        console.log(`${tags.length} etiket bulundu.`);

        const results = {
            total: tags.length,
            matched: 0,
            skipped: 0,
            updated: 0,
            errors: 0,
            details: []
        };

        // 3. Toplu güncelleme için bulk operations
        const bulkOps = [];

        for (const tag of tags) {
            try {
                const parsed = this.parseSeoUrl(tag.seoUrl);
                if (!parsed) {
                    results.skipped++;
                    results.details.push({
                        seoUrl: tag.seoUrl,
                        status: 'skipped',
                        reason: 'Ebat bulunamadı'
                    });
                    continue;
                }

                const productKeys = this.matchFromIndex(parsed, indexBySite[tag.site] || indexBySite[DEFAULT_SITE]);
                results.matched++;

                results.details.push({
                    seoUrl: tag.seoUrl,
                    parsed,
                    status: 'matched',
                    productCount: productKeys.length
                });

                if (!dryRun && productKeys.length > 0) {
                    bulkOps.push({
                        updateOne: {
                            filter: { _id: tag._id },
                            update: {
                                $set: {
                                    products: productKeys,
                                    productCount: productKeys.length,
                                    updatedAt: new Date()
                                }
                            }
                        }
                    });
                }
            } catch (err) {
                results.errors++;
                results.details.push({
                    seoUrl: tag.seoUrl,
                    status: 'error',
                    reason: err.message
                });
            }
        }

        // 4. Bulk write
        if (bulkOps.length > 0) {
            const bulkResult = await webtagsCol.bulkWrite(bulkOps);
            results.updated = bulkResult.modifiedCount;
            console.log(`${results.updated} etiket güncellendi.`);
        }

        return results;
    }

    /**
     * Tek etiket için çalıştır
     */
    static async matchSingleTag(tagId) {
        const db = mongoose.connection.db;
        const webtagsCol = db.collection('webtags');

        const tag = await webtagsCol.findOne({ _id: new mongoose.Types.ObjectId(tagId) });
        if (!tag) throw new Error('Etiket bulunamadı');

        const parsed = this.parseSeoUrl(tag.seoUrl);
        if (!parsed) {
            return { seoUrl: tag.seoUrl, status: 'skipped', reason: 'Ebat bulunamadı' };
        }

        // Tek etiket için direkt sorgu at (etiketin kendi sitesinin ürünleri)
        const query = {
            'diaData.ozelkod3kodu': new RegExp(`^${parsed.size}$`, 'i'),
            'diaData.durum': 'A',
            'syncInfo.diaStatus': 'synced',
            'diaData.ozelkod7kodu': 'LASTİK',
            sites: tag.site || DEFAULT_SITE
        };

        if (parsed.season) {
            query['diaData.ozelkod1kodu'] = new RegExp(`^${SEASON_MAP[parsed.season]}$`, 'i');
        }
        if (parsed.brand) {
            query['diaData.marka'] = new RegExp(`^${parsed.brand}$`, 'i');
        }

        const products = await WebProduct.find(query, { _key: 1 }).lean();
        const productKeys = products.map(p => p._key);

        if (productKeys.length > 0) {
            await webtagsCol.updateOne(
                { _id: tag._id },
                {
                    $set: {
                        products: productKeys,
                        productCount: productKeys.length,
                        updatedAt: new Date()
                    }
                }
            );
        }

        return {
            seoUrl: tag.seoUrl,
            parsed,
            status: 'matched',
            productCount: productKeys.length
        };
    }
}

module.exports = TagMatchingService;