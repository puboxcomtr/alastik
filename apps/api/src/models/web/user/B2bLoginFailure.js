const mongoose = require('mongoose');

const RETENTION_DAYS = 90;
const FAILURE_REASONS = ['not_found', 'wrong_password', 'suspended', 'inactive'];

const b2bLoginFailureSchema = new mongoose.Schema({
    site: { type: String, required: true, index: true },
    identifier: { type: String, default: '' },
    reason: { type: String, enum: FAILURE_REASONS, required: true },
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'WebMember', index: true },
    cariKodu: { type: String },
    ip: { type: String },
    userAgent: { type: String },
    createdAt: { type: Date, default: Date.now, expires: RETENTION_DAYS * 24 * 60 * 60 }
}, { collection: 'b2bloginfailures', versionKey: false });

b2bLoginFailureSchema.index({ site: 1, createdAt: -1 });

const B2bLoginFailure = mongoose.model('B2bLoginFailure', b2bLoginFailureSchema);
B2bLoginFailure.FAILURE_REASONS = FAILURE_REASONS;

module.exports = B2bLoginFailure;
