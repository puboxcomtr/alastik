const mongoose = require('mongoose');
const { SITES, DEFAULT_SITE } = require('../../../config/sites');

const seoSearchDailySchema = new mongoose.Schema({
    site: { type: String, enum: Object.keys(SITES), default: DEFAULT_SITE, required: true },
    date: { type: String, required: true },
    dimension: { type: String, enum: ['query', 'page'], required: true },
    key: { type: String, required: true },
    clicks: { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    ctr: { type: Number, default: 0 },
    position: { type: Number, default: 0 }
}, {
    timestamps: false,
    collection: 'seo_search_daily'
});

seoSearchDailySchema.index({ site: 1, dimension: 1, date: 1, key: 1 }, { unique: true });
seoSearchDailySchema.index({ site: 1, dimension: 1, key: 1, date: 1 });

module.exports = mongoose.model('SeoSearchDaily', seoSearchDailySchema);
