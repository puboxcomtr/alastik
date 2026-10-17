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
    // Adresin DIA cari kartındaki kaydı (scf_carikart_adresleri _key) — DIA siparişinde "Sevk Adresi" bunu okur
    diaAddressKey: Number
}, { _id: false });

// Üye Snapshot Schema
const memberSnapshotSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    email: String,
    phone: String
}, { _id: false });

// Sipariş Ürün Schema
// Sipariş Ürün Schema
const orderItemSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'WebProduct' },
    productKey: String,           // DIA _key
    stockCode: String,            // stokkartkodu
    name: String,
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },          // Kargosuz birim fiyat (gerçek webPrice / final satış)
    listUnitPrice: { type: Number, default: 0 },           // Liste birim fiyat (fiyat1) — DIA'da iskonto tabanı
    discountRates: { type: [Number], default: undefined }, // Zincirli iskonto oranları (Cari, yıl + marka, ödeme yöntemi farkı) — DIA indirim1..N
    totalPrice: { type: Number, required: true },          // unitPrice × quantity (kargosuz)
    shippingPerUnit: { type: Number, default: 0 },         // 1 adetlik kargo (XML için, DIA'da 0)
    shippingTotal: { type: Number, default: 0 },           // Toplam kargo (shippingPerUnit × quantity)
    isXml: { type: Boolean, default: false },              // XML kaynaklı ürün mü?
    montagePointId: { type: String, default: '' },         // Hizmetin alınacağı montaj noktası
    vatRate: { type: Number, default: 20 },
    vatAmount: { type: Number, default: 0 }
}, { _id: false });

// Fiyatlandırma Schema
const pricingSchema = new mongoose.Schema({
    subtotal: { type: Number, required: true },
    vatAmount: { type: Number, default: 0 },
    shippingCost: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    currency: { type: String, default: 'TRY' }
}, { _id: false });

// Ödeme Schema
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
    // Gateway bilgileri
    gateway: String,
    installment: { type: Number, default: 1 },
    // Cari Sipariş (b2b): carinin DIA ödeme planı _key'i — DIA siparişi / faturası bu planla yazılır (yoksa panel ayarı)
    diaPaymentPlanKey: { type: Number, default: 0 },
    referenceCode: String,
    transactionId: String,
    authCode: String,
    paymentGuid: String,
    errorMessage: String,
    errorCode: String,
    // Taksitli 3D dönüşünde (NetTahsilat callback) doğru domaine yönlendirmek için
    returnOrigin: String,
    // Kredi kartı bilgileri
    cardInfo: {
        lastFourDigits: String,
        cardType: String,
        bankName: String,
        installments: { type: Number, default: 1 }
    },
    // Havale bilgileri
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

    // Manuel tahsilat bilgisi (hangi kanaldan elle tahsil edildi)
    manualCollection: {
        channel: {
            type: String,
            enum: ['paynet', 'otopirpos', 'nkolay', null],
            default: null
        },
        updatedAt: Date
    },

    // Mail durumu (mükerrer mail koruması)
    mailSent: { type: Boolean, default: false },
    mailSentAt: Date
}, { _id: false });

// DIA Entegrasyon Schema
const diaIntegrationSchema = new mongoose.Schema({
    status: {
        type: String,
        enum: ['pending', 'synced', 'failed', 'cancelled'],
        default: 'pending'
    },
    diaOrderKey: String,
    diaOrderNumber: String,
    diaCustomerKey: String,
    // Otomatik kesilen DIA faturası
    diaInvoiceKey: String,
    diaInvoiceNumber: String,
    invoicedAt: Date,
    // Şirketler arası akış belgeleri (kaynak firma transferi/faturası + alış faturası)
    diaSourceOrderKey: String,
    diaTransferKey: String,
    diaSourceInvoiceKey: String,
    // Stok hareketi irsaliyeleri (9 Eyl): F1 çıkış (-C) ve F2 giriş (-G)
    diaOutgoingDispatchKey: String,
    diaIncomingDispatchKey: String,
    diaPurchaseInvoiceKey: String,
    diaPurchaseDispatchKey: String,
    // Şirketler arası zincir yarım kaldıysa otomatik tekrar deneme sayısı / zamanı (interCompanyRetry)
    chainRetryCount: Number,
    chainRetriedAt: Date,
    // Başarısız/bekleyen DIA aktarımının otomatik tekrar denemesi (orderTransferRetry)
    transferRetryCount: { type: Number, default: 0 },
    transferRetriedAt: Date,
    // Aktarım tekrar denemelerle de olmadıysa yöneticiye uyarı maili gönderildiği an (bir kez)
    transferAlertSentAt: Date,
    // Eşzamanlı aktarım kilidi (yarış koruması)
    syncLockAt: Date,
    syncedAt: Date,
    syncErrors: [String]
}, { _id: false });

