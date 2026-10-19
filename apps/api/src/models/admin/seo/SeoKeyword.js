const mongoose = require('mongoose');
const { SITES, DEFAULT_SITE } = require('../../../config/sites');

const seoKeywordSchema = new mongoose.Schema({
    site: { type: String, enum: Object.keys(SITES), default: DEFAULT_SITE, required: true },
    keyword: { type: String, required: true, trim: true },
    normalized: { type: String, required: true },
    source: { type: String, enum: ['manual', 'product', 'search', 'console'], default: 'manual' }
}, {
    timestamps: true,
    collection: 'seo_keywords'
});

seoKeywordSchema.index({ site: 1, normalized: 1 }, { unique: true });

seoKeywordSchema.statics.normalize = function (text) {
    return String(text || '').toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim();
};

module.exports = mongoose.model('SeoKeyword', seoKeywordSchema);
