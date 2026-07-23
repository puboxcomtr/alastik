const mongoose = require('mongoose');

const pageSchema = new mongoose.Schema({
    site: {
        type: String,
        enum: ['alastik', 'lastikjantavm'],
        default: 'alastik',
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    content: {
        type: String,
        required: true,
        default: '<p></p>' 
    },
    excerpt: {
        type: String,
        trim: true,
        default: ''
    },
    seo: {
        metaTitle: {
            type: String,
            default: ''
        },
        metaDescription: {
            type: String,
            default: ''
        },
        metaKeywords: {
            type: [String],
            default: []
        },
        ogImage: {
            type: String,
            default: ''
        }
    },
    status: {
        type: String,
        enum: ['draft', 'published', 'archived'],
        default: 'published' 
    },
    template: {
        type: String,
        enum: ['default', 'full-width', 'landing', 'contact'],
        default: 'default' 
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    publishedAt: {
        type: Date,
        default: null
    },
    viewCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Indexes
pageSchema.index({ slug: 1, site: 1 }, { unique: true });
pageSchema.index({ status: 1 });
pageSchema.index({ publishedAt: -1 });

// Slug otomatik oluştur (eğer yoksa)
pageSchema.pre('save', function (next) {
    if (this.isModified('title') && !this.slug) {
        this.slug = this.title
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
    }

    if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
        this.publishedAt = new Date();
    }

    next();
});

module.exports = mongoose.model('Page', pageSchema);