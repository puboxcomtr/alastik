const Cargo = require('../../../models/admin/settings/Cargo');
const WebProduct = require('../../../models/web/catalog/WebProduct');
const { SITES, DEFAULT_SITE } = require('../../../config/sites');

class CargoCalculatorService {

    calculateShippingPrice(totalDesi, cargo) {
        const ranges = cargo.desiPricing?.ranges || [];
        const extraPerDesi = cargo.desiPricing?.extraPerDesi || 0;
        const fixedPrice = cargo.fixedPrice || 0;

        if (totalDesi <= 0) {
            return fixedPrice;
        }

        if (ranges.length === 0) {
            return fixedPrice;
        }

        const matchedRange = ranges.find(r => totalDesi >= r.min && totalDesi <= r.max);
        if (matchedRange) {
            return matchedRange.price;
        }

        const sortedRanges = [...ranges].sort((a, b) => b.max - a.max);
        const lastRange = sortedRanges[0];
        if (totalDesi > lastRange.max) {
            const extraDesi = totalDesi - lastRange.max;
            return lastRange.price + (extraDesi * extraPerDesi);
        }

        return fixedPrice;
    }

    checkFreeShipping(totalAmount, totalDesi, cargo) {
        const threshold = cargo.freeShippingThreshold || 0;
        const desiLimit = cargo.freeShippingDesiLimit || 0;

        if (threshold > 0 && totalAmount >= threshold) {
            return { isFree: true, reason: 'amount' };
        }

        if (desiLimit > 0 && totalDesi >= desiLimit) {
            return { isFree: true, reason: 'desi' };
        }

        return { isFree: false, reason: null };
    }

    async loadCartItems(items) {
        if (!Array.isArray(items) || items.length === 0) {
            return { xmlItems: [], diaItems: [] };
        }

        const keys = items.map(i => String(i._key));
        const products = await WebProduct.find(
            { _key: { $in: keys } },
            {
                _key: 1,
                'diaData.stokkartkodu': 1,
                'diaData.anabirimdesi': 1,
                'diaData.aciklama': 1,
                'customData.webPrice': 1,
                'syncInfo.syncSource': 1
            }
        ).lean();

        const productMap = {};
        for (const p of products) {
            productMap[p._key] = p;
        }

        const xmlItems = [];
        const diaItems = [];

        for (const item of items) {
            const product = productMap[String(item._key)];
            if (!product) continue;

            const quantity = parseInt(item.quantity) || 1;
            const desi = product.diaData?.anabirimdesi || 0;
            const webPrice = product.customData?.webPrice || 0;
            const isXml = product.syncInfo?.syncSource === 'xml_integration';

            const enriched = {
                _key: product._key,
                stokkartkodu: product.diaData?.stokkartkodu || '',
                aciklama: product.diaData?.aciklama || '',
                quantity,
                anabirimdesi: desi,
                totalDesi: desi * quantity,
                webPrice,
                productSubtotal: webPrice * quantity,
                isXml
            };

            if (isXml) {
                xmlItems.push(enriched);
            } else {
                diaItems.push(enriched);
            }
        }

        return { xmlItems, diaItems };
    }

    async calculateXmlShipping(xmlItems, cargo) {
        if (xmlItems.length === 0) return { items: [], totalShipping: 0 };

        const calculatedItems = [];
        let totalShipping = 0;

        for (const item of xmlItems) {
            const shippingPerUnit = this.calculateShippingPrice(item.anabirimdesi, cargo);

            const freeCheck = this.checkFreeShipping(
                item.webPrice,
                item.anabirimdesi,
                cargo
            );

            const finalShippingPerUnit = freeCheck.isFree ? 0 : shippingPerUnit;
            const finalShipping = finalShippingPerUnit * item.quantity;
            const displayPricePerUnit = item.webPrice + finalShippingPerUnit;

            calculatedItems.push({
                ...item,
                shippingTotal: Math.round(finalShipping * 100) / 100,
                shippingPerUnit: Math.round(shippingPerUnit * 100) / 100,
                displayPricePerUnit: Math.round(displayPricePerUnit * 100) / 100,
                displayTotal: Math.round((displayPricePerUnit * item.quantity) * 100) / 100,
                isFreeShipping: freeCheck.isFree,
                freeShippingReason: freeCheck.reason
            });

            totalShipping += finalShipping;
        }

        return {
            items: calculatedItems,
            totalShipping: Math.round(totalShipping * 100) / 100
        };
    }

    async calculate(items, site = DEFAULT_SITE) {
        const slug = SITES[site] ? site : DEFAULT_SITE;

        const { xmlItems, diaItems } = await this.loadCartItems(items);

        const xmlCargo = await Cargo.findOne({
            isActive: true,
            productType: 'xml_integration',
            site: slug
        }).sort({ webOrder: 1 }).lean();

        let xmlResult = { items: [], totalShipping: 0 };
        let cargoInfo = null;

        if (xmlCargo) {
            xmlResult = await this.calculateXmlShipping(xmlItems, xmlCargo);
            cargoInfo = {
                id: xmlCargo._id,
                name: xmlCargo.name,
                code: xmlCargo.code,
                logo: xmlCargo.logo || '',
                paymentType: xmlCargo.paymentType || 'sender'
            };
        } else {
            xmlResult.items = xmlItems.map(item => ({
                ...item,
                shippingTotal: 0,
                shippingPerUnit: 0,
                displayPricePerUnit: item.webPrice,
                displayTotal: item.productSubtotal,
                isFreeShipping: true,
                freeShippingReason: 'no_cargo'
            }));
        }

        const diaResult = {
            items: diaItems.map(item => ({
                ...item,
                shippingTotal: 0,
                shippingPerUnit: 0,
                displayPricePerUnit: item.webPrice,
                displayTotal: item.productSubtotal,
                isFreeShipping: true,
                freeShippingReason: 'dia_default'
            })),
            totalShipping: 0
        };

        const allItems = [...xmlResult.items, ...diaResult.items];

        const productSubtotal = allItems.reduce((sum, i) => sum + i.productSubtotal, 0);
        const totalShipping = xmlResult.totalShipping;
        const displayTotal = allItems.reduce((sum, i) => sum + i.displayTotal, 0);

        const isSenderPayment = cargoInfo?.paymentType === 'sender';

        return {
            success: true,
            items: allItems,
            summary: {
                productSubtotal: Math.round(productSubtotal * 100) / 100,
                shippingTotal: Math.round(totalShipping * 100) / 100,
                customerTotal: isSenderPayment
                    ? Math.round(displayTotal * 100) / 100
                    : Math.round((productSubtotal + totalShipping) * 100) / 100,
                adminBreakdown: {
                    productTotal: Math.round(productSubtotal * 100) / 100,
                    cargoTotal: Math.round(totalShipping * 100) / 100
                }
            },
            cargo: cargoInfo,
            paymentType: cargoInfo?.paymentType || 'sender'
        };
    }
}

module.exports = new CargoCalculatorService();