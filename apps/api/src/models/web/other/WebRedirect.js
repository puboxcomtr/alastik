const mongoose = require('mongoose');
const { SITE_SLUGS } = require('../../../config/sites');

/**
 * Link yönlendirme kaydı: eski URL (source) yeni URL'ye (target) 301 ile yönlenir.
 * source her zaman normalize edilmiş path olarak tutulur (küçük harf, baştaki /).
 */
const webRedirectSchema = new mongoose.Schema({
    site: { type: String, enum: SITE_SLUGS, required: true, index: true },
    source: { type: String, required: true, trim: true },
    target: { type: String, required: true, trim: true },
    statusCode: { type: Number, enum: [301, 302], default: 301 },
    isActive: { type: Boolean, default: true },
    note: { type: String, default: '' }
}, {
    timestamps: true,
    collection: 'webredirects'
});

webRedirectSchema.index({ site: 1, source: 1 }, { unique: true });

// URL/path'i eşleştirme anahtarına çevirir: domain atılır, küçük harf,
// sondaki / temizlenir (kök hariç), query string atılır
webRedirectSchema.statics.normalizeSource = function (value) {
    let path = String(value || '').trim();
    try {
        if (/^https?:\/\//i.test(path)) path = new URL(path).pathname;
    } catch { /* geçersiz URL ise olduğu gibi devam */ }
    path = path.split('?')[0].split('#')[0];
    if (!path.startsWith('/')) path = '/' + path;
    if (path.length > 1) path = path.replace(/\/+$/, '');
    return path.toLowerCase();
};

module.exports = mongoose.model('WebRedirect', webRedirectSchema);
