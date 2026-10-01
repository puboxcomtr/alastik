const express = require('express');
const jwt = require('jsonwebtoken');
const { resolveSitePrice, resolveXmlShipping, PRICE_HIDDEN } = require('../../../utils/sitePricing');
const { resolveUnitShipping } = require('../../../services/web/cargo/ShippingRuleService');
const router = express.Router();
const WebCart = require('../../../models/web/cart/WebCart');
const WebProduct = require('../../../models/web/catalog/WebProduct');
const { loadMontagePrices, resolveMontageServicePrice } = require('../../../utils/montagePricing');
const CartRules = require('../../../services/web/cart/CartRulesService');
const { getFiyatAyarlari, fiyatAyariUygula } = require('../../../utils/categoryPriceDisplay');

/**
 * Ürünün kategori ayarına göre KDV gösterim biçimi (dahil / haric) ve oranı.
 * Vitrinle sepetin aynı sonucu vermesi için ürün listeleme ile AYNI yardımcıyı kullanır.
 */
/**
 * Giriş yapmış üyenin kimliğini sepete bağlar (admin "Sepeti" görünümü için).
 * Token yoksa veya geçersizse SESSİZCE devam edilir — misafir sepet akışı asla etkilenmez.
 */
const attachMemberToCart = (req, cart) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) return;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded?.id && String(cart.userId || '') !== String(decoded.id)) {
            cart.userId = decoded.id;
        }
    } catch (e) {
        // Misafir ya da süresi dolmuş token — yok say
    }
};

/**
 * Sepet kuralları (çap uyumu, önce montaj, adet kilidi, tek nokta) tüm sitelerde uygulanır.
 * Montaj adedi lastik adedini aşamaz (daha azı alınabilir), diğer hizmetler montaj gerektirir (3 Eyl 2026 kararı).
 */
const cartRulesActive = () => true;
const noReconcile = (items) => ({ items, changed: false, notes: [] });

const getPriceDisplay = async (product, site) => {
    const urun = { diaData: product.diaData };
    fiyatAyariUygula(urun, await getFiyatAyarlari(site));
    return {
        priceDisplay: urun.priceDisplay === 'haric' ? 'haric' : 'dahil',
        kdvRate: Number(urun.vatRate) > 0 ? Number(urun.vatRate) : 20
    };
};

/**
 * Sepette gösterilecek birim fiyat
 * XML ürünleri için kargo dahil fiyat (shippingIncludedPrice), 
 * diğerleri için fiyat4 kullanılır
 */
