const mongoose = require('mongoose');

const PaymentTransactionSchema = new mongoose.Schema(
  {
    clientReferenceCode: { type: String, index: true },
    orderNumber: { type: String, index: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', index: true },
    referenceCode: { type: String, index: true },
    transactionId: { type: mongoose.Schema.Types.Mixed, index: true },
    vPosId: { type: Number },
    amount: { type: Number },
    installment: { type: Number },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.models.PaymentTransaction || mongoose.model('PaymentTransaction', PaymentTransactionSchema);

