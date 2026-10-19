const mongoose = require('mongoose');

const b2bOrderDetailSchema = new mongoose.Schema({
    site: { type: String, default: 'b2b' },
    orderNumber: { type: String, index: true },
    diaCustomerKey: { type: String },
    order: { type: mongoose.Schema.Types.Mixed },
    syncedAt: { type: Date }
}, { collection: 'b2borderdetail' });

b2bOrderDetailSchema.index({ site: 1, orderNumber: 1 }, { unique: true });

module.exports = mongoose.models.B2bOrderDetail || mongoose.model('B2bOrderDetail', b2bOrderDetailSchema);
