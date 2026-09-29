const mongoose = require('mongoose');
const { SITE_SLUGS } = require('../../../config/sites');

// Kategori sayfasındaki kart görselinin oranı: kare, dikey afiş (kampanya görselleri) veya yatay
const CARD_IMAGE_RATIOS = ['square', 'portrait', 'landscape'];

// Blog kategorisi — site başına ayrı (ALastik / LastikJantAVM / B2B). Slug site
// bazında tekildir. Blog ile ilişki blog tarafında çoklu referansla kurulur.
const blogCategorySchema = new mongoose.Schema({
    site: {
        type: String,
        enum: SITE_SLUGS,
        default: 'alastik',
        index: true
    },
    name: {
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
    description: {
        type: String,
        trim: true,
        default: ''
    },
    // Listeleme sırası (küçük olan üstte)
    order: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['active', 'passive'],
        default: 'active'
    },
    cardImageRatio: {
        type: String,
        enum: CARD_IMAGE_RATIOS,
        default: 'square'
    },
    // SEO: kategori sayfası meta bilgileri. URL = slug alanı.
    seo: {
        title: { type: String, default: '' },
        description: { type: String, default: '' }
    }
}, {
    timestamps: true
});

// Slug site başına tekil (aynı slug farklı sitede olabilir)
blogCategorySchema.index({ slug: 1, site: 1 }, { unique: true });
blogCategorySchema.index({ site: 1, order: 1 });

// Türkçe karakterleri sadeleştirerek slug üretir (Blog modeliyle aynı kural)
function slugify(text) {
    return String(text || '')
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
        .replace(/^-|-$/g, '')
        .trim();
}

blogCategorySchema.pre('save', function (next) {
    if (!this.slug && this.name) {
        this.slug = slugify(this.name);
    }
    next();
});

module.exports = mongoose.model('BlogCategory', blogCategorySchema);
module.exports.CARD_IMAGE_RATIOS = CARD_IMAGE_RATIOS;
