const mongoose = require('mongoose');
const { SITE_SLUGS } = require('../../../config/sites');

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

webRedirectSchema.statics.normalizeSource = function (value) {
    let path = String(value || '').trim();
    try {
        if (/^https?:\/\//i.test(path)) path = new URL(path).pathname;
    } catch {  }
    path = path.split('?')[0].split('#')[0];
    if (!path.startsWith('/')) path = '/' + path;
    if (path.length > 1) path = path.replace(/\/+$/, '');
    return path.toLowerCase();
};

module.exports = mongoose.model('WebRedirect', webRedirectSchema);
