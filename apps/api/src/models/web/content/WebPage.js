// apps/api/src/models/web/content/WebPage.js
const mongoose = require('mongoose');

const pageSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    content: { type: String, default: '<p></p>' },
    excerpt: { type: String, trim: true, default: '' },
    seo: {
        metaTitle: { type: String, default: '' },
        metaDescription: { type: String, default: '' },
        metaKeywords: { type: [String], default: [] }
    },
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'published' },
    template: { type: String, enum: ['default', 'full-width', 'landing', 'contact'], default: 'default' },
    publishedAt: { type: Date, default: null },
    viewCount: { type: Number, default: 0 }
}, {
    timestamps: true,
    collection: 'pages'
});

pageSchema.index({ slug: 1 });
pageSchema.index({ status: 1 });

module.exports = mongoose.model('WebPage', pageSchema);