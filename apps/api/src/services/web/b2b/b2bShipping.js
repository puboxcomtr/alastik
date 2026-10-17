/**
 * Bayi sitesi kargo payı — sitenin DIA ayarında "Kargo Bedeli Hizmet Kartı" (siparis.kargoHizmetKartKey) seçiliyse
 * kargo ücreti fiyata / sepete / siparişe yansır; seçili değilse kargo uygulanmaz.
 *
 * Ürün başına (1 adet, KDV dahil TL):
 *  • Stoktaki ürün: Kargo Kuralları (ShippingRuleService — ebat / kategori / marka / ürün / desi); gösterim tanımın
 *    "Kargo Fiyatı" ayarından (fiyata dahil / hariç).
 *  • XML ürün: sitenin XML desi tablosundan hesaplanan pay (customData.siteData.<site>.shippingPerUnit); hep fiyata dahil.
 * Bayi iskontoları kargo payına uygulanmaz; DIA'ya ürün satırlarından ayrı bir hizmet satırı olarak gider.
 */
const WebDia = require('../../../models/plugins/dia/DiaSettings');
const WebProduct = require('../../../models/web/catalog/WebProduct');
const ShippingRuleService = require('../cargo/ShippingRuleService');

const round2 = n => Math.round(n * 100) / 100;

/** Sitede kargo ücreti uygulanıyor mu (kargo bedeli hizmet kartı seçili mi) */
async function isShippingEnabled(site) {
    const settings = await WebDia.getSettings(site);
    return (Number(settings?.siparis?.kargoHizmetKartKey) || 0) > 0;
}

/**
 * Ürünün bu sitedeki birim kargo payı. Ücretsiz kargo eşiği ürünün liste satış fiyatına (fiyat4) göre değerlendirilir;
 * böylece liste, sepet ve sipariş aynı sonucu verir (bayi iskontosundan bağımsız).
 * @param {object} product WebProduct (diaData, customData, syncInfo, _key)
 * @returns {{ perUnit: number, excluded: boolean }}
 */
function shippingOfProduct(product, site) {
    if (product?.syncInfo?.syncSource === 'xml_integration') {
        const perUnit = Number(product.customData?.siteData?.[site]?.shippingPerUnit) || 0;
        return { perUnit: round2(perUnit), excluded: false };
    }
    const salePrice = parseFloat(product?.diaData?.m_birimler?.[0]?.fiyat4) || 0;
    const rule = ShippingRuleService.resolveUnitShipping(product, site, salePrice);
    return { perUnit: round2(rule?.shippingPerUnit || 0), excluded: rule?.excluded === true };
}

/**
 * Stok kodları için birim kargo payları (liste, sepet ve sipariş aynı fonksiyonu kullanır).
 * @param {string[]} stockCodes
 * @returns {Promise<Map<string, { perUnit: number, excluded: boolean }>>} stok kodu → kargo
 */
async function shippingForStockCodes(site, stockCodes) {
    await ShippingRuleService.loadShippingRules();
    const codes = [...new Set(stockCodes.map(String))];
    const products = await WebProduct.find({ sites: site, 'diaData.stokkartkodu': { $in: codes } })
        .select('_key diaData customData syncInfo').lean();
    const byCode = new Map(products.map(p => [p.diaData?.stokkartkodu, p]));
    const result = new Map();
    for (const code of codes) {
        const product = byCode.get(code);
        result.set(code, product ? shippingOfProduct(product, site) : { perUnit: 0, excluded: false });
    }
    return result;
}

module.exports = { isShippingEnabled, shippingOfProduct, shippingForStockCodes };
