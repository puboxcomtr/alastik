const mongoose = require('mongoose');
const { SITE_SLUGS } = require('../../../config/sites');

const CUSTOMER_TIERS = [
    { id: 'premium', title: 'Premium Cari' },
    { id: 'normal', title: 'Normal Cari' }
];

const STOCK_SOURCES = [
    { id: 'own', title: 'Stoktaki Ürünler', syncSource: 'dia_api' },
    { id: 'xml', title: 'XML Ürünleri', syncSource: 'xml_integration' }
];

const financialDiscountSchema = new mongoose.Schema({
    site: { type: String, enum: SITE_SLUGS, required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    customerTier: { type: String, enum: CUSTOMER_TIERS.map(t => t.id), required: true },
    paymentMethod: { type: String, required: true },
    categories: { type: [String], default: [] },
    subCategories: {
        type: [{ _id: false, main: { type: String, required: true }, name: { type: String, required: true } }],
        default: []
    },
    brands: { type: [String], default: [] },
    productionYear: { type: String, default: '', trim: true },
    productionYearAndOlder: { type: Boolean, default: false },
    stockSource: { type: String, enum: ['', ...STOCK_SOURCES.map(x => x.id)], default: '' },
    rate: { type: Number, required: true, min: 0, max: 100 },
    isActive: { type: Boolean, default: true },
    scopeKey: { type: String, required: true }
}, { timestamps: true });

financialDiscountSchema.index({ site: 1, scopeKey: 1 }, { unique: true });

function buildScopeKey({ customerTier, paymentMethod, productionYear, productionYearAndOlder, categories, subCategories, brands, stockSource }) {
    const sorted = list => [...list].sort((a, b) => a.localeCompare(b, 'tr')).join(',');
    return [
        customerTier,
        paymentMethod,
        productionYear ? `${productionYear}${productionYearAndOlder ? '-' : ''}` : '',
        sorted(categories || []),
        sorted((subCategories || []).map(s => `${s.main}>${s.name}`)),
        sorted(brands || []),
        stockSource || ''
    ].join('|');
}

const FinancialDiscount = mongoose.model('FinancialDiscount', financialDiscountSchema);

module.exports = FinancialDiscount;
module.exports.CUSTOMER_TIERS = CUSTOMER_TIERS;
module.exports.buildScopeKey = buildScopeKey;
module.exports.STOCK_SOURCES = STOCK_SOURCES;
