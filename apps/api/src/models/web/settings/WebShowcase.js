const mongoose = require('mongoose');
const { SITES, DEFAULT_SITE } = require('../../../config/sites');

const showcaseProductSchema = new mongoose.Schema({
  productId: {
    type: String,
    required: true
  },
  order: {
    type: Number,
    default: 0
  }
}, { _id: false });

const webShowcaseSchema = new mongoose.Schema({
  site: { type: String, enum: Object.keys(SITES), default: DEFAULT_SITE, index: true },
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

webShowcaseSchema.index({ order: 1 });
webShowcaseSchema.index({ isActive: 1 });
webShowcaseSchema.index({ createdAt: -1 });

webShowcaseSchema.statics.getActiveShowcases = function () {
  return this.find({ isActive: true }).sort({ order: 1 });
};

module.exports = mongoose.model('WebShowcase', webShowcaseSchema);