const mongoose = require('mongoose');

const mediaMetaSchema = new mongoose.Schema({
    folder: { type: String, required: true },
    filename: { type: String, required: true },
    alt: { type: String, default: '' },
    title: { type: String, default: '' },
    caption: { type: String, default: '' },
    description: { type: String, default: '' }
}, {
    timestamps: true,
    collection: 'mediameta'
});

mediaMetaSchema.index({ folder: 1, filename: 1 }, { unique: true });

module.exports = mongoose.model('MediaMeta', mediaMetaSchema);
