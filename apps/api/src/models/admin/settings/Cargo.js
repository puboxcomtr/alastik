const mongoose = require('mongoose');
const { SITES, DEFAULT_SITE } = require('../../../config/sites');

const desiRangeSchema = {
    min: { type: Number, required: true, min: 0 },
    max: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 }
};

function scopedRuleSchema(idField, nameField, refModel, withDiaBrand = false) {
    const def = {
        [idField]: { type: mongoose.Schema.Types.ObjectId, ref: refModel, required: true },
        [nameField]: { type: String, default: '' },
        fixedPrice: { type: Number, default: 0, min: 0 },
        pricingMode: { type: String, enum: ['all', 'size'], default: 'all' },
        sizeRules: {
            type: [{
                size: { type: String, required: true, trim: true },
                price: { type: Number, required: true, min: 0 }
            }],
            default: []
        },
        desiPricing: {
            ranges: { type: [desiRangeSchema], default: [] },
            extraPerDesi: { type: Number, default: 0, min: 0 }
        }
    };
    if (withDiaBrand) def.diaBrand = { type: String, default: '' };
    return def;
}

const SHIPPING_PRICE_MODES = ['included', 'excluded'];

const CARGO_PRICING_TYPES = ['rules', 'free'];

const cargoSchema = new mongoose.Schema({
    cargoNo: { type: Number },
    site: {
        type: String,
        enum: Object.keys(SITES),
        default: DEFAULT_SITE,
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    code: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    logo: {
        type: String,
        default: ''
    },
    isActive: {
        type: Boolean,
        default: true
    },
    webOrder: {
        type: Number,
        default: 0
    },
    memberGroups: {
        type: [String],
        enum: ['member', 'guest', 'all'],
        default: []
    },
    productType: {
        type: String,
        enum: ['dia_api', 'xml_integration'],
        default: 'dia_api'
    },
    scopeType: {
        type: String,
        enum: ['', 'category', 'brand', 'product', 'size'],
        default: ''
    },
    sizeRules: {
        type: [{
            size: { type: String, required: true, trim: true },
            price: { type: Number, required: true, min: 0 }
        }],
        default: []
    },
    categoryRules: {
        type: [scopedRuleSchema('categoryId', 'categoryName', 'WebCategory')],
        default: []
    },
    brandRules: {
        type: [scopedRuleSchema('brandId', 'brandName', 'WebBrand', true)],
        default: []
    },
    productRules: {
        type: [{
            productKey: { type: String, required: true, trim: true },
            stockCode: { type: String, default: '' },
            productName: { type: String, default: '' },
            price: { type: Number, required: true, min: 0 },
        }],
        default: []
    },
    paymentType: {
        type: String,
        enum: ['sender', 'receiver'],
        default: 'sender'
    },
    pricingType: { type: String, enum: CARGO_PRICING_TYPES, default: 'rules' },
    serviceAreas: {
        type: [{
            _id: false,
            cityId: { type: String, required: true },
            cityName: { type: String, required: true },
            districtId: { type: String, default: '' },
            districtName: { type: String, default: '' }
        }],
        default: []
    },
    fixedPrice: {
        type: Number,
        default: 0,
        min: 0
    },
    freeShippingThreshold: {
        type: Number,
        default: 0,
        min: 0
    },
    freeShippingDesiLimit: {
        type: Number,
        default: 0,
        min: 0
    },
    desiPricing: {
        ranges: {
            type: [{
                min: { type: Number, required: true, min: 0 },
                max: { type: Number, required: true, min: 0 },
                price: { type: Number, required: true, min: 0 }
            }],
            default: []
        },
        extraPerDesi: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    stockFixedPrice: { type: Number, default: 0, min: 0 },
    stockFreeShippingThreshold: { type: Number, default: 0, min: 0 },
    stockFreeShippingDesiLimit: { type: Number, default: 0, min: 0 },
    stockShippingPriceMode: { type: String, enum: SHIPPING_PRICE_MODES, default: 'included' },
    stockDesiPricing: {
        ranges: {
            type: [{
                min: { type: Number, required: true, min: 0 },
                max: { type: Number, required: true, min: 0 },
                price: { type: Number, required: true, min: 0 }
            }],
            default: []
        },
        extraPerDesi: {
            type: Number,
            default: 0,
            min: 0
        }
    }
}, {
    timestamps: true,
    collection: 'webcargo'
});

cargoSchema.index({ site: 1, code: 1 }, { unique: true });
cargoSchema.index({ isActive: 1, webOrder: -1 });
cargoSchema.index({ site: 1, cargoNo: 1 }, { unique: true, partialFilterExpression: { cargoNo: { $type: 'number' } } });

cargoSchema.pre('save', async function (next) {
    if (!this.isNew || typeof this.cargoNo === 'number') return next();
    try {
        const { reserveCargoNos } = require('../../../utils/cargoNo');
        this.cargoNo = await reserveCargoNos(this.site, 1);
        next();
    } catch (error) {
        next(error);
    }
});

module.exports = mongoose.model('Cargo', cargoSchema);
module.exports.SHIPPING_PRICE_MODES = SHIPPING_PRICE_MODES;
module.exports.CARGO_PRICING_TYPES = CARGO_PRICING_TYPES;