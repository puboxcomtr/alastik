// apps/api/src/models/WebOrder.js
const mongoose = require('mongoose');

// DIA Sipariş Kalemi Schema
const diaOrderItemSchema = new mongoose.Schema({
    _key: String,
    _key_kalemturu: String,
    miktar: Number,
    anamiktar: Number,
    birimfiyati: Number,
    tutari: Number,
    kdv: Number,
    kdvtutari: Number,
    indirim: Number,
    aciklama: String,
    birimadi: String
}, { _id: false });

// DIA Verileri Schema
const diaOrderDataSchema = new mongoose.Schema({
    _key: String,
    fisno: String,
    tarih: String,
    onay: String,
    turu: String,
    _key_scf_carikart: String,
    __cariunvan: String,
    __cariceptel: String,
    __cariverginumarasi: String,
    sevkadresi1: String,
    sevkadresi2: String,
    sevkadresi3: String,
    toplam: Number,
    toplamkdv: Number,
    net: Number,
    dovizturu: String,
    aciklama: String,
    odemesekli: String,
    sevktarihi: String,
    teslimtarihi: String,
    m_kalemler: [diaOrderItemSchema]
}, { _id: false });

// Custom Veriler Schema
const customOrderDataSchema = new mongoose.Schema({
    customer: {
        firstName: String,
        lastName: String,
        email: String,
        phone: String,
        taxNumber: String,
        companyName: String,
        isCompany: { type: Boolean, default: false }
    },
    shippingAddress: {
        title: String,
        address: String,
        city: String,
        district: String,
        postalCode: String,
        country: { type: String, default: 'Turkey' }
    },
    billingAddress: {
        title: String,
        address: String,
        city: String,
        district: String,
        postalCode: String,
        country: { type: String, default: 'Turkey' }
    },
    items: [{
        productKey: String,
        productName: String,
        quantity: Number,
        unitPrice: Number,
        totalPrice: Number,
        vatRate: Number,
        vatAmount: Number,
        discount: Number
    }],
    payment: {
        method: String,
        provider: String,
        transactionId: String,
        installmentCount: Number
    },
    pricing: {
        subtotal: Number,
        vatAmount: Number,
        discountAmount: Number,
        shippingCost: Number,
        total: Number,
        currency: { type: String, default: 'TRY' }
    },
    internalNotes: String,
    customerNotes: String,
    tags: [String],
    priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal'
    },
    assignedTo: String,
    customStatus: String,
    webOrderNumber: String
}, { _id: false });

// Senkronizasyon Bilgileri Schema
const syncInfoSchema = new mongoose.Schema({
    direction: {
        type: String,
        enum: ['dia_to_web', 'web_to_dia', 'bidirectional'],
        default: 'dia_to_web'
    },
    diaStatus: {
        type: String,
        enum: ['synced', 'pending_sync', 'not_in_dia', 'sync_error'],
        default: 'not_in_dia'
    },
    webStatus: {
        type: String,
        enum: ['draft', 'pending', 'sent_to_dia', 'confirmed', 'cancelled'],
        default: 'draft'
    },
    lastDiaSync: Date,
    lastWebUpdate: Date,
    syncErrors: [String],
    syncSource: {
        type: String,
        enum: ['dia_api', 'web_panel', 'manual'],
        default: 'dia_api'
    }
}, { _id: false });

// Ana WebOrder Schema
const webOrderSchema = new mongoose.Schema({
    // DIA key (opsiyonel - sadece DIA'dan gelenler için)
    _key: {
        type: String,
        sparse: true,
        index: true
    },

    // User referansı
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },

    // Adres ID'leri (user.addresses array'indeki _id)
    shippingAddressId: String,
    billingAddressId: String,

    // Araç ID'si (user.garage array'indeki _id)
    garageId: String,

    // Snapshot'lar (sipariş anındaki veriler)
    shippingAddressSnapshot: {
        type: String,
        title: String,
        firstName: String,
        lastName: String,
        phone: String,
        address: String,
        city: String,
        district: String,
        postalCode: String,
        country: String
    },

    billingAddressSnapshot: {
        type: String,
        title: String,
        firstName: String,
        lastName: String,
        phone: String,
        address: String,
        city: String,
        district: String,
        postalCode: String,
        country: String
    },

    vehicleSnapshot: {
        marka: String,
        model: String,
        yil: Number,
        plate: String,
        nickname: String
    },

    // DIA ve Custom veriler
    diaData: diaOrderDataSchema,
    customData: customOrderDataSchema,
    syncInfo: syncInfoSchema

}, {
    timestamps: true,
    collection: 'weborders'
});

// Indexes
webOrderSchema.index({ '_key': 1 }, { unique: true, sparse: true });
webOrderSchema.index({ 'diaData.fisno': 1 });
webOrderSchema.index({ 'customData.webOrderNumber': 1 }, { unique: true, sparse: true });
webOrderSchema.index({ 'syncInfo.diaStatus': 1 });
webOrderSchema.index({ 'syncInfo.webStatus': 1 });
webOrderSchema.index({ 'syncInfo.direction': 1 });
webOrderSchema.index({ 'userId': 1 });
webOrderSchema.index({ 'createdAt': -1 });
webOrderSchema.index({ 'updatedAt': -1 });

// Virtual'lar
webOrderSchema.virtual('orderNumber').get(function () {
    return this.diaData?.fisno || this.customData?.webOrderNumber || 'DRAFT';
});

webOrderSchema.virtual('totalAmount').get(function () {
    return this.diaData?.net || this.customData?.pricing?.total || 0;
});

webOrderSchema.virtual('isFromDia').get(function () {
    return this.syncInfo.direction === 'dia_to_web';
});

webOrderSchema.virtual('isFromWeb').get(function () {
    return this.syncInfo.direction === 'web_to_dia';
});

// Static metodlar
webOrderSchema.statics.getDiaOrders = function () {
    return this.find({
        'syncInfo.direction': 'dia_to_web',
        'syncInfo.diaStatus': 'synced'
    }).sort({ 'diaData.tarih': -1 });
};

webOrderSchema.statics.getWebOrders = function () {
    return this.find({
        'syncInfo.direction': 'web_to_dia'
    }).sort({ createdAt: -1 });
};

webOrderSchema.statics.getPendingSyncOrders = function () {
    return this.find({
        'syncInfo.diaStatus': 'pending_sync',
        'syncInfo.direction': 'web_to_dia'
    });
};

module.exports = mongoose.model('WebOrder', webOrderSchema);