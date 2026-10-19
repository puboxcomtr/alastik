const mongoose = require('mongoose');
const { SITE_SLUGS } = require('../../../config/sites');

const addressSnapshotSchema = new mongoose.Schema({
    addressName: String,
    invoiceType: String,
    fullName: String,
    tcNo: String,
    companyName: String,
    taxOffice: String,
    taxNo: String,
    authorizedPerson: String,
    email: String,
    phone: String,
    cityId: String,
    cityName: String,
    districtId: String,
    districtName: String,
    neighborhoodId: String,
    neighborhoodName: String,
    street: String,
    buildingNo: String,
    floor: String,
    apartmentNo: String,
    addressNote: String,
    diaAddressKey: Number
}, { _id: false });

const memberSnapshotSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    email: String,
    phone: String
}, { _id: false });

const orderItemSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'WebProduct' },
    productKey: String,
    stockCode: String,
    name: String,
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    listUnitPrice: { type: Number, default: 0 },
    discountRates: { type: [Number], default: undefined },
    totalPrice: { type: Number, required: true },
    shippingPerUnit: { type: Number, default: 0 },
    shippingTotal: { type: Number, default: 0 },
    isXml: { type: Boolean, default: false },
    montagePointId: { type: String, default: '' },
    vatRate: { type: Number, default: 20 },
    vatAmount: { type: Number, default: 0 }
}, { _id: false });

const pricingSchema = new mongoose.Schema({
    subtotal: { type: Number, required: true },
    vatAmount: { type: Number, default: 0 },
    shippingCost: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    currency: { type: String, default: 'TRY' }
}, { _id: false });

const paymentSchema = new mongoose.Schema({
    method: {
        type: String,
        enum: ['credit_card', 'credit_card_3d', 'bank_transfer', 'cash_on_delivery', 'netahsilat_installment', 'cari'],
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded', 'cancelled'],
        default: 'pending'
    },
    gateway: String,
    installment: { type: Number, default: 1 },
    diaPaymentPlanKey: { type: Number, default: 0 },
    referenceCode: String,
    transactionId: String,
    authCode: String,
    paymentGuid: String,
    errorMessage: String,
    errorCode: String,
    returnOrigin: String,
    cardInfo: {
        lastFourDigits: String,
        cardType: String,
        bankName: String,
        installments: { type: Number, default: 1 }
    },
    bankTransfer: {
        bankName: String,
        accountHolder: String,
        iban: String,
        referenceCode: String,
        transferDate: Date,
        approvedAt: Date,
        approvedBy: String
    },
    paidAt: Date,

    manualCollection: {
        channel: {
            type: String,
            enum: ['paynet', 'otopirpos', 'nkolay', null],
            default: null
        },
        updatedAt: Date
    },

    mailSent: { type: Boolean, default: false },
    mailSentAt: Date
}, { _id: false });

const diaIntegrationSchema = new mongoose.Schema({
    status: {
        type: String,
        enum: ['pending', 'synced', 'failed', 'cancelled'],
        default: 'pending'
    },
    diaOrderKey: String,
    diaOrderNumber: String,
    diaCustomerKey: String,
    diaInvoiceKey: String,
    diaInvoiceNumber: String,
    invoicedAt: Date,
    diaSourceOrderKey: String,
    diaTransferKey: String,
    diaSourceInvoiceKey: String,
    diaOutgoingDispatchKey: String,
    diaIncomingDispatchKey: String,
    diaPurchaseInvoiceKey: String,
    diaPurchaseDispatchKey: String,
    chainRetryCount: Number,
    chainRetriedAt: Date,
    transferRetryCount: { type: Number, default: 0 },
    transferRetriedAt: Date,
    transferAlertSentAt: Date,
    syncLockAt: Date,
    syncedAt: Date,
    syncErrors: [String]
}, { _id: false });

