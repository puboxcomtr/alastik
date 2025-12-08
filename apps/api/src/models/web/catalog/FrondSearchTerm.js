const mongoose = require('mongoose');

const frondSearchTermSchema = new mongoose.Schema({
    term: { type: String, required: true },
    normalizedTerm: { type: String, required: true, index: true },
    searchCount: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
    isMatched: { type: Boolean, default: false },
    matchType: {
        type: String,
        enum: ['tag', 'url', 'product', 'category', 'brand', null],
        default: null
    },
    matchValue: { type: String, default: '' },
    lastSearched: { type: Date, default: Date.now }
}, {
    timestamps: true,
    collection: 'frond_search_terms'
});

frondSearchTermSchema.index({ normalizedTerm: 1 });
frondSearchTermSchema.index({ isActive: 1, isMatched: 1 });

module.exports = mongoose.model('FrondSearchTerm', frondSearchTermSchema);