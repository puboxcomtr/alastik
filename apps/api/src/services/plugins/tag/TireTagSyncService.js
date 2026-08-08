/**
 * TireTagSyncService
 *
 * Lastik etiketlerini webproducts ile senkronize eder.
 *
 * 3 tip etiket eşleştirir:
 *   - tire_size + season:all  -> "215 45 R18 Lastikleri Fiyatları"
 *   - tire_size + season:X    -> "215 45 R18 Yaz Lastikleri Fiyatları"
 *   - general                 -> "215 45 R18 Pirelli Yaz Lastikleri Fiyatları"
 */

const mongoose = require('mongoose');
const WebProduct = require('../../../models/web/catalog/WebProduct');
const WebTag = require('../../../models/web/catalog/WebTag');
const { SITES } = require('../../../config/sites');

const MEVSIM_MAP = {
    'Yaz': { season: 'summer', label: 'Yaz' },
    'Kış': { season: 'winter', label: 'Kış' },
    '4 Mevsim': { season: 'all_season', label: '4 Mevsim' }
};

const OZELKOD3_REGEX = /^(\d{2,3})\/(\d{2,3})\s*R(\d{2,3})(C?)$/i;

class TireTagSyncService {

    static parseOzelkod3(str) {
        if (!str || typeof str !== 'string') return null;
        const match = str.trim().match(OZELKOD3_REGEX);
        if (!match) return null;
        return {
            width: match[1],
            aspect: match[2],
            diameter: match[3],
            suffix: match[4] ? match[4].toUpperCase() : ''
        };
    }

    static buildOlcuPrefix(parsed) {
        return `${parsed.width} ${parsed.aspect} R${parsed.diameter}${parsed.suffix || ''}`;
    }

    static escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    static addToCache(cache, tagId, productKey) {
        const idStr = tagId.toString();
        if (!cache.has(idStr)) cache.set(idStr, new Set());
        cache.get(idStr).add(productKey);
    }

    static async flushToDb(tagsCache) {
        const ops = [];
        for (const [tagId, productSet] of tagsCache) {
            const productList = Array.from(productSet);
            ops.push({
                updateOne: {
                    filter: { _id: new mongoose.Types.ObjectId(tagId) },
                    update: {
                        $set: {
                            products: productList,
                            productCount: productList.length,
                            isActive: true
                        }
                    }
                }
            });
        }

        if (ops.length === 0) return { matched: 0, modified: 0 };

        const result = await WebTag.bulkWrite(ops, { ordered: false });
        return { matched: result.matchedCount, modified: result.modifiedCount };
    }

    /**
     * Ana sync metodu — her site için ayrı çalışır:
     * sitenin etiketleri yalnızca o sitede yayında olan ürünlerle eşleştirilir.
     * @param {Object} options
     * @param {boolean} options.dryRun - DB'ye yazma yapma
     * @param {number}  options.limit  - Test için ürün limiti (0 = sınırsız, site başına)
     * @param {Function} options.onProgress - Progress callback (her 500 üründe)
     */
    static async sync(options = {}) {
        const { dryRun = false, limit = 0, onProgress = null } = options;

        const tagsCache = new Map();
        const stats = {
            totalProducts: 0,
            processedProducts: 0,
            skippedNoOlcu: 0,
            skippedFormat: 0,
            matchedSizeOnly: 0,
            matchedSizeSeason: 0,
            matchedBrandSizeSeason: 0,
            productsWithoutAnyMatch: 0,
            tagsToUpdate: 0,
            dbMatched: 0,
            dbModified: 0
        };

        const siteSlugs = Object.keys(SITES);

        // Toplamı baştan hesapla (progress yüzdesi doğru aksın)
        for (const site of siteSlugs) {
            stats.totalProducts += await WebProduct.countDocuments({ 'diaData.ozelkod7kodu': 'LASTİK', sites: site });
        }

        for (const site of siteSlugs) {
            const productFilter = { 'diaData.ozelkod7kodu': 'LASTİK', sites: site };

            const queryBuilder = WebProduct.find(productFilter)
                .select('_key diaData.ozelkod3kodu diaData.ozelkod1kodu diaData.marka')
                .lean();

            if (limit > 0) queryBuilder.limit(limit);

            const cursor = queryBuilder.cursor();

            for await (const product of cursor) {
                stats.processedProducts++;

                const olcu = product.diaData?.ozelkod3kodu;
                const mevsim = product.diaData?.ozelkod1kodu;
                const marka = product.diaData?.marka;
                const productKey = product._key;

                if (!olcu) {
                    stats.skippedNoOlcu++;
                    continue;
                }

                const parsed = this.parseOzelkod3(olcu);
                if (!parsed) {
                    stats.skippedFormat++;
                    continue;
                }

                const olcuPrefix = this.buildOlcuPrefix(parsed);
                const olcuPrefixEsc = this.escapeRegex(olcuPrefix);
                const mevsimInfo = MEVSIM_MAP[mevsim];

                let matchedAtLeastOne = false;

                // TIP 1: Sadece ölçü
                const sizeOnlyTag = await WebTag.findOne({
                    site: site,
                    type: 'tire_size',
                    season: 'all',
                    title: { $regex: new RegExp(`^${olcuPrefixEsc} Lastikleri Fiyatları$`, 'i') }
                }).select('_id').lean();

                if (sizeOnlyTag) {
                    this.addToCache(tagsCache, sizeOnlyTag._id, productKey);
                    stats.matchedSizeOnly++;
                    matchedAtLeastOne = true;
                }

                // TIP 2: Ölçü + Mevsim
                if (mevsimInfo) {
                    const sizeSeasonTag = await WebTag.findOne({
                        site: site,
                        type: 'tire_size',
                        season: mevsimInfo.season,
                        title: { $regex: new RegExp(`^${olcuPrefixEsc} ${this.escapeRegex(mevsimInfo.label)} Lastikleri Fiyatları$`, 'i') }
                    }).select('_id').lean();

                    if (sizeSeasonTag) {
                        this.addToCache(tagsCache, sizeSeasonTag._id, productKey);
                        stats.matchedSizeSeason++;
                        matchedAtLeastOne = true;
                    }
                }

                // TIP 3: Ölçü + Marka + Mevsim
                if (mevsimInfo && marka) {
                    const markaEsc = this.escapeRegex(marka);
                    const brandTag = await WebTag.findOne({
                        site: site,
                        type: 'general',
                        title: { $regex: new RegExp(`^${olcuPrefixEsc} ${markaEsc} ${this.escapeRegex(mevsimInfo.label)} Lastikleri Fiyatları$`, 'i') }
                    }).select('_id').lean();

                    if (brandTag) {
                        this.addToCache(tagsCache, brandTag._id, productKey);
                        stats.matchedBrandSizeSeason++;
                        matchedAtLeastOne = true;
                    }
                }

                if (!matchedAtLeastOne) stats.productsWithoutAnyMatch++;

                if (stats.processedProducts % 500 === 0 && typeof onProgress === 'function') {
                    onProgress({
                        processed: stats.processedProducts,
                        total: stats.totalProducts
                    });
                }
            }
        }

        stats.tagsToUpdate = tagsCache.size;

        if (!dryRun) {
            const dbResult = await this.flushToDb(tagsCache);
            stats.dbMatched = dbResult.matched;
            stats.dbModified = dbResult.modified;
        }

        return { stats, tagsCache: dryRun ? tagsCache : null };
    }
}

module.exports = TireTagSyncService;