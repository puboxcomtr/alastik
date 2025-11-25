const mongoose = require('mongoose');

// Vitrin Ürün Schema
const showcaseProductSchema = new mongoose.Schema({
  productId: {
    type: String,  // ObjectId yerine String
    required: true
  },
  order: {
    type: Number,
    default: 0
  }
}, { _id: false });

// Ana WebShowcase Schema
const webShowcaseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  order: {
    type: Number,
    default: 0
  },
  itemsPerRow: {
    type: Number,
    enum: [1, 2, 3, 4, 5],
    default: 4
  },
  isActive: {
    type: Boolean,
    default: true
  },
  products: [showcaseProductSchema]
}, {
  timestamps: true,
  collection: 'webshowcases'
});

// Index'ler
webShowcaseSchema.index({ order: 1 });
webShowcaseSchema.index({ isActive: 1 });
webShowcaseSchema.index({ createdAt: -1 });

webShowcaseSchema.statics.getActiveShowcases = function () {
  return this.find({ isActive: true }).sort({ order: 1 });
};

module.exports = mongoose.model('WebShowcase', webShowcaseSchema);