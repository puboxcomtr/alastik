const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
    productKey: { type: String, required: true },
    productName: String,
    productImage: String,
    productSlug: String,
    brandName: String,
    quantity: { type: Number, required: true, min: 1, default: 1 },
    unitPrice: { type: Number, required: true },
    originalPrice: { type: Number, default: 0 },
    kdvRate: { type: Number, default: 20 },
    // Montaj hizmeti: hangi anlaşmalı noktadan seçildi (kimlik satın alma sonrası açılır, sepette anonim etiket)
    montagePointId: { type: String, default: '' },
    montagePointLabel: { type: String, default: '' },
    addedAt: { type: Date, default: Date.now }
}, { _id: false });

const webCartSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    items: [cartItemSchema],
    lastActivity: { type: Date, default: Date.now },
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 gün
        index: true
    }
}, {
    timestamps: true,
    collection: 'carts'
});

// Compound index
webCartSchema.index({ sessionId: 1, userId: 1 });

// TTL index - süresi dolan sepetleri otomatik sil
webCartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Toplam hesaplama virtual
webCartSchema.virtual('totals').get(function () {
    let subtotal = 0;
    let totalKdv = 0;

    this.items.forEach(item => {
        const itemTotal = item.unitPrice * item.quantity;
        const kdvAmount = itemTotal * (item.kdvRate / 100);
        subtotal += itemTotal;
        totalKdv += kdvAmount;
    });

    return {
        subtotal,
        kdv: totalKdv,
        total: subtotal + totalKdv,
        itemCount: this.items.reduce((sum, item) => sum + item.quantity, 0)
    };
});

webCartSchema.set('toJSON', { virtuals: true });
webCartSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('WebCart', webCartSchema);