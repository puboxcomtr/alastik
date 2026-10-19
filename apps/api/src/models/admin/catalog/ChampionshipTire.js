const mongoose = require('mongoose');
const { SITES, DEFAULT_SITE } = require('../../../config/sites');

const webChampionshipSchema = new mongoose.Schema({
    site: {
        type: String,
        enum: Object.keys(SITES),
        default: DEFAULT_SITE,
        required: true,
        index: true
    },
    productKey: {
        type: String,
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true
    },
    rank: {
        type: Number,
        required: true
    }
}, {
    timestamps: true,
    collection: 'webchampionships'
});

webChampionshipSchema.index({ site: 1, productKey: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('WebChampionship', webChampionshipSchema);