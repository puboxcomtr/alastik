const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  productId: {
    type: String,
    required: true
  },
  productName: String,
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {
    type: Number,
    required: true
  },
  totalPrice: {
    type: Number,
    required: true
  }
}, { _id: false });

const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  sessionId: {
    type: String,
    sparse: true
  },
  items: [cartItemSchema],
  status: {
    type: String,
    enum: ['active', 'abandoned', 'completed'],
    default: 'active'
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  }
}, {
  timestamps: true
});

cartSchema.index({ userId: 1, status: 1 });
cartSchema.index({ sessionId: 1, status: 1 });
cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

cartSchema.virtual('totalAmount').get(function () {
  return this.items.reduce((sum, item) => sum + item.totalPrice, 0);
});

module.exports = mongoose.model('Cart', cartSchema);