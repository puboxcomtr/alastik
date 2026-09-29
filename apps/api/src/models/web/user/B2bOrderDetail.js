/**
 * b2b DIA sipariş detayı — ilk açılışta DIA'dan çekilip saklanır (lazy cache).
 * Sonraki açılışlar anında DB'den okunur; DIA yavaşlığı/kesintisi yansımaz.
 */
const mongoose = require('mongoose');

const b2bOrderDetailSchema = new mongoose.Schema({
    site: { type: String, default: 'b2b' },
    orderNumber: { type: String, index: true },
    diaCustomerKey: { type: String }, // sahiplik doğrulaması (sadece sahibi cari okur)
    order: { type: mongoose.Schema.Types.Mixed }, // normalize edilmiş detay (items, pricing, ...)
    syncedAt: { type: Date }
}, { collection: 'b2borderdetail' });

b2bOrderDetailSchema.index({ site: 1, orderNumber: 1 }, { unique: true });

module.exports = mongoose.models.B2bOrderDetail || mongoose.model('B2bOrderDetail', b2bOrderDetailSchema);
