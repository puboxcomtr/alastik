const mongoose = require('mongoose');
const { SITES, DEFAULT_SITE } = require('../../../config/sites');

const activityLogSchema = new mongoose.Schema({
    site: {
        type: String,
        enum: Object.keys(SITES),
        default: DEFAULT_SITE,
        index: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    action: {
        type: String,
        required: true,
        enum: [
            'login', 'logout', 'login_failed',
            'create', 'update', 'delete',
            'view', 'export', 'import'
        ]
    },
    module: {
        type: String,
        required: true,
        enum: ['auth', 'products', 'categories', 'brands', 'tags', 'users', 'roles', 'settings']
    },
    details: {
        type: mongoose.Schema.Types.Mixed
    },
    targetId: {
        type: String
    },
    targetType: {
        type: String
    },
    ipAddress: {
        type: String
    },
    userAgent: {
        type: String
    },
    status: {
        type: String,
        enum: ['success', 'failed'],
        default: 'success'
    }
}, {
    timestamps: true,
    collection: 'activitylogs'
});

activityLogSchema.index({ user: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, module: 1 });
activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ ipAddress: 1 });

activityLogSchema.statics.logActivity = function (data) {
    return this.create(data);
};

activityLogSchema.statics.getUserActivities = function (userId, limit = 50) {
    return this.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('user', 'firstName lastName email');
};

activityLogSchema.statics.getRecentActivities = function (limit = 100) {
    return this.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('user', 'firstName lastName email');
};

activityLogSchema.statics.getActivitiesByModule = function (module, limit = 50) {
    return this.find({ module })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('user', 'firstName lastName email');
};

module.exports = mongoose.model('ActivityLog', activityLogSchema);