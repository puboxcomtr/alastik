const express = require('express');
const router = express.Router();
const WebCart = require('../../../models/web/cart/WebCart');
const WebProduct = require('../../../models/web/catalog/WebProduct');

// Sepeti getir
router.get('/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;

        let cart = await WebCart.findOne({ sessionId });

        if (!cart) {
            cart = { sessionId, items: [], totals: { subtotal: 0, kdv: 0, total: 0, itemCount: 0 } };
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
        const unitPrice = product.diaData?.m_birimler?.[0]?.fiyat4 || 0;
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
        if (existingIndex > -1) {
            cart.items[existingIndex].quantity += quantity;
        } else {
            // Resim al
            const productImage = product.diaData?.m_resimler?.[0]?.aws_url || null;

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