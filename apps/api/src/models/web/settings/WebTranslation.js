const mongoose = require('mongoose');
const { SITES, DEFAULT_SITE } = require('../../../config/sites');

const webTranslationSchema = new mongoose.Schema({
    site: {
        type: String,
        enum: Object.keys(SITES),
        default: DEFAULT_SITE,
        required: true,
        index: true
    },
    key: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    value: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        default: 'general',
        enum: ['general', 'form', 'menu', 'message', 'product', 'other']
    },
    description: {
        type: String,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    collection: 'webtranslations'
});

webTranslationSchema.index({ site: 1, key: 1 }, { unique: true });
webTranslationSchema.index({ category: 1, isActive: 1 });
webTranslationSchema.index({ key: 'text', value: 'text' });

webTranslationSchema.statics.getByKey = function (key, site = DEFAULT_SITE) {
    return this.findOne({ key, site, isActive: true });
};

webTranslationSchema.statics.getByCategory = function (category, site = DEFAULT_SITE) {
    return this.find({ category, site, isActive: true }).sort({ key: 1 });
};

webTranslationSchema.statics.getAllActive = function (site = DEFAULT_SITE) {
    return this.find({ site, isActive: true }).sort({ category: 1, key: 1 });
};

webTranslationSchema.statics.bulkUpdateTranslations = async function (translations, site = DEFAULT_SITE) {
    const operations = translations.map(({ key, value }) => ({
        updateOne: {
            filter: { key, site },
            update: { $set: { value, updatedAt: new Date() } },
            upsert: true
        }
    }));

    return this.bulkWrite(operations);
};

module.exports = mongoose.model('WebTranslation', webTranslationSchema);