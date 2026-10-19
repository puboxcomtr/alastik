const WebDia = require('../../../models/plugins/dia/DiaSettings');
const WebProduct = require('../../../models/web/catalog/WebProduct');
const ShippingRuleService = require('../cargo/ShippingRuleService');

const round2 = n => Math.round(n * 100) / 100;

async function isShippingEnabled(site) {
    const settings = await WebDia.getSettings(site);
    return (Number(settings?.siparis?.kargoHizmetKartKey) || 0) > 0;
}

function shippingOfProduct(product, site) {
    if (product?.syncInfo?.syncSource === 'xml_integration') {
        const perUnit = Number(product.customData?.siteData?.[site]?.shippingPerUnit) || 0;
        return { perUnit: round2(perUnit), excluded: false };
    }
    const salePrice = parseFloat(product?.diaData?.m_birimler?.[0]?.fiyat4) || 0;
    const rule = ShippingRuleService.resolveUnitShipping(product, site, salePrice);
    return { perUnit: round2(rule?.shippingPerUnit || 0), excluded: rule?.excluded === true };
}

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
