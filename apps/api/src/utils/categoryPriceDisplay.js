/**
 * Kategori bazlı fiyat gösterim ayarı (KDV dahil / hariç).
 *
 * Panelde kategoriye "Fiyat gösterimi: KDV Hariç" seçilirse ürünün vitrin fiyatından KDV
 * İÇERİDEN çıkarılıp "+ KDV" olarak gösterilir — ÖDENEN TUTAR DEĞİŞMEZ, yalnız gösterim ayrışır.
 * Kaynak: WebCategory.siteContent.<site>.priceDisplay / vatRate
 *
 * Ürün listeleme, ürün detayı ve sepet aynı ayarı buradan okur (tek kaynak).
 */
// Kategori fiyat gösterim ayarları (60 sn önbellekli): kategori adı -> { priceDisplay, vatRate }
const fiyatAyarOnbellek = new Map();

async function getFiyatAyarlari(site) {
    const anahtar = site;
    const kayit = fiyatAyarOnbellek.get(anahtar);

    if (kayit && Date.now() - kayit.zaman < 60 * 1000) return kayit.harita;

    const WebCategory = require('../models/web/catalog/WebCategory');
    const kategoriler = await WebCategory.find({
        $or: [
            { [`siteContent.${site}.priceDisplay`]: 'haric' },
            { [`siteContent.${site}.hideStockCode`]: true }
        ]
    })
        .select(`name siteContent.${site}.priceDisplay siteContent.${site}.vatRate siteContent.${site}.hideStockCode`)
        .lean()
        .catch(() => []);

    const harita = new Map();

    kategoriler.forEach(k => {
        const ayar = k.siteContent?.[site] || {};

        harita.set(k.name, {
            priceDisplay: ayar.priceDisplay || 'dahil',
            vatRate: ayar.vatRate ?? 20,
            hideStockCode: ayar.hideStockCode === true
        });
    });

    fiyatAyarOnbellek.set(anahtar, { zaman: Date.now(), harita });

    return harita;
}

/**
 * Ürünün kategorilerinden birinde "KDV Hariç" ayarı varsa ürüne işler.
 */
function fiyatAyariUygula(urun, harita) {
    if (!harita.size) return urun;

    // En özel kategoriden en genele doğru taranır: alt kategori ayarı üst kategoriyi ezer.
    // Ters sırada tarandığında üst kategori haritada olduğu anda alttakini gölgeliyordu.
    const adlar = (urun.diaData?.m_kategoriler || []).flatMap(k => [
        k.kategori_aciklama_3, k.kategori_aciklama_2, k.kategori_aciklama_1
    ]).filter(Boolean);

    for (const ad of adlar) {
        const ayar = harita.get(ad);

        if (ayar) {
            urun.priceDisplay = ayar.priceDisplay;
            urun.vatRate = ayar.vatRate;
            urun.hideStockCode = ayar.hideStockCode;

            return urun;
        }
    }

    return urun;
}

module.exports = { getFiyatAyarlari, fiyatAyariUygula };