const getCartUnitPrice = (product, site) => {
    const isXml = product.syncInfo?.syncSource === 'xml_integration';
    if (isXml) {
        // Sitenin kendi kargo dahil fiyatı (varsayılan site global alan, diğerleri siteData.<site>)
        const xmlShipping = resolveXmlShipping(product, site);
        if (xmlShipping?.shippingIncludedPrice > 0) {
            return xmlShipping.shippingIncludedPrice;
        }
    }
    // Site fiyat kuralı (panel: Gösterilecek Fiyat + indirim modu); varsayılan ayarda null döner
    const sitePrice = resolveSitePrice(product, site);
    // Fiyat gizli (__dinamik__16 seçili + dinamik yok): 0 döner → /add guard'ı sepete eklemeyi reddeder
    if (sitePrice === PRICE_HIDDEN) return 0;
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

            // Tür bilgisi her okumada üründen türetilir (2.el lastik artık lastik sayılmaz gibi
            // kural değişiklikleri eski sepet kalemlerine de işlesin)
            const described = CartRules.describeProduct(product);
            if (described.itemType !== item.itemType) hasChanges = true;

            // KDV gösterim ayarı her okumada tazelenir: kategori ayarı panelden değişebilir
            // ve bu alan eklenmeden önce oluşmuş eski sepetlerde hiç yoktur
            const kdvGosterim = await getPriceDisplay(product, req.site);
            if (item.priceDisplay !== kdvGosterim.priceDisplay || item.kdvRate !== kdvGosterim.kdvRate) {
                hasChanges = true;
            }

            updatedItems.push({
                ...item.toObject(),
                ...described,
                ...kdvGosterim,
                unitPrice: currentPrice,
                originalPrice: currentOriginalPrice,
                productImage: currentImage,
                productName: currentName,
                brandName: currentBrand,
                productSlug: currentSlug
            });
        }

        // Kural tutarlılığı: montaj adedi lastik adedi tavanına kırpılır, montajsız diğer hizmetler düşer
        const reconciled = cartRulesActive(req) ? CartRules.reconcile(updatedItems) : noReconcile(updatedItems);
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
        const { sessionId, productKey, quantity = 1, montagePointId = '', ownTire = false } = req.body;

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

        // Üye giriş yaptıysa sepeti üyeye bağla (misafirse hiçbir şey değişmez)
        attachMemberToCart(req, cart);

        // Ürün zaten sepette mi?
        const existingIndex = cart.items.findIndex(item => item.productKey === productKey);
        const originalPrice = product.diaData?.m_birimler?.[0]?.fiyat1 || 0;

        // Sepet kuralları (montaj: lastiğe uygun çap + lastik adedi; diğer hizmet: önce montaj)
        const described = CartRules.describeProduct(product);
        // "Montaj Satın Al" sayfası (kendi lastiği): yalnızca bir montaj noktasından eklenen montaj kaleminde geçerlidir
        const ownTireMontage = Boolean(ownTire) && Boolean(montagePointId) && described.itemType === 'montage';
        const plainItems = cart.items.map(i => i.toObject());
        const rulesOn = cartRulesActive(req);
        const rule = rulesOn
            ? CartRules.validateAdd(plainItems.filter((_, idx) => idx !== existingIndex), { ...described, montagePointId, quantity, ownTire: ownTireMontage })
            : { quantity };
        if (rule.error) {
            return res.status(400).json({ success: false, message: rule.error });
        }
        // Montaj + lastikli sepette adet tavanı: mevcut + eklenen adet lastik adedini aşamaz
        const montageCap = rulesOn && described.itemType === 'montage' && !ownTireMontage && CartRules.hasTires(plainItems)
            ? CartRules.tireCountForRange(plainItems, described.rimRange)
            : null;

        // Stok tavanı kontrolü: sepetteki mevcut + eklenecek adet stoğu aşamaz
        const stock = product.diaData?.gercek_stok ?? 0;
        const currentQty = existingIndex > -1 ? cart.items[existingIndex].quantity : 0;
        const targetQty = montageCap !== null ? Math.min(currentQty + quantity, montageCap) : currentQty + quantity;
        if (targetQty > stock) {
            return res.status(400).json({
                success: false,
                message: `En fazla ${stock} adet ekleyebilirsiniz`
            });
        }

        if (existingIndex > -1) {
            cart.items[existingIndex].quantity = targetQty;
            Object.assign(cart.items[existingIndex], described);
            if (described.itemType === 'montage') cart.items[existingIndex].ownTire = ownTireMontage;
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
                ...(await getPriceDisplay(product, req.site)),
                ...described,
                ownTire: ownTireMontage
            });
        }

        // Montaj adedi lastik adedi tavanını aşıyorsa kırpılır
        const reconciled = cartRulesActive(req) ? CartRules.reconcile(cart.items.map(i => i.toObject())) : noReconcile(cart.items.map(i => i.toObject()));
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

        // Üye giriş yaptıysa sepeti üyeye bağla (misafirse hiçbir şey değişmez)
        attachMemberToCart(req, cart);

        const itemIndex = cart.items.findIndex(item => item.productKey === productKey);
        if (itemIndex === -1) {
            return res.status(404).json({ success: false, message: 'Urun sepette bulunamadi' });
        }

        // Lastikli sepette montaj adedi lastik adedini aşamaz
        const plainItems = cart.items.map(i => i.toObject());
        const rule = cartRulesActive(req) ? CartRules.validateQuantity(plainItems, plainItems[itemIndex], quantity) : {};
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

        // Lastik adedi azaldıysa montaj adedi tavana kırpılır
        const reconciled = cartRulesActive(req) ? CartRules.reconcile(cart.items.map(i => i.toObject())) : noReconcile(cart.items.map(i => i.toObject()));
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

        const removedTire = cart.items.find(item => item.productKey === productKey && item.itemType === 'tire');
        cart.items = cart.items.filter(item => item.productKey !== productKey);

        // Lastik silinince ona bağlı montaj da silinir (lastik ve montaj birbirine bağlıdır)
        const removalNotes = [];
        if (cartRulesActive(req) && removedTire && removedTire.rimSize !== null && removedTire.rimSize !== undefined) {
            const remaining = cart.items.map(i => i.toObject());
            const dropKeys = remaining
                .filter(m => m.itemType === 'montage' && !m.ownTire && m.rimRange
                    && removedTire.rimSize >= m.rimRange.min && removedTire.rimSize <= m.rimRange.max
                    && CartRules.tireCountForRange(remaining, m.rimRange) === 0)
                .map(m => m.productKey);
            if (dropKeys.length > 0) {
                cart.items = cart.items.filter(i => !dropKeys.includes(i.productKey));
                removalNotes.push('Lastik silindiği için bağlı montaj hizmeti de sepetten çıkarıldı');
            }
        }

        // Montaj çıktıysa diğer hizmetler düşer; lastik azaldıysa montaj adedi tavana kırpılır
        const reconciled = cartRulesActive(req) ? CartRules.reconcile(cart.items.map(i => i.toObject())) : noReconcile(cart.items.map(i => i.toObject()));
        if (reconciled.changed) cart.items = reconciled.items;
        cart.lastActivity = new Date();

        await cart.save();

        res.json({ success: true, data: cart, message: 'Urun sepetten kaldirildi', notes: [...removalNotes, ...reconciled.notes] });
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