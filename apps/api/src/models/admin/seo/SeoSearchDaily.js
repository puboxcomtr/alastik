const mongoose = require('mongoose');
const { SITES, DEFAULT_SITE } = require('../../../config/sites');

/**
 * Google Search Console günlük anlık görüntüsü.
 * Her satır: bir site, bir gün, bir boyut (sorgu ya da sayfa) ve o boyutun anahtarı.
 * Rapor sekmesi Google'a gitmeden bu tablodan hesaplanır; gece işi son günleri yeniden yazar.
 */
const seoSearchDailySchema = new mongoose.Schema({
    site: { type: String, enum: Object.keys(SITES), default: DEFAULT_SITE, required: true },
    // YYYY-MM-DD (Search Console biçimi)
    date: { type: String, required: true },
    dimension: { type: String, enum: ['query', 'page'], required: true },
    // Sorgu metni ya da sayfa URL'i
    key: { type: String, required: true },
    clicks: { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    // 0-1 arası (Search Console ham değeri)
    ctr: { type: Number, default: 0 },
    position: { type: Number, default: 0 }
}, {
    timestamps: false,
    collection: 'seo_search_daily'
});

seoSearchDailySchema.index({ site: 1, dimension: 1, date: 1, key: 1 }, { unique: true });
seoSearchDailySchema.index({ site: 1, dimension: 1, key: 1, date: 1 });

module.exports = mongoose.model('SeoSearchDaily', seoSearchDailySchema);
