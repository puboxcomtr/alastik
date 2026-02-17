const mongoose = require('mongoose');

const webChampionshipSchema = new mongoose.Schema({
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

webChampionshipSchema.index({ productKey: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('WebChampionship', webChampionshipSchema);