const mongoose = require('mongoose');
const { SITE_SLUGS } = require('../../../config/sites');

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const hexColor = { type: String, default: '', trim: true, validate: { validator: v => v === '' || HEX_COLOR.test(v), message: 'Renk #RRGGBB biçiminde olmalıdır' } };

const webProductButtonSchema = new mongoose.Schema({
    site: { type: String, enum: SITE_SLUGS, required: true, index: true },
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    content: { type: String, default: '' },
    colorFrom: hexColor,
    colorTo: hexColor,
    textColor: hexColor,
    icon: { type: String, default: '', trim: true },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
}, {
    timestamps: true,
    collection: 'webproductbuttons'
});

webProductButtonSchema.index({ site: 1, key: 1 }, { unique: true });

module.exports = mongoose.models.WebProductButton || mongoose.model('WebProductButton', webProductButtonSchema);
module.exports.HEX_COLOR = HEX_COLOR;
