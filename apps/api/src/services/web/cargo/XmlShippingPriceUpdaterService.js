const Cargo = require('../../../models/admin/settings/Cargo');
const WebProduct = require('../../../models/web/catalog/WebProduct');
const CargoCalculatorService = require('./CargoCalculatorService');

class XmlShippingPriceUpdaterService {

    /**
     * Tüm XML kaynaklı ürünlerin kargo dahil fiyatlarını günceller
     * - Aktif XML kargosunu çeker
     * - Her ürün için 1 adetlik kargo hesaplar
     * - bulkWrite ile DB'ye yazar
     */
    async updateAll() {
        const startTime = Date.now();
        console.log('[XmlShippingPriceUpdater] Başlıyor...');

        try {
            // 1. Aktif XML kargosunu çek
            const xmlCargo = await Cargo.findOne({
                isActive: true,
                productType: 'xml_integration'
            }).sort({ webOrder: 1 }).lean();

            if (!xmlCargo) {
                console.log('[XmlShippingPriceUpdater] Aktif XML kargosu yok, işlem atlandı');
                return { success: false, message: 'Aktif XML kargosu yok', updated: 0 };
            }

            // 2. Tüm XML ürünleri çek
            const xmlProducts = await WebProduct.find(
                { 'syncInfo.syncSource': 'xml_integration' },
                {
                    _key: 1,
                    'diaData.anabirimdesi': 1,
                    'customData.webPrice': 1
                }
            ).lean();

            console.log(`[XmlShippingPriceUpdater] ${xmlProducts.length} XML ürün işlenecek`);

            if (xmlProducts.length === 0) {
                return { success: true, updated: 0, duration: 0 };
            }

            // 3. Her ürün için 1 adetlik kargo hesapla
            const bulkOps = [];
            let updated = 0;

            for (const product of xmlProducts) {
                const desi = product.diaData?.anabirimdesi || 0;
                const webPrice = product.customData?.webPrice || 0;

                // 1 adetlik kargo hesapla
                const shippingPerUnit = CargoCalculatorService.calculateShippingPrice(desi, xmlCargo);

                // Ücretsiz kargo kontrolü (1 adet bazında)
                const freeCheck = CargoCalculatorService.checkFreeShipping(webPrice, desi, xmlCargo);
                const finalShippingPerUnit = freeCheck.isFree ? 0 : shippingPerUnit;

                const shippingIncludedPrice = Math.round((webPrice + finalShippingPerUnit) * 100) / 100;

                bulkOps.push({
                    updateOne: {
                        filter: { _key: product._key },
                        update: {
                            $set: {
                                'customData.shippingIncludedPrice': shippingIncludedPrice,
                                'customData.shippingPerUnit': Math.round(finalShippingPerUnit * 100) / 100
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