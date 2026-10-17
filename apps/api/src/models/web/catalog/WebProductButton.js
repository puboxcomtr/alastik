const mongoose = require('mongoose');
const { SITE_SLUGS } = require('../../../config/sites');

/**
 * Ürün Butonu tanımı — ürünlere tek tek açılıp kapatılabilen etiket/buton (ör. "Ücretsiz Kargo").
 * Tanımlar site bazlıdır ve panelden yönetilir; ürün başına açık butonlar ürünün
 * customData.siteData.<site>.buttons alanında `key` listesi olarak tutulur.
 */
// Renk alanları yalnız #RGB / #RRGGBB biçiminde kabul edilir (vitrinde doğrudan stile yazılır)
const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const hexColor = { type: String, default: '', trim: true, validate: { validator: v => v === '' || HEX_COLOR.test(v), message: 'Renk #RRGGBB biçiminde olmalıdır' } };

const webProductButtonSchema = new mongoose.Schema({
    site: { type: String, enum: SITE_SLUGS, required: true, index: true },
    // Üründe saklanan sabit anahtar (etiket değişse de değişmez)
    key: { type: String, required: true, trim: true },
    // Panelde ve vitrinde görünen ad
    label: { type: String, required: true, trim: true },
    // Butonun içeriği (vitrinde tıklanınca/üzerine gelince gösterilecek açıklama)
    content: { type: String, default: '' },
    // Görünüş (vitrin etiketi): zemin soldan sağa colorFrom → colorTo geçişlidir (ikisi aynıysa düz renk),
    // yazı/ikon rengi textColor. Boş bırakılan renkte sitenin ana rengi / beyaz yazı kullanılır.
    colorFrom: hexColor,
    colorTo: hexColor,
    textColor: hexColor,
    // İkon sınıfı (ör. "ri-fire-fill"); boşsa yalnız yazı gösterilir
    icon: { type: String, default: '', trim: true },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
}, {
    timestamps: true,
    collection: 'webproductbuttons'
});

webProductButtonSchema.index({ site: 1, key: 1 }, { unique: true });

module.exports = mongoose.models.WebProductButton || mongoose.model('WebProductButton', webProductButtonSchema);
module.exports.HEX_COLOR = HEX_COLOR;
