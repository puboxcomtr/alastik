const mongoose = require('mongoose');
const { SITE_SLUGS } = require('../../../config/sites');

// Cari tipleri: Premium bilgisi DIA cari kartından senkronlanır (WebMember.diaCari.premium)
const CUSTOMER_TIERS = [
    { id: 'premium', title: 'Premium Cari' },
    { id: 'normal', title: 'Normal Cari' }
];

// Ürün kaynağı: kendi stoğumuz (DIA) ya da tedarikçi XML'i. syncSource = WebProduct.syncInfo.syncSource değeri
const STOCK_SOURCES = [
    { id: 'own', title: 'Stoktaki Ürünler', syncSource: 'dia_api' },
    { id: 'xml', title: 'XML Ürünleri', syncSource: 'xml_integration' }
];

/**
 * Finansal iskonto tanımı: cari tipi × ürün kategorileri × markalar × üretim yılı × ödeme yöntemi → iskonto oranı (%).
 * Panelden (Finansal İskontolar) yönetilir. Boş bırakılan kapsam alanı (kategori / marka / yıl) "tümü" demektir.
 *
 * Kategori kapsamı iki seviyelidir:
 *  - categories: ana kategoriler (DIA kategori_aciklama_1)
 *  - subCategories: seçili ana kategorilerin alt kategorileri (DIA kategori_aciklama_2). Bir ana kategorinin
 *    hiç alt kategorisi seçilmemişse o ana kategorinin TAMAMI kapsamdadır.
 */
const financialDiscountSchema = new mongoose.Schema({
    site: { type: String, enum: SITE_SLUGS, required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    customerTier: { type: String, enum: CUSTOMER_TIERS.map(t => t.id), required: true },
    // Ödeme yöntemi anahtarı (diaCampaignPricing.PAYMENT_METHODS): cari / havale / kkTek / kkTaksit
    paymentMethod: { type: String, required: true },
    categories: { type: [String], default: [] },
    subCategories: {
        type: [{ _id: false, main: { type: String, required: true }, name: { type: String, required: true } }],
        default: []
    },
    // Marka adları (DIA marka); boş = tüm markalar
    brands: { type: [String], default: [] },
    // Üretim yılı (lastikte DIA ekalan5, ör. "2026"); boş = tüm yıllar
    productionYear: { type: String, default: '', trim: true },
    // true ise kural seçili yıl VE DAHA ESKİ üretim yıllarını kapsar (ör. "2024 ve öncesi")
    productionYearAndOlder: { type: Boolean, default: false },
    // Ürün kaynağı (STOCK_SOURCES id); boş = tüm ürünler
    stockSource: { type: String, enum: ['', ...STOCK_SOURCES.map(x => x.id)], default: '' },
    rate: { type: Number, required: true, min: 0, max: 100 },
    isActive: { type: Boolean, default: true },
    // Kapsamın sıralı özeti — birebir aynı kapsamla ikinci tanım açılmasını engeller
    scopeKey: { type: String, required: true }
}, { timestamps: true });

financialDiscountSchema.index({ site: 1, scopeKey: 1 }, { unique: true });

/** Kapsam alanlarından sıralı, karşılaştırılabilir anahtar üretir */
function buildScopeKey({ customerTier, paymentMethod, productionYear, productionYearAndOlder, categories, subCategories, brands, stockSource }) {
    const sorted = list => [...list].sort((a, b) => a.localeCompare(b, 'tr')).join(',');
    return [
        customerTier,
        paymentMethod,
        productionYear ? `${productionYear}${productionYearAndOlder ? '-' : ''}` : '',
        sorted(categories || []),
        sorted((subCategories || []).map(s => `${s.main}>${s.name}`)),
        sorted(brands || []),
        stockSource || ''
    ].join('|');
}

const FinancialDiscount = mongoose.model('FinancialDiscount', financialDiscountSchema);

module.exports = FinancialDiscount;
module.exports.CUSTOMER_TIERS = CUSTOMER_TIERS;
module.exports.buildScopeKey = buildScopeKey;
module.exports.STOCK_SOURCES = STOCK_SOURCES;
