const mongoose = require('mongoose');
const { SITE_SLUGS } = require('../../../config/sites');

const cartItemSchema = new mongoose.Schema({
    productKey: { type: String, required: true },
    productName: String,
    productImage: String,
    productSlug: String,
    brandName: String,
    quantity: { type: Number, required: true, min: 1, default: 1 },
    unitPrice: { type: Number, required: true },
    originalPrice: { type: Number, default: 0 },
    shippingPerUnit: { type: Number, default: 0 },
    kdvRate: { type: Number, default: 20 },
    priceDisplay: { type: String, enum: ['dahil', 'haric'], default: 'dahil' },
    montagePointId: { type: String, default: '' },
    montagePointLabel: { type: String, default: '' },
    itemType: { type: String, enum: ['tire', 'montage', 'service', 'product'], default: 'product' },
    rimSize: { type: Number, default: null },
    rimRange: { type: { min: Number, max: Number }, default: null },
    ownTire: { type: Boolean, default: false },
    addedAt: { type: Date, default: Date.now }
}, { _id: false });

const CART_FOLLOW_UP_STATUSES = ['pending', 'contacted'];

const webCartSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, index: true },
    followUpStatus: { type: String, enum: CART_FOLLOW_UP_STATUSES, default: 'pending' },
    followUpAt: { type: Date },
    followUpBy: { type: String, default: '' },
    site: { type: String, enum: SITE_SLUGS, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    items: [cartItemSchema],
    lastActivity: { type: Date, default: Date.now },
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        index: true
    }
}, {
    timestamps: true,
    collection: 'carts'
});

webCartSchema.index({ sessionId: 1, userId: 1 });

webCartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

webCartSchema.virtual('totals').get(function () {
    let subtotal = 0;
    let totalKdv = 0;
    let montageSubtotal = 0;
    let shippingTotal = 0;

    this.items.forEach(item => {
        const itemTotal = item.unitPrice * item.quantity;
        const isMontage = item.itemType === 'montage' || item.itemType === 'service';

        let netAmount = itemTotal;
        if (item.priceDisplay === 'haric') {
            const rate = item.kdvRate > 0 ? item.kdvRate : 20;
            const kdvAmount = itemTotal * rate / (100 + rate);
            netAmount = itemTotal - kdvAmount;
            totalKdv += kdvAmount;
        }

        subtotal += netAmount;
        if (isMontage) montageSubtotal += netAmount;
        shippingTotal += (item.shippingPerUnit || 0) * item.quantity;
    });

    const yuvarla = (v) => Math.round(v * 100) / 100;

    return {
        subtotal: yuvarla(subtotal),
        productsSubtotal: yuvarla(subtotal - montageSubtotal),
        montage: yuvarla(montageSubtotal),
        kdv: yuvarla(totalKdv),
        shipping: yuvarla(shippingTotal),
        total: yuvarla(subtotal + totalKdv + shippingTotal),
        itemCount: this.items.reduce((sum, item) => sum + item.quantity, 0)
    };
});

webCartSchema.set('toJSON', { virtuals: true });
webCartSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('WebCart', webCartSchema);
module.exports.CART_FOLLOW_UP_STATUSES = CART_FOLLOW_UP_STATUSES;
