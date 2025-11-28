const mongoose = require('mongoose');

const webTranslationSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
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

webTranslationSchema.index({ key: 1 }, { unique: true });
webTranslationSchema.index({ category: 1, isActive: 1 });
webTranslationSchema.index({ key: 'text', value: 'text' });

webTranslationSchema.statics.getByKey = function (key) {
    return this.findOne({ key, isActive: true });
};

webTranslationSchema.statics.getByCategory = function (category) {
    return this.find({ category, isActive: true }).sort({ key: 1 });
};

webTranslationSchema.statics.getAllActive = function () {
    return this.find({ isActive: true }).sort({ category: 1, key: 1 });
};

webTranslationSchema.statics.bulkUpdateTranslations = async function (translations) {
    const operations = translations.map(({ key, value }) => ({
        updateOne: {
            filter: { key },
            update: { $set: { value, updatedAt: new Date() } },
            upsert: true
        }
    }));

    return this.bulkWrite(operations);
};

module.exports = mongoose.model('WebTranslation', webTranslationSchema);