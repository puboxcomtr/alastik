const mongoose = require('mongoose');

const blockedIPSchema = new mongoose.Schema({
    ipAddress: {
        type: String,
        required: true,
        unique: true
    },
    reason: {
        type: String,
        required: true
    },
    blockedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    expiresAt: {
        type: Date
    },
    status: {
        type: String,
        enum: ['active', 'expired'],
        default: 'active'
    }
}, {
    timestamps: true,
    collection: 'blockedips'
});

blockedIPSchema.index({ ipAddress: 1 });
blockedIPSchema.index({ status: 1, expiresAt: 1 });

blockedIPSchema.virtual('isActive').get(function () {
    if (this.status === 'expired') return false;
    if (!this.expiresAt) return true;
    return this.expiresAt > Date.now();
});

blockedIPSchema.pre('save', function (next) {
    if (this.expiresAt && this.expiresAt <= Date.now()) {
        this.status = 'expired';
    }
    next();
});

blockedIPSchema.statics.isBlocked = async function (ipAddress) {
    const blocked = await this.findOne({
        ipAddress,
        status: 'active',
        $or: [
            { expiresAt: null },
            { expiresAt: { $gt: Date.now() } }
        ]
    });
    return !!blocked;
};

blockedIPSchema.statics.getActiveBlocks = function () {
    return this.find({
        status: 'active',
        $or: [
            { expiresAt: null },
            { expiresAt: { $gt: Date.now() } }
        ]
    }).populate('blockedBy');
};

module.exports = mongoose.model('BlockedIP', blockedIPSchema);