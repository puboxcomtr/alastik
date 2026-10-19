const Cargo = require('../../../models/admin/settings/Cargo');
const WebProduct = require('../../../models/web/catalog/WebProduct');
const CargoCalculatorService = require('./CargoCalculatorService');
const { SITES, DEFAULT_SITE } = require('../../../config/sites');

class XmlShippingPriceUpdaterService {

    async updateAll(site = DEFAULT_SITE) {
        const startTime = Date.now();
        const slug = SITES[site] ? site : DEFAULT_SITE;
        const isDefaultSite = slug === DEFAULT_SITE;
        console.log(`[XmlShippingPriceUpdater] Başlıyor... (site: ${slug})`);

        try {
            const xmlCargo = await Cargo.findOne({
                isActive: true,
                productType: 'xml_integration',
                site: slug
            }).sort({ webOrder: 1 }).lean();

            if (!xmlCargo) {
                console.log(`[XmlShippingPriceUpdater] Aktif XML kargosu yok (${slug}), işlem atlandı`);
                return { success: false, message: 'Aktif XML kargosu yok', updated: 0 };
            }

            const xmlProducts = await WebProduct.find(
                { 'syncInfo.syncSource': 'xml_integration', sites: slug },
                {
                    _key: 1,
                    'diaData.anabirimdesi': 1,
                    'customData.webPrice': 1,
                    [`customData.siteData.${slug}.xmlPrice`]: 1
                }
            ).lean();

            console.log(`[XmlShippingPriceUpdater] ${xmlProducts.length} XML ürün işlenecek (${slug})`);

            if (xmlProducts.length === 0) {
                return { success: true, updated: 0, duration: 0 };
            }

            const includedField = isDefaultSite
                ? 'customData.shippingIncludedPrice'
                : `customData.siteData.${slug}.shippingIncludedPrice`;
            const perUnitField = isDefaultSite
                ? 'customData.shippingPerUnit'
                : `customData.siteData.${slug}.shippingPerUnit`;

            const bulkOps = [];
            let updated = 0;

            for (const product of xmlProducts) {
                const desi = product.diaData?.anabirimdesi || 0;
                const siteXmlPrice = parseFloat(product.customData?.siteData?.[slug]?.xmlPrice) || 0;
                const webPrice = isDefaultSite
                    ? (product.customData?.webPrice || 0)
                    : (siteXmlPrice > 0 ? siteXmlPrice : (product.customData?.webPrice || 0));

                const shippingPerUnit = CargoCalculatorService.calculateShippingPrice(desi, xmlCargo);

                const freeCheck = CargoCalculatorService.checkFreeShipping(webPrice, desi, xmlCargo);
                const finalShippingPerUnit = freeCheck.isFree ? 0 : shippingPerUnit;

                const shippingIncludedPrice = Math.round((webPrice + finalShippingPerUnit) * 100) / 100;

                bulkOps.push({
                    updateOne: {
                        filter: { _key: product._key },
                        update: {
                            $set: {
                                [includedField]: shippingIncludedPrice,
                                [perUnitField]: Math.round(finalShippingPerUnit * 100) / 100
                            }
                        }
                    }
                });

                if (bulkOps.length >= 1000) {
                    await WebProduct.bulkWrite(bulkOps, { ordered: false });
                    updated += bulkOps.length;
                    bulkOps.length = 0;
                }
            }

            if (bulkOps.length > 0) {
                await WebProduct.bulkWrite(bulkOps, { ordered: false });
                updated += bulkOps.length;
            }

            const duration = Date.now() - startTime;

            console.log(`[XmlShippingPriceUpdater] Tamamlandı: ${updated} ürün, ${duration}ms`);

            return {
                success: true,
                updated,
                cargoName: xmlCargo.name,
                duration
            };

        } catch (error) {
            console.error('[XmlShippingPriceUpdater] Hata:', error.message);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new XmlShippingPriceUpdaterService();