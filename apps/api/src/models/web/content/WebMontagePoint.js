const mongoose = require('mongoose');
const { SITES, DEFAULT_SITE } = require('../../../config/sites');

// Montaj noktası: lastik alan müşteriye montaj hizmeti verilen bayi/servis noktası
const webMontagePointSchema = new mongoose.Schema({
    // Her site kendi montaj noktalarını yönetir
    site: {
        type: String,
        enum: Object.keys(SITES),
        default: DEFAULT_SITE,
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    // İl/ilçe adres veritabanından seçilir (address_cities / address_districts)
    city: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    cityId: {
        type: String,
        default: ''
    },
    district: {
        type: String,
        default: '',
        trim: true
    },
    districtId: {
        type: String,
        default: ''
    },
    address: {
        type: String,
        default: '',
        trim: true
    },
    phone: {
        type: String,
        default: '',
        trim: true
    },
    // Eski serbest metin alanı (geriye dönük uyumluluk)
    workingHours: {
        type: String,
        default: '',
        trim: true
    },
    // Gün bazlı çalışma saatleri (HH:MM); open/close boşsa o gün kapalıdır
    workingSchedule: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        .reduce((acc, day) => {
            acc[day] = {
                open: { type: String, default: '' },
                close: { type: String, default: '' }
            };
            return acc;
        }, {}),
    // Alınabilecek hizmetler — Hizmetlerimiz kategorisindeki ürünlerden seçilir
    // price null ise ürünün varsayılan fiyatı (defaultPrice) geçerlidir
    services: {
        type: [{
            _id: false,
            productKey: { type: String, default: '' },
            sku: { type: String, default: '' },
            name: { type: String, required: true, trim: true },
            defaultPrice: { type: Number, default: 0 },
            price: { type: Number, default: null }
        }],
        default: []
    },
    // Olanaklar (anahtar olarak saklanır, etiketler arayüzde)
    amenities: {
        type: [String],
        enum: ['wc', 'waiting_room', 'wifi', 'air_conditioning', 'refreshments', 'oil_change', 'headlight_check'],
        default: []
    },
    // Görsel
    image: {
        type: String,
        default: ''
    },
    // Sözleşme ve diğer evraklar (bayi ile yapılan anlaşma dosyaları)
    documents: {
        type: [{
            _id: false,
            name: { type: String, required: true, trim: true },
            url: { type: String, required: true, trim: true },
            originalName: { type: String, default: '', trim: true },
            uploadedAt: { type: Date, default: Date.now }
        }],
        default: []
    },
    // Yorumlar — panelden eklenenlerde üye "sistem" olarak geçer
    reviews: {
        type: [{
            memberName: { type: String, default: 'sistem', trim: true },
            comment: { type: String, default: '', trim: true },
            // Montaj Sürecinden Memnun musunuz? (1-5)
            processRating: { type: Number, min: 1, max: 5, default: 5 },
            // Montaj Noktasından Memnun musunuz? (1-5)
            locationRating: { type: Number, min: 1, max: 5, default: 5 },
            createdAt: { type: Date, default: Date.now }
        }],
        default: []
    },
    // Harita konumu (ileride vitrin haritası için)
    location: {
        lat: { type: Number, default: null },
        lng: { type: Number, default: null }
    },
    // Vitrinde kimlik bilgileri (ad, adres, telefon, görsel, tam konum) gösterilsin mi?
    // Kapalıysa nokta satın alma öncesi "Anlaşmalı Nokta" olarak anonim görünür
    showPublicInfo: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    order: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true,
    collection: 'webmontagepoints'
});

webMontagePointSchema.index({ site: 1, isActive: 1, city: 1, order: 1 });

module.exports = mongoose.model('WebMontagePoint', webMontagePointSchema);
