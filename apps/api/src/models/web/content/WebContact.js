const mongoose = require('mongoose');

const webContactSchema = new mongoose.Schema({
    name: { type: String, required: true },
    surname: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    isReplied: { type: Boolean, default: false }
}, {
    timestamps: true,
    collection: 'webcontacts'
});

module.exports = mongoose.model('WebContact', webContactSchema);