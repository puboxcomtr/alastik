const express = require('express');
const User = require('../models/User');
const { authenticateUser } = require('../middleware/auth');
const router = express.Router();

/**
 * Sepeti getir
 * GET /api/cart
 */
router.get('/', authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('activeCart');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    // Sepet süresi dolmuş olsa bile kullanıcı elle temizlemedikçe silme

    res.json({
      success: true,
      data: user.activeCart
    });
  } catch (error) {
    console.error('Sepet getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sepet bilgileri alınırken hata oluştu'
    });
  }
});

/**
 * Sepete ürün ekle
 * POST /api/cart/add
 */
router.post('/add', authenticateUser, async (req, res) => {
  try {
    const { 
      productId, 
      name, 
      brand, 
      sku, 
      price, 
      originalPrice, 
      quantity = 1,
      specifications,
      images 
    } = req.body;

    if (!productId || !name || !price) {
      return res.status(400).json({
        success: false,
        message: 'Ürün ID, adı ve fiyatı gereklidir'
      });
    }

    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    // Sepette aynı ürün var mı kontrol et
    const existingItemIndex = user.activeCart.items.findIndex(
      item => item.productId === productId
    );

    if (existingItemIndex > -1) {
      // Ürün zaten sepette, miktarını artır
      user.activeCart.items[existingItemIndex].quantity += quantity;
      user.activeCart.items[existingItemIndex].updatedAt = new Date();
    } else {
      // Yeni ürün ekle
      user.activeCart.items.push({
        productId,
        name,
        brand,
        sku,
        price,
        originalPrice,
        quantity,
        specifications,
        images,
        addedAt: new Date(),
        updatedAt: new Date()
      });
    }

    // Sepet toplamlarını güncelle
    user.activeCart.totalItems = user.activeCart.items.reduce((total, item) => total + item.quantity, 0);
    user.activeCart.totalPrice = user.activeCart.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    user.activeCart.lastUpdated = new Date();
    user.activeCart.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 gün uzat

    await user.save();

    res.json({
      success: true,
      message: 'Ürün sepete eklendi',
      data: user.activeCart
    });
  } catch (error) {
    console.error('Sepete ekleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Ürün sepete eklenirken hata oluştu'
    });
  }
});

/**
 * Sepetten ürün çıkar
 * DELETE /api/cart/remove/:productId
 */
router.delete('/remove/:productId', authenticateUser, async (req, res) => {
  try {
    const { productId } = req.params;
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    // Ürünü sepetten çıkar
    user.activeCart.items = user.activeCart.items.filter(
      item => item.productId !== productId
    );

    // Sepet toplamlarını güncelle
    user.activeCart.totalItems = user.activeCart.items.reduce((total, item) => total + item.quantity, 0);
    user.activeCart.totalPrice = user.activeCart.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    user.activeCart.lastUpdated = new Date();

    await user.save();

    res.json({
      success: true,
      message: 'Ürün sepetten çıkarıldı',
      data: user.activeCart
    });
  } catch (error) {
    console.error('Sepetten çıkarma hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Ürün sepetten çıkarılırken hata oluştu'
    });
  }
});

/**
 * Sepetteki ürün miktarını güncelle
 * PUT /api/cart/update/:productId
 */
router.put('/update/:productId', authenticateUser, async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir miktar giriniz'
      });
    }

    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    // Ürünü bul ve miktarını güncelle
    const itemIndex = user.activeCart.items.findIndex(
      item => item.productId === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Ürün sepette bulunamadı'
      });
    }

    user.activeCart.items[itemIndex].quantity = quantity;
    user.activeCart.items[itemIndex].updatedAt = new Date();

    // Sepet toplamlarını güncelle
    user.activeCart.totalItems = user.activeCart.items.reduce((total, item) => total + item.quantity, 0);
    user.activeCart.totalPrice = user.activeCart.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    user.activeCart.lastUpdated = new Date();

    await user.save();

    res.json({
      success: true,
      message: 'Ürün miktarı güncellendi',
      data: user.activeCart
    });
  } catch (error) {
    console.error('Miktar güncelleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Ürün miktarı güncellenirken hata oluştu'
    });
  }
});

/**
 * Sepeti temizle
 * DELETE /api/cart/clear
 */
router.delete('/clear', authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    // Sepeti temizle
    user.activeCart = {
      items: [],
      totalItems: 0,
      totalPrice: 0,
      currency: 'TRY',
      lastUpdated: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    };

    await user.save();

    res.json({
      success: true,
      message: 'Sepet temizlendi',
      data: user.activeCart
    });
  } catch (error) {
    console.error('Sepet temizleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sepet temizlenirken hata oluştu'
    });
  }
});

/**
 * Sepet özetini getir
 * GET /api/cart/summary
 */
router.get('/summary', authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('activeCart');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    const summary = {
      itemCount: user.activeCart.totalItems,
      totalPrice: user.activeCart.totalPrice,
      currency: user.activeCart.currency,
      lastUpdated: user.activeCart.lastUpdated,
      expiresAt: user.activeCart.expiresAt
    };

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Sepet özeti hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sepet özeti alınırken hata oluştu'
    });
  }
});

module.exports = router;