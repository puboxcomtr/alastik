const mongoose = require('mongoose');
const { SITES, DEFAULT_SITE } = require('../../../config/sites');

/** Takip edilen anahtar kelimeler (SEO > Anahtar Kelimeler sekmesi) */
const seoKeywordSchema = new mongoose.Schema({
    site: { type: String, enum: Object.keys(SITES), default: DEFAULT_SITE, required: true },
    keyword: { type: String, required: true, trim: true },
    // Küçük harf, tek boşluk — Search Console sorgularıyla eşleştirme anahtarı
    normalized: { type: String, required: true },
    // Nereden eklendi: elle, ürün anahtar kelimesi, vitrin araması, Search Console
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
