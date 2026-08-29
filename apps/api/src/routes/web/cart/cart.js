const express = require('express');
const { resolveSitePrice } = require('../../../utils/sitePricing');
const { resolveUnitShipping } = require('../../../services/web/cargo/ShippingRuleService');
const router = express.Router();
const WebCart = require('../../../models/web/cart/WebCart');
const WebProduct = require('../../../models/web/catalog/WebProduct');
const { loadMontagePrices, resolveMontageServicePrice } = require('../../../utils/montagePricing');
const CartRules = require('../../../services/web/cart/CartRulesService');

/**
 * Sepette gösterilecek birim fiyat
 * XML ürünleri için kargo dahil fiyat (shippingIncludedPrice), 
 * diğerleri için fiyat4 kullanılır
 */
const getCartUnitPrice = (product, site) => {
    const isXml = product.syncInfo?.syncSource === 'xml_integration';
    if (isXml && product.customData?.shippingIncludedPrice > 0) {
        return product.customData.shippingIncludedPrice;
    }
    // Site fiyat kuralı (panel: Gösterilecek Fiyat + indirim modu); varsayılan ayarda null döner
    const sitePrice = resolveSitePrice(product, site);
    const basePrice = sitePrice !== null ? sitePrice : (product.diaData?.m_birimler?.[0]?.fiyat4 || 0);
    // Kural tabanlı kargo payı (Kargo Tanımları) müşteri fiyatına dahildir
    const shipping = resolveUnitShipping(product, site, basePrice);
    return shipping && shipping.shippingPerUnit > 0 ? Math.round((basePrice + shipping.shippingPerUnit) * 100) / 100 : basePrice;
};

/**
 * Ürün görselini öncelik sırasıyla getir
 * Frontend getProductImage helper'ı ile aynı mantık:
 */
const getCartProductImage = (product) => {
    const customImages = product.customData?.customImages;
    if (customImages && customImages.length > 0) {
        const sorted = [...customImages].sort((a, b) => (a.order || 0) - (b.order || 0));
        if (sorted[0]?.url) return sorted[0].url;
    }
    if (product.customData?.featuredImage) {
        return product.customData.featuredImage;
    }
    const resimler = product.diaData?.m_resimler;
    if (resimler && resimler.length > 0) {
        const sorted = [...resimler].sort((a, b) =>
            parseInt(a.order_id || '999') - parseInt(b.order_id || '999')
        );
        if (sorted[0]?.aws_url) return sorted[0].aws_url;
    }
    return null;
};