const webOrderSchema = new mongoose.Schema({
    site: { type: String, enum: SITE_SLUGS, default: 'alastik', index: true },
    orderNumber: {
        type: String,
        required: true,
        unique: true
    },

    memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'WebMember' },
    isGuest: { type: Boolean, default: false },
    customerEmail: { type: String },
    customerPhone: { type: String },
    customerName: String,

    billingAddressId: { type: mongoose.Schema.Types.ObjectId, ref: 'WebAddress' },
    shippingAddressId: { type: mongoose.Schema.Types.ObjectId, ref: 'WebAddress' },

    guestBillingAddress: {
        fullName: String,
        companyName: String,
        taxOffice: String,
        taxNo: String,
        tcNo: String,
        invoiceType: String,
        email: String,
        phone: String,
        cityId: String,
        cityName: String,
        districtId: String,
        districtName: String,
        neighborhoodId: String,
        neighborhoodName: String,
        street: String,
        buildingNo: String,
        floor: String,
        apartmentNo: String,
        addressNote: String
    },
    guestShippingAddress: {
        fullName: String,
        phone: String,
        cityId: String,
        cityName: String,
        districtId: String,
        districtName: String,
        neighborhoodId: String,
        neighborhoodName: String,
        street: String,
        buildingNo: String,
        floor: String,
        apartmentNo: String,
        addressNote: String
    },
    billingSnapshot: addressSnapshotSchema,
    shippingSnapshot: addressSnapshotSchema,
    memberSnapshot: memberSnapshotSchema,

    items: [orderItemSchema],

    pricing: pricingSchema,

    payment: paymentSchema,

    status: {
        type: String,
        enum: ['pending', 'awaiting_payment', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned', 'payment_failed'],
        default: 'pending'
    },

    shipping: {
        method: { type: String, default: 'standard' },
        trackingNumber: String,
        carrier: String,
        shippedAt: Date,
        deliveredAt: Date
    },

    diaIntegration: diaIntegrationSchema,

    customerNote: String,
    orderNote: String,
    cartSessionId: String,
    adminNote: String,

    cancellation: {
        reason: String,
        cancelledAt: Date,
        cancelledBy: String
    },

    isActive: { type: Boolean, default: true }

}, {
    timestamps: true,
    collection: 'weborders'
});

webOrderSchema.index({ orderNumber: 1 }, { unique: true });
webOrderSchema.index({ memberId: 1 });
webOrderSchema.index({ customerEmail: 1 });
webOrderSchema.index({ status: 1 });
webOrderSchema.index({ 'payment.status': 1 });
webOrderSchema.index({ 'diaIntegration.status': 1 });
webOrderSchema.index({ createdAt: -1 });

const ORDER_NUMBER_COUNTER_COLLECTION = 'webordercounters';

webOrderSchema.statics.generateOrderNumber = async function (site) {
    const { SITES, DEFAULT_SITE } = require('../../../config/sites');
    const sitePrefix = SITES[site]?.orderPrefix || SITES[DEFAULT_SITE].orderPrefix;

    const today = new Date();
    const year = today.getFullYear().toString().slice(-2);
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    const prefix = `${sitePrefix}${year}${month}${day}`;
    const lastOrder = await this.findOne({
        orderNumber: { $regex: `^${prefix}` }
    }).sort({ orderNumber: -1 });
    const lastSequence = lastOrder ? (parseInt(lastOrder.orderNumber.slice(-4)) || 0) : 0;

    const counters = mongoose.connection.collection(ORDER_NUMBER_COUNTER_COLLECTION);
    await counters.updateOne({ _id: prefix }, { $max: { seq: lastSequence } }, { upsert: true });
    const counter = await counters.findOneAndUpdate({ _id: prefix }, { $inc: { seq: 1 } }, { returnDocument: 'after' });
    const sequence = (counter?.value || counter)?.seq || lastSequence + 1;

    return `${prefix}${String(sequence).padStart(4, '0')}`;
};

module.exports = mongoose.models.WebOrder || mongoose.model('WebOrder', webOrderSchema);