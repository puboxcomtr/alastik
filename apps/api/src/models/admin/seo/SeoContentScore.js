const mongoose = require('mongoose');
const { SITES, DEFAULT_SITE } = require('../../../config/sites');

const CONTENT_TYPES = ['product', 'page', 'blog', 'category', 'brand', 'tag'];
const SCORE_STATUSES = ['good', 'fair', 'poor', 'none'];

const checkSchema = new mongoose.Schema({
    key: { type: String, required: true },
    group: { type: String, required: true },
    label: { type: String, required: true },
    passed: { type: Boolean, default: null },
    weight: { type: Number, default: 0 },
    detail: { type: String, default: '' }
}, { _id: false });

const seoContentScoreSchema = new mongoose.Schema({
    site: { type: String, enum: Object.keys(SITES), default: DEFAULT_SITE, required: true },
    type: { type: String, enum: CONTENT_TYPES, required: true },
    refId: { type: String, required: true },
    title: { type: String, default: '' },
    url: { type: String, default: '' },
    editPath: { type: String, default: '' },
    contentStatus: { type: String, default: '' },
    focusKeyword: { type: String, default: '' },
    source: { type: String, enum: ['custom', 'template', 'empty'], default: 'empty' },
    score: { type: Number, default: 0 },
    status: { type: String, enum: SCORE_STATUSES, default: 'none' },
    passed: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    checks: { type: [checkSchema], default: [] },
    stats: { type: mongoose.Schema.Types.Mixed, default: {} },
    effective: {
        title: { type: String, default: '' },
        description: { type: String, default: '' },
        slug: { type: String, default: '' }
    },
    scanId: { type: String, default: '' },
    scannedAt: { type: Date, default: Date.now }
}, {
    timestamps: false,
    collection: 'seo_content_scores'
});

seoContentScoreSchema.index({ site: 1, type: 1, refId: 1 }, { unique: true });
seoContentScoreSchema.index({ site: 1, status: 1, score: 1 });
seoContentScoreSchema.index({ site: 1, type: 1, score: 1 });
seoContentScoreSchema.index({ site: 1, scanId: 1 });
seoContentScoreSchema.index({ title: 'text', focusKeyword: 'text' });

module.exports = mongoose.model('SeoContentScore', seoContentScoreSchema);
module.exports.CONTENT_TYPES = CONTENT_TYPES;
module.exports.SCORE_STATUSES = SCORE_STATUSES;
