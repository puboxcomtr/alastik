const mongoose = require('mongoose');
const { DEFAULT_SITE, SITES } = require('../../../config/sites');

const xmlPricingRuleSchema = new mongoose.Schema({
    // Kuralın ait olduğu site — fiyat kuralları site bazlı ayrıdır
    site: {
        type: String,
        enum: Object.keys(SITES),
        default: DEFAULT_SITE,
        index: true
    },
    platform: {
        type: String,
        enum: ['b2b', 'b2c', 'alastik'],
        required: true
    },
    source: {
        type: String,
        default: ''
    },
    marka: {
        type: String,
        default: ''
    },
    tip: {
        type: String,
        enum: ['yuzde_artis', 'yuzde_azalis', 'sabit_artis', 'sabit_azalis'],
        required: true
    },
    deger: {
        type: Number,
        required: true,
        min: 0
    },
    aciklama: {
        type: String,
        default: ''
    },
    sira: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true,
    collection: 'xmlpricingrules'
});

xmlPricingRuleSchema.index({ platform: 1 });
xmlPricingRuleSchema.index({ source: 1, marka: 1 });

module.exports = mongoose.model('XmlPricingRule', xmlPricingRuleSchema);