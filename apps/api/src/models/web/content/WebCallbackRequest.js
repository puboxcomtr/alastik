const mongoose = require('mongoose');
const { CALLBACK_STATUSES } = require('../../../config/callbackForm');

const webCallbackRequestSchema = new mongoose.Schema({
    site: { type: String, default: 'alastik', index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    topic: { type: String, default: '' },
    timeSlot: { type: String, default: '' },
    status: { type: String, enum: CALLBACK_STATUSES, default: 'new', index: true },
    note: { type: String, default: '' },
    ip: { type: String, default: '' }
}, {
    timestamps: true,
    collection: 'webcallbackrequests'
});

module.exports = mongoose.model('WebCallbackRequest', webCallbackRequestSchema);
