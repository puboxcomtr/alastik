const express = require('express');
const router = express.Router();
const WebCart = require('../../../models/web/cart/WebCart');
const WebProduct = require('../../../models/web/catalog/WebProduct');

/**
 * Sepette gösterilecek birim fiyat
 * XML ürünleri için kargo dahil fiyat (shippingIncludedPrice), 
 * diğerleri için fiyat4 kullanılır
 */
const getCartUnitPrice = (product) => {
    const isXml = product.syncInfo?.syncSource === 'xml_integration';
    if (isXml && product.customData?.shippingIncludedPrice > 0) {
        return product.customData.shippingIncludedPrice;
    }
    return product.diaData?.m_birimler?.[0]?.fiyat4 || 0;
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

        let hasChanges = false;
        const updatedItems = [];

        for (const item of cart.items) {
            const product = productMap.get(item.productKey);
            if (!product || product.diaData?.durum !== 'A') {
                hasChanges = true;
                continue;
            }

            const currentPrice = getCartUnitPrice(product);
            const currentOriginalPrice = product.diaData?.m_birimler?.[0]?.fiyat1 || 0;
            const currentImage = getCartProductImage(product);
            const currentName = product.diaData?.aciklama || '';
            const currentBrand = product.diaData?.marka || '';
            const currentSlug = product.customData?.seoUrl || item.productKey;
            if (currentPrice <= 0) {
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

            updatedItems.push({
                ...item.toObject(),
                unitPrice: currentPrice,
                originalPrice: currentOriginalPrice,
                productImage: currentImage,
                productName: currentName,
                brandName: currentBrand,
                productSlug: currentSlug
            });
        }
        if (hasChanges) {
            cart.items = updatedItems;
            cart.lastActivity = new Date();
            await cart.save();
        }

        res.json({ success: true, data: cart });
    } catch (error) {
        console.error('Cart get error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Sepete ürün ekle
router.post('/add', async (req, res) => {
    try {
        const { sessionId, productKey, quantity = 1 } = req.body;

        if (!sessionId || !productKey) {
            return res.status(400).json({ success: false, message: 'sessionId ve productKey gerekli' });
        }

        // Ürünü bul
        const product = await WebProduct.findOne({ _key: productKey });
        if (!product) {
            return res.status(404).json({ success: false, message: 'Urun bulunamadi' });
        }

        // Fiyat al (fiyat4)
        const unitPrice = getCartUnitPrice(product);
        if (unitPrice <= 0) {
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

        // Stok tavanı kontrolü: sepetteki mevcut + eklenecek adet stoğu aşamaz
        const stock = product.diaData?.gercek_stok ?? 0;
        const currentQty = existingIndex > -1 ? cart.items[existingIndex].quantity : 0;
        if (currentQty + quantity > stock) {
            return res.status(400).json({
                success: false,
                message: `En fazla ${stock} adet ekleyebilirsiniz`
            });
        }

        if (existingIndex > -1) {
            cart.items[existingIndex].quantity += quantity;
        } else {
            // Resim al
            const productImage = getCartProductImage(product);

            cart.items.push({
                productKey,
                productName: product.diaData?.aciklama || '',
                productImage,
                productSlug: product.customData?.seoUrl || productKey,
                brandName: product.diaData?.marka || '',
                quantity,
                unitPrice,
                originalPrice,
                kdvRate: 20
            });
        }

        cart.lastActivity = new Date();
        cart.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        await cart.save();

        res.json({ success: true, data: cart, message: 'Urun sepete eklendi' });
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
        cart.lastActivity = new Date();

        await cart.save();

        res.json({ success: true, data: cart });
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
        cart.lastActivity = new Date();

        await cart.save();

        res.json({ success: true, data: cart, message: 'Urun sepetten kaldirildi' });
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