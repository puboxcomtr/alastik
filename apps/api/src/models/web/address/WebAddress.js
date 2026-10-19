const mongoose = require('mongoose');

const webAddressSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    sessionId: { type: String, index: true },

    addressName: String,
    addressDescription: String,

    invoiceType: { type: String, enum: ['individual', 'corporate'], default: 'individual' },

    fullName: String,
    tcNo: { type: String, default: '11111111111' },

    companyName: String,
    taxOffice: String,
    taxNo: String,
    authorizedPerson: String,

    email: { type: String, required: true },
    phone: { type: String, required: true },

    cityId: { type: String, required: true },
    cityName: String,
    districtId: { type: String, required: true },
    districtName: String,
    neighborhoodId: { type: String, required: true },
    neighborhoodName: String,
    street: String,
    buildingNo: String,
    floor: String,
    apartmentNo: String,
    addressNote: String,

    isDefault: { type: Boolean, default: false },
    isBilling: { type: Boolean, default: true },
    isShipping: { type: Boolean, default: true },

    linkedShippingAddressId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WebAddress',
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    }

}, {
    timestamps: true,
    collection: 'webaddresses'
});

webAddressSchema.index({ userId: 1, isDefault: 1 });

module.exports = mongoose.model('WebAddress', webAddressSchema);