// Ana WebOrder Schema
const webOrderSchema = new mongoose.Schema({
    site: { type: String, enum: SITE_SLUGS, default: 'alastik', index: true },
    // Sipariş Numarası
    orderNumber: {
        type: String,
        required: true,
        unique: true
    },

    // Müşteri Bilgileri
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'WebMember' },
    isGuest: { type: Boolean, default: false },
    customerEmail: { type: String },
    customerPhone: { type: String },
    customerName: String,

    // Adres Bilgileri
    billingAddressId: { type: mongoose.Schema.Types.ObjectId, ref: 'WebAddress' },
    shippingAddressId: { type: mongoose.Schema.Types.ObjectId, ref: 'WebAddress' },

    // Misafir için adres
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

    // Ürünler
    items: [orderItemSchema],

    // Fiyatlandırma
    pricing: pricingSchema,

    // Ödeme
    payment: paymentSchema,

    // Sipariş Durumu
    status: {
        type: String,
        enum: ['pending', 'awaiting_payment', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned', 'payment_failed'],
        default: 'pending'
    },

    // Kargo Bilgileri
    shipping: {
        method: { type: String, default: 'standard' },
        trackingNumber: String,
        carrier: String,
        shippedAt: Date,
        deliveredAt: Date
    },

    // DIA Entegrasyonu
    diaIntegration: diaIntegrationSchema,

    // Notlar
    customerNote: String,
    // Bayinin sepette yazdığı sipariş açıklaması (b2b) — DIA'da sitenin diaOrderNoteField satırına yazılır
    orderNote: String,
    // Siparişin verildiği sepetin oturum numarası: ödeme sonucu gelince o sepet silinir
    cartSessionId: String,
    adminNote: String,

    // İptal/İade
    cancellation: {
        reason: String,
        cancelledAt: Date,
        cancelledBy: String
    },

    // Aktiflik
    isActive: { type: Boolean, default: true }

}, {
    timestamps: true,
    collection: 'weborders'
});

// Index'ler
webOrderSchema.index({ orderNumber: 1 }, { unique: true });
webOrderSchema.index({ memberId: 1 });
webOrderSchema.index({ customerEmail: 1 });
webOrderSchema.index({ status: 1 });
webOrderSchema.index({ 'payment.status': 1 });
webOrderSchema.index({ 'diaIntegration.status': 1 });
webOrderSchema.index({ createdAt: -1 });

// Sipariş numarası oluştur — önek site tanımından gelir (AL / LJA)
// Sipariş numarası sayaçlarının koleksiyonu (gün öneki başına bir kayıt: { _id: 'B2B261015', seq })
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

    // Sıra numarası gün önekine bağlı atomik sayaçtan alınır: silinen siparişin numarası yeniden verilmez,
    // aynı anda gelen iki sipariş aynı numarayı alamaz. Sayaç ilk kullanımda mevcut en büyük numaradan başlar.
    const counters = mongoose.connection.collection(ORDER_NUMBER_COUNTER_COLLECTION);
    await counters.updateOne({ _id: prefix }, { $max: { seq: lastSequence } }, { upsert: true });
    const counter = await counters.findOneAndUpdate({ _id: prefix }, { $inc: { seq: 1 } }, { returnDocument: 'after' });
    const sequence = (counter?.value || counter)?.seq || lastSequence + 1;

    return `${prefix}${String(sequence).padStart(4, '0')}`;
};

module.exports = mongoose.models.WebOrder || mongoose.model('WebOrder', webOrderSchema);