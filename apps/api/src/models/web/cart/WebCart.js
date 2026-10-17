const mongoose = require('mongoose');
const { SITE_SLUGS } = require('../../../config/sites');

const cartItemSchema = new mongoose.Schema({
    productKey: { type: String, required: true },
    productName: String,
    productImage: String,
    productSlug: String,
    brandName: String,
    quantity: { type: Number, required: true, min: 1, default: 1 },
    unitPrice: { type: Number, required: true },
    originalPrice: { type: Number, default: 0 },
    // Ürün fiyatından HARİÇ tutulan birim kargo ücreti (Kargo Kuralları: "fiyattan hariç"); fiyata dahilse 0
    shippingPerUnit: { type: Number, default: 0 },
    kdvRate: { type: Number, default: 20 },
    // Kategori ayarı: 'haric' ise vitrinde ve sepette fiyat "KDV hariç + KDV" olarak AYRIŞTIRILIR.
    // Ödenen tutar değişmez; KDV unitPrice'ın İÇİNDEN hesaplanır. Kaynak: utils/categoryPriceDisplay
    priceDisplay: { type: String, enum: ['dahil', 'haric'], default: 'dahil' },
    // Montaj hizmeti: hangi anlaşmalı noktadan seçildi (kimlik satın alma sonrası açılır, sepette anonim etiket)
    montagePointId: { type: String, default: '' },
    montagePointLabel: { type: String, default: '' },
    // Sepet kuralları için kalem türü: tire | montage | service | product (CartRulesService)
    itemType: { type: String, enum: ['tire', 'montage', 'service', 'product'], default: 'product' },
    rimSize: { type: Number, default: null },                       // lastik jant çapı (inç)
    rimRange: { type: { min: Number, max: Number }, default: null }, // montaj hizmetinin kapsadığı çap aralığı
    // "Montaj Satın Al" sayfasından (müşterinin kendi lastiği) eklenen montaj: lastik şartı ve adet tavanı uygulanmaz
    ownTire: { type: Boolean, default: false },
    addedAt: { type: Date, default: Date.now }
}, { _id: false });

// Aktif Sepetler (admin) takip durumu: müşteriyle iletişime geçildi mi
const CART_FOLLOW_UP_STATUSES = ['pending', 'contacted'];

const webCartSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, index: true },
    // Takip durumu (admin Aktif Sepetler): pending = Beklemede, contacted = İletişime Geçildi
    followUpStatus: { type: String, enum: CART_FOLLOW_UP_STATUSES, default: 'pending' },
    followUpAt: { type: Date },
    followUpBy: { type: String, default: '' },
    // Sepetin ait olduğu site (istek hangi vitrinden geldiyse). Eski kayıtlarda yoktur;
    // ziyaretçi sepetine tekrar dokunduğunda doldurulur.
    site: { type: String, enum: SITE_SLUGS, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    items: [cartItemSchema],
    lastActivity: { type: Date, default: Date.now },
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 gün
        index: true
    }
}, {
    timestamps: true,
    collection: 'carts'
});

// Compound index
webCartSchema.index({ sessionId: 1, userId: 1 });

// TTL index - süresi dolan sepetleri otomatik sil
webCartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Toplam hesaplama virtual
webCartSchema.virtual('totals').get(function () {
    // total = müşterinin ödeyeceği tutar ve her zaman kalem tutarlarının toplamıdır.
    // 'haric' kalemlerde KDV fiyatın İÇİNDEN çıkarılır (fiyata EKLENMEZ), böylece
    // "Ürünler Toplamı + KDV = Toplam" olur ve ödenen tutar değişmez.
    let subtotal = 0;
    let totalKdv = 0;
    // Montaj/hizmet kalemleri sepet özetinde ayrı satırda gösterilir
    let montageSubtotal = 0;
    // Ürün fiyatından hariç tutulan kargo: ayrı "Kargo" satırı (KDV dahil tutar)
    let shippingTotal = 0;

    this.items.forEach(item => {
        const itemTotal = item.unitPrice * item.quantity;
        const isMontage = item.itemType === 'montage' || item.itemType === 'service';

        let netAmount = itemTotal;
        if (item.priceDisplay === 'haric') {
            const rate = item.kdvRate > 0 ? item.kdvRate : 20;
            const kdvAmount = itemTotal * rate / (100 + rate);
            netAmount = itemTotal - kdvAmount;
            totalKdv += kdvAmount;
        }

        subtotal += netAmount;
        if (isMontage) montageSubtotal += netAmount;
        shippingTotal += (item.shippingPerUnit || 0) * item.quantity;
    });

    const yuvarla = (v) => Math.round(v * 100) / 100;

    return {
        // subtotal: montaj dahil tüm kalemler (KDV hariç) — eski tüketiciler için anlamı korunur
        subtotal: yuvarla(subtotal),
        // productsSubtotal + montage = subtotal
        productsSubtotal: yuvarla(subtotal - montageSubtotal),
        montage: yuvarla(montageSubtotal),
        kdv: yuvarla(totalKdv),
        shipping: yuvarla(shippingTotal),
        total: yuvarla(subtotal + totalKdv + shippingTotal),
        itemCount: this.items.reduce((sum, item) => sum + item.quantity, 0)
    };
});

webCartSchema.set('toJSON', { virtuals: true });
webCartSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('WebCart', webCartSchema);
module.exports.CART_FOLLOW_UP_STATUSES = CART_FOLLOW_UP_STATUSES;
