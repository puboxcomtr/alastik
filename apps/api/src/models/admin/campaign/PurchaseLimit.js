const mongoose = require('mongoose')
const { SITES, DEFAULT_SITE } = require('../../../config/sites')

const purchaseLimitSchema = new mongoose.Schema({
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
    minLimit: {
        type: Number,
        default: null,
        min: 0
    },
    maxLimit: {
        type: Number,
        default: null,
        min: 0
    },
    limitType: {
        type: String,
        enum: ['product', 'category', 'brand'],
        required: true
    },
    targets: [{
        targetId: { type: String, required: true },
        targetName: { type: String, default: '' }
    }],
    memberGroups: {
        type: [String],
        enum: ['member', 'dealer', 'guest'],
        default: []
    },
    priority: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    collection: 'purchaselimits'
})

purchaseLimitSchema.index({ site: 1, isActive: 1 })
purchaseLimitSchema.index({ limitType: 1, isActive: 1 })
purchaseLimitSchema.index({ 'targets.targetId': 1 })
purchaseLimitSchema.index({ memberGroups: 1 })
purchaseLimitSchema.index({ priority: -1 })
purchaseLimitSchema.index({ name: 'text' })

purchaseLimitSchema.pre('save', function (next) {
    if (this.minLimit != null && this.maxLimit != null && this.minLimit > this.maxLimit) {
        return next(new Error('Minimum limit, maksimum limitten büyük olamaz'))
    }
    if (!this.targets || this.targets.length === 0) {
        return next(new Error('En az bir hedef (ürün/kategori/marka) seçilmelidir'))
    }
    if (!this.memberGroups || this.memberGroups.length === 0) {
        return next(new Error('En az bir üye/bayi grubu seçilmelidir'))
    }
    next()
})

purchaseLimitSchema.statics.findActive = function () {
    return this.find({ isActive: true }).sort({ priority: -1, createdAt: -1 })
}

purchaseLimitSchema.statics.findForTarget = function (limitType, targetId, memberGroup) {
    return this.find({
        isActive: true,
        limitType,
        'targets.targetId': targetId,
        memberGroups: memberGroup
    }).sort({ priority: -1 })
}

module.exports = mongoose.model('PurchaseLimit', purchaseLimitSchema)