// Sepeti getir
router.get('/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;

        let cart = await WebCart.findOne({ sessionId });

        if (!cart || cart.items.length === 0) {
            return res.json({
                success: true,
                data: { sessionId, items: [], totals: { subtotal: 0, kdv: 0, total: 0, itemCount: 0 } }
            });
        }
        const productKeys = cart.items.map(item => item.productKey);
        const products = await WebProduct.find({ _key: { $in: productKeys } });
        const productMap = new Map(products.map(p => [p._key, p]));

        // Montaj noktasına bağlı hizmetlerde noktaya özel fiyat (0 = ücretsiz) geçerlidir
        const montagePrices = await loadMontagePrices(cart.items, req.site);

        let hasChanges = false;
        const updatedItems = [];

        for (const item of cart.items) {
            const product = productMap.get(item.productKey);
            if (!product || product.diaData?.durum !== 'A') {
                hasChanges = true;
                continue;
            }

            const montagePrice = montagePrices.get(`${item.montagePointId}:${item.productKey}`);
            const currentPrice = typeof montagePrice === 'number' ? montagePrice : getCartUnitPrice(product, req.site);
            const currentOriginalPrice = product.diaData?.m_birimler?.[0]?.fiyat1 || 0;
            const currentImage = getCartProductImage(product);
            const currentName = product.diaData?.aciklama || '';
            const currentBrand = product.diaData?.marka || '';
            const currentSlug = product.customData?.seoUrl || item.productKey;
            if (currentPrice < 0 || (currentPrice === 0 && typeof montagePrice !== 'number')) {
                hasChanges = true;
                continue;
            }
            if (
                item.unitPrice !== currentPrice ||
                item.originalPrice !== currentOriginalPrice ||
                item.productImage !== currentImage ||
                item.productName !== currentName ||
                item.brandName !== currentBrand ||
                item.productSlug !== currentSlug
            ) {
                hasChanges = true;
            }

            // Eski kalemlerde tür bilgisi yoksa üründen türet (kural motoru için)
            const described = item.itemType && item.itemType !== 'product'
                ? { itemType: item.itemType, rimSize: item.rimSize ?? null, rimRange: item.rimRange || null }
                : CartRules.describeProduct(product);
            if (described.itemType !== item.itemType) hasChanges = true;

            updatedItems.push({
                ...item.toObject(),
                ...described,
                unitPrice: currentPrice,
                originalPrice: currentOriginalPrice,
                productImage: currentImage,
                productName: currentName,
                brandName: currentBrand,
                productSlug: currentSlug
            });
        }

        // Kural tutarlılığı: montaj adedi = lastik adedi, montajsız diğer hizmetler düşer
        const reconciled = CartRules.reconcile(updatedItems);
        if (hasChanges || reconciled.changed) {
            cart.items = reconciled.items;
            cart.lastActivity = new Date();
            await cart.save();
        }

        res.json({ success: true, data: cart, notes: reconciled.notes });
    } catch (error) {
        console.error('Cart get error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Sepete ürün ekle
router.post('/add', async (req, res) => {
    try {
        const { sessionId, productKey, quantity = 1, montagePointId = '' } = req.body;

        if (!sessionId || !productKey) {
            return res.status(400).json({ success: false, message: 'sessionId ve productKey gerekli' });
        }

        // Ürünü bul
        const product = await WebProduct.findOne({ _key: productKey });
        if (!product) {
            return res.status(404).json({ success: false, message: 'Urun bulunamadi' });
        }

        // Montaj noktası bağı: nokta anonim etiketle sepete işlenir (ad/adres satın alma sonrası paylaşılır)
        let montagePointLabel = '';
        let montagePrice = null;
        if (montagePointId) {
            const WebMontagePoint = require('../../../models/web/content/WebMontagePoint');
            const point = String(montagePointId).match(/^[a-f0-9]{24}$/i)
                ? await WebMontagePoint.findOne({ _id: montagePointId, site: req.site, isActive: true }, { city: 1, district: 1, services: 1 }).lean()
                : null;
            if (!point) {
                return res.status(400).json({ success: false, message: 'Montaj noktası bulunamadı' });
            }
            montagePointLabel = `${point.city}${point.district ? ` / ${point.district}` : ''}`;
            // Noktaya özel hizmet fiyatı (0 = ücretsiz); nokta bu hizmeti vermiyorsa katalog fiyatı
            const service = (point.services || []).find(s => String(s.productKey) === String(productKey));
            montagePrice = resolveMontageServicePrice(service);
        }

        // Fiyat: noktaya özel fiyat varsa o, yoksa site fiyat kuralı (fiyat4)
        const unitPrice = montagePrice !== null ? montagePrice : getCartUnitPrice(product, req.site);
        if (unitPrice < 0 || (unitPrice === 0 && montagePrice === null)) {
            return res.status(400).json({ success: false, message: 'Urun fiyati bulunamadi' });
        }

        // Sepeti bul veya oluştur
        let cart = await WebCart.findOne({ sessionId });

        if (!cart) {
            cart = new WebCart({ sessionId, items: [] });
        }

        // Ürün zaten sepette mi?
        const existingIndex = cart.items.findIndex(item => item.productKey === productKey);
        const originalPrice = product.diaData?.m_birimler?.[0]?.fiyat1 || 0;

        // Sepet kuralları (montaj: lastiğe uygun çap + lastik adedi; diğer hizmet: önce montaj)
        const described = CartRules.describeProduct(product);
        const plainItems = cart.items.map(i => i.toObject());
        const rule = CartRules.validateAdd(plainItems.filter((_, idx) => idx !== existingIndex), { ...described, montagePointId, quantity });
        if (rule.error) {
            return res.status(400).json({ success: false, message: rule.error });
        }
        const forcedQuantity = described.itemType === 'montage' && CartRules.hasTires(plainItems) ? rule.quantity : null;

        // Stok tavanı kontrolü: sepetteki mevcut + eklenecek adet stoğu aşamaz
        const stock = product.diaData?.gercek_stok ?? 0;
        const currentQty = existingIndex > -1 ? cart.items[existingIndex].quantity : 0;
        const targetQty = forcedQuantity !== null ? forcedQuantity : currentQty + quantity;
        if (targetQty > stock) {
            return res.status(400).json({
                success: false,
                message: `En fazla ${stock} adet ekleyebilirsiniz`
            });
        }

        if (existingIndex > -1) {
            cart.items[existingIndex].quantity = targetQty;
            Object.assign(cart.items[existingIndex], described);
            if (montagePointId) {
                cart.items[existingIndex].montagePointId = montagePointId;
                cart.items[existingIndex].montagePointLabel = montagePointLabel;
            }
        } else {
            // Resim al
            const productImage = getCartProductImage(product);

            cart.items.push({
                montagePointId,
                montagePointLabel,
                productKey,
                productName: product.diaData?.aciklama || '',
                productImage,
                productSlug: product.customData?.seoUrl || productKey,
                brandName: product.diaData?.marka || '',
                quantity: targetQty,
                unitPrice,
                originalPrice,
                kdvRate: 20,
                ...described
            });
        }

        // Lastik eklendiyse montaj adedini eşitle
        const reconciled = CartRules.reconcile(cart.items.map(i => i.toObject()));
        if (reconciled.changed) cart.items = reconciled.items;

        cart.lastActivity = new Date();
        cart.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        await cart.save();

        res.json({ success: true, data: cart, message: 'Urun sepete eklendi', notes: reconciled.notes });
    } catch (error) {
        console.error('Cart add error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Ürün adedi güncelle
router.put('/update', async (req, res) => {
    try {
        const { sessionId, productKey, quantity } = req.body;

        if (!sessionId || !productKey || quantity < 1) {
            return res.status(400).json({ success: false, message: 'Gecersiz parametreler' });
        }

        const cart = await WebCart.findOne({ sessionId });
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Sepet bulunamadi' });
        }

        const itemIndex = cart.items.findIndex(item => item.productKey === productKey);
        if (itemIndex === -1) {
            return res.status(404).json({ success: false, message: 'Urun sepette bulunamadi' });
        }

        // Lastikli sepette montaj adedi elle değiştirilemez
        const plainItems = cart.items.map(i => i.toObject());
        const rule = CartRules.validateQuantity(plainItems, plainItems[itemIndex]);
        if (rule.error) {
            return res.status(400).json({ success: false, message: rule.error });
        }

        // Stok tavanı kontrolü: güncellenen adet stoğu aşamaz
        const product = await WebProduct.findOne({ _key: productKey });
        const stock = product?.diaData?.gercek_stok ?? 0;
        if (quantity > stock) {
            return res.status(400).json({
                success: false,
                message: `En fazla ${stock} adet ekleyebilirsiniz`
            });
        }

        cart.items[itemIndex].quantity = quantity;

        // Lastik adedi değiştiyse montaj adedini eşitle
        const reconciled = CartRules.reconcile(cart.items.map(i => i.toObject()));
        if (reconciled.changed) cart.items = reconciled.items;
        cart.lastActivity = new Date();

        await cart.save();

        res.json({ success: true, data: cart, notes: reconciled.notes });
    } catch (error) {
        console.error('Cart update error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Ürünü sepetten kaldır
router.delete('/remove', async (req, res) => {
    try {
        const { sessionId, productKey } = req.body;

        const cart = await WebCart.findOne({ sessionId });
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Sepet bulunamadi' });
        }

        cart.items = cart.items.filter(item => item.productKey !== productKey);

        // Montaj çıktıysa diğer hizmetler düşer; lastik çıktıysa montaj adedi eşitlenir
        const reconciled = CartRules.reconcile(cart.items.map(i => i.toObject()));
        if (reconciled.changed) cart.items = reconciled.items;
        cart.lastActivity = new Date();

        await cart.save();

        res.json({ success: true, data: cart, message: 'Urun sepetten kaldirildi', notes: reconciled.notes });
    } catch (error) {
        console.error('Cart remove error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Sepeti temizle
router.delete('/clear/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;

        await WebCart.findOneAndDelete({ sessionId });

        res.json({ success: true, message: 'Sepet temizlendi' });
    } catch (error) {
        console.error('Cart clear error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;