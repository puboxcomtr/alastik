const mongoose = require('mongoose');

const webFavouriteSchema = new mongoose.Schema({
    memberId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WebMember',
        required: true,
        index: true
    },
    productKey: {
        type: String,
        required: true,
        index: true
    }
}, {
    timestamps: true,
    collection: 'webfavourites'
});

// Aynı üye aynı ürünü iki kez eklemesin
webFavouriteSchema.index({ memberId: 1, productKey: 1 }, { unique: true });

module.exports = mongoose.model('WebFavourite', webFavouriteSchema);