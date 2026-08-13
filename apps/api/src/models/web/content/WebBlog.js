const mongoose = require('mongoose');

const seoSchema = new mongoose.Schema({
    metaTitle: String,
    metaDescription: String,
    metaKeywords: [String],
    ogImage: String
}, { _id: false });

const webBlogSchema = new mongoose.Schema({
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    content: String,
    excerpt: String,
    seo: seoSchema,
    status: {
        type: String,
        enum: ['draft', 'published', 'archived'],
        default: 'draft'
    },
    publishedAt: Date,
    viewCount: { type: Number, default: 0 },
    wheelSizePattern: { type: String, index: true },
    featuredImage: String,
    showOnHomepage: { type: Boolean, default: false },
    author: String,
    tags: [String],
    // Hangi siteye ait olduğu — vitrin sorguları bu alana göre filtreler
    site: {
        type: String,
        required: true,
        enum: ['alastik', 'lastikjantavm'],
        default: 'alastik',
        index: true
    }
}, {
    timestamps: true,
    collection: 'blogs'
});

webBlogSchema.index({ slug: 1 }, { unique: true });
webBlogSchema.index({ site: 1, status: 1, publishedAt: -1 });
webBlogSchema.index({ status: 1, publishedAt: -1 });
webBlogSchema.index({ wheelSizePattern: 1, status: 1 });
webBlogSchema.index({ tags: 1 });

webBlogSchema.statics.findByPattern = function (pattern) {
    return this.find({
        wheelSizePattern: pattern.toLowerCase(),
        status: 'published'
    }).select('title slug excerpt publishedAt').sort({ publishedAt: -1 });
};

webBlogSchema.statics.findBySlug = function (slug) {
    return this.findOne({ slug, status: 'published' });
};

module.exports = mongoose.model('WebBlog', webBlogSchema);