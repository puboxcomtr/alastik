const Cart = require('../models/Cart');
const Product = require('../models/Product');
const DiaStock = require('../models/DiaStock');
const User = require('../models/User');
const Session = require('../models/Session');
const Inventory = require('../models/Inventory');
const winston = require('winston');

class CartService {
  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'cart-service' },
      transports: [
        new winston.transports.File({ filename: 'logs/cart.log' }),
        new winston.transports.Console()
      ]
    });
  }

  /**
   * Aktif sepeti getir veya oluştur
   */
  async getOrCreateCart(userId, sessionId, metadata = {}) {
    try {
      // Önce aktif sepeti bul
      let cart = await Cart.findActiveCart(userId, sessionId);
      
      if (!cart) {
        // Yeni sepet oluştur
        cart = new Cart({
          userId: userId || null,
          sessionId: sessionId || null,
          metadata: {
            source: metadata.source || 'web',
            device: metadata.device || 'desktop',
            browser: metadata.browser,
            ipAddress: metadata.ipAddress,
            userAgent: metadata.userAgent,
            referrer: metadata.referrer,
            utm: metadata.utm || {}
          }
        });
        
        await cart.save();
        
        this.logger.info('New cart created', {
          cartId: cart._id,
          userId,
          sessionId
        });
      }
      
      return cart;
    } catch (error) {
      this.logger.error('Error getting or creating cart', { error: error.message });
      throw error;
    }
  }

  /**
   * Sepete ürün ekle
   */
  async addToCart(userId, sessionId, productId, quantity = 1, options = {}) {
    try {
      // Ürün bilgilerini getir
      const product = await Product.findById(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      // Ürün aktif mi kontrol et
      if (!product.isActive) {
        throw new Error('Product is not active');
      }

      // Stok kontrolü
      const stockCheck = await this.checkProductStock(productId, quantity);
      if (!stockCheck.available) {
        throw new Error(`Insufficient stock. Available: ${stockCheck.availableQuantity}`);
      }

      // DIA Stock bilgilerini getir
      let diaStock = null;
      if (product.sku) {
        diaStock = await DiaStock.findOne({ 
          stokkartkodu: product.sku,
          durum: 'A',
          b2c_gonder: 'E'
        });
      }

      // Sepeti getir veya oluştur
      const cart = await this.getOrCreateCart(userId, sessionId, options.metadata);

      // Ürün snapshot'ı oluştur
      const productSnapshot = {
        name: product.name,
        brand: product.brand,
        category: product.category,
        sku: product.sku,
        image: product.images?.[0]?.url,
        specifications: {
          size: product.specifications?.size,
          season: product.specifications?.season,
          vehicleType: product.specifications?.vehicleType
        }
      };

      // Fiyat hesaplama
      let unitPrice = product.price;
      let discountAmount = 0;
      let discountPercentage = 0;

      // DIA Stock'tan fiyat al
      if (diaStock && diaStock.fiyat1) {
        unitPrice = diaStock.fiyat1;
      }

      // İndirim hesaplama
      if (product.originalPrice && product.originalPrice > unitPrice) {
        discountAmount = (product.originalPrice - unitPrice) * quantity;
        discountPercentage = ((product.originalPrice - unitPrice) / product.originalPrice) * 100;
      }

      // Sepete ürün ekle
      await cart.addItem({
        productId: productId,
        diaStockId: diaStock?._id,
        unitPrice: unitPrice,
        productSnapshot: productSnapshot,
        discountAmount: discountAmount,
        discountPercentage: discountPercentage
      }, quantity);

      // Stok rezervasyonu
      if (options.reserveStock) {
        await this.reserveStock(productId, quantity);
      }

      // Session'ı güncelle
      if (sessionId) {
        const session = await Session.findBySessionId(sessionId);
        if (session) {
          session.data.cartId = cart._id;
          await session.updateActivity('cart_add', { productId, quantity });
        }
      }

      // Kullanıcı istatistiklerini güncelle
      if (userId) {
        const user = await User.findById(userId);
        if (user) {
          await user.updateCartHistory({ 
            status: 'active', 
            total: cart.pricing.total 
          });
        }
      }

      this.logger.info('Product added to cart', {
        cartId: cart._id,
        productId,
        quantity,
        unitPrice,
        userId,
        sessionId
      });

      return await this.getCartWithDetails(cart._id);
    } catch (error) {
      this.logger.error('Error adding product to cart', { 
        error: error.message,
        productId,
        quantity,
        userId,
        sessionId
      });
      throw error;
    }
  }

  /**
   * Sepetten ürün çıkar
   */
  async removeFromCart(userId, sessionId, productId) {
    try {
      // Sepeti bul
      const cart = await Cart.findActiveCart(userId, sessionId);
      if (!cart) {
        throw new Error('Cart not found');
      }

      // Ürünü sepetten çıkar
      await cart.removeItem(productId);

      // Stok rezervasyonunu serbest bırak
      const item = cart.items.find(item => item.productId.toString() === productId.toString());
      if (item && item.isReserved) {
        await this.releaseStock(productId, item.quantity);
      }

      // Session'ı güncelle
      if (sessionId) {
        const session = await Session.findBySessionId(sessionId);
        if (session) {
          await session.updateActivity('cart_remove', { productId });
        }
      }

      this.logger.info('Product removed from cart', {
        cartId: cart._id,
        productId,
        userId,
        sessionId
      });

      return await this.getCartWithDetails(cart._id);
    } catch (error) {
      this.logger.error('Error removing product from cart', { 
        error: error.message,
        productId,
        userId,
        sessionId
      });
      throw error;
    }
  }

  /**
   * Sepetteki ürün miktarını güncelle
   */
  async updateCartItemQuantity(userId, sessionId, productId, quantity) {
    try {
      if (quantity <= 0) {
        return await this.removeFromCart(userId, sessionId, productId);
      }

      // Sepeti bul
      const cart = await Cart.findActiveCart(userId, sessionId);
      if (!cart) {
        throw new Error('Cart not found');
      }

      // Stok kontrolü
      const stockCheck = await this.checkProductStock(productId, quantity);
      if (!stockCheck.available) {
        throw new Error(`Insufficient stock. Available: ${stockCheck.availableQuantity}`);
      }

      // Miktar güncelle
      await cart.updateItemQuantity(productId, quantity);

      this.logger.info('Cart item quantity updated', {
        cartId: cart._id,
        productId,
        quantity,
        userId,
        sessionId
      });

      return await this.getCartWithDetails(cart._id);
    } catch (error) {
      this.logger.error('Error updating cart item quantity', { 
        error: error.message,
        productId,
        quantity,
        userId,
        sessionId
      });
      throw error;
    }
  }

  /**
   * Sepete kupon uygula
   */
  async applyCoupon(userId, sessionId, couponCode) {
    try {
      // Sepeti bul
      const cart = await Cart.findActiveCart(userId, sessionId);
      if (!cart) {
        throw new Error('Cart not found');
      }

      // Kupon doğrulama (basit implementasyon)
      const couponData = await this.validateCoupon(couponCode, cart);
      
      // Kuponu uygula
      await cart.applyCoupon(couponData);

      this.logger.info('Coupon applied to cart', {
        cartId: cart._id,
        couponCode,
        discountAmount: couponData.discountAmount,
        userId,
        sessionId
      });

      return await this.getCartWithDetails(cart._id);
    } catch (error) {
      this.logger.error('Error applying coupon', { 
        error: error.message,
        couponCode,
        userId,
        sessionId
      });
      throw error;
    }
  }

  /**
   * Sepetten kupon kaldır
   */
  async removeCoupon(userId, sessionId, couponCode) {
    try {
      // Sepeti bul
      const cart = await Cart.findActiveCart(userId, sessionId);
      if (!cart) {
        throw new Error('Cart not found');
      }

      // Kuponu kaldır
      await cart.removeCoupon(couponCode);

      this.logger.info('Coupon removed from cart', {
        cartId: cart._id,
        couponCode,
        userId,
        sessionId
      });

      return await this.getCartWithDetails(cart._id);
    } catch (error) {
      this.logger.error('Error removing coupon', { 
        error: error.message,
        couponCode,
        userId,
        sessionId
      });
      throw error;
    }
  }

  /**
   * Sepeti temizle
   */
  async clearCart(userId, sessionId) {
    try {
      // Sepeti bul
      const cart = await Cart.findActiveCart(userId, sessionId);
      if (!cart) {
        throw new Error('Cart not found');
      }

      // Stok rezervasyonlarını serbest bırak
      for (const item of cart.items) {
        if (item.isReserved) {
          await this.releaseStock(item.productId, item.quantity);
        }
      }

      // Sepeti temizle
      cart.items = [];
      cart.coupons = [];
      cart.pricing = {
        subtotal: 0,
        discountTotal: 0,
        taxTotal: 0,
        shippingCost: 0,
        total: 0,
        currency: 'TRY'
      };

      await cart.save();

      this.logger.info('Cart cleared', {
        cartId: cart._id,
        userId,
        sessionId
      });

      return await this.getCartWithDetails(cart._id);
    } catch (error) {
      this.logger.error('Error clearing cart', { 
        error: error.message,
        userId,
        sessionId
      });
      throw error;
    }
  }

  /**
   * Sepetleri birleştir (guest -> user)
   */
  async mergeCarts(userId, sessionId) {
    try {
      // Kullanıcının mevcut sepetini bul
      const userCart = await Cart.findActiveCart(userId, null);
      
      // Session sepetini bul
      const sessionCart = await Cart.findActiveCart(null, sessionId);

      if (!sessionCart) {
        return userCart;
      }

      if (!userCart) {
        // Kullanıcı sepeti yoksa session sepetini kullanıcıya ata
        sessionCart.userId = userId;
        sessionCart.sessionId = null;
        await sessionCart.save();
        
        this.logger.info('Session cart assigned to user', {
          cartId: sessionCart._id,
          userId,
          sessionId
        });
        
        return await this.getCartWithDetails(sessionCart._id);
      }

      // İki sepeti birleştir
      await userCart.merge(sessionCart);

      this.logger.info('Carts merged', {
        userCartId: userCart._id,
        sessionCartId: sessionCart._id,
        userId,
        sessionId
      });

      return await this.getCartWithDetails(userCart._id);
    } catch (error) {
      this.logger.error('Error merging carts', { 
        error: error.message,
        userId,
        sessionId
      });
      throw error;
    }
  }

  /**
   * Sepeti tamamla
   */
  async completeCart(userId, sessionId, orderData) {
    try {
      // Sepeti bul
      const cart = await Cart.findActiveCart(userId, sessionId);
      if (!cart) {
        throw new Error('Cart not found');
      }

      // Son stok kontrolü
      for (const item of cart.items) {
        const stockCheck = await this.checkProductStock(item.productId, item.quantity);
        if (!stockCheck.available) {
          throw new Error(`Insufficient stock for product ${item.productSnapshot.name}`);
        }
      }

      // Sepeti tamamla
      await cart.complete();

      // Stok güncelle
      for (const item of cart.items) {
        await this.updateProductStock(item.productId, -item.quantity);
      }

      // Kullanıcı istatistiklerini güncelle
      if (userId) {
        const user = await User.findById(userId);
        if (user) {
          await user.updateStatistics({
            total: cart.pricing.total,
            categories: cart.items.map(item => item.productSnapshot.category),
            brands: cart.items.map(item => item.productSnapshot.brand)
          });
        }
      }

      // Session'ı güncelle
      if (sessionId) {
        const session = await Session.findBySessionId(sessionId);
        if (session) {
          await session.markConversion('purchase', cart.pricing.total);
        }
      }

      this.logger.info('Cart completed', {
        cartId: cart._id,
        total: cart.pricing.total,
        itemCount: cart.items.length,
        userId,
        sessionId
      });

      return cart;
    } catch (error) {
      this.logger.error('Error completing cart', { 
        error: error.message,
        userId,
        sessionId
      });
      throw error;
    }
  }

  /**
   * Sepeti terk et
   */
  async abandonCart(userId, sessionId) {
    try {
      // Sepeti bul
      const cart = await Cart.findActiveCart(userId, sessionId);
      if (!cart) {
        throw new Error('Cart not found');
      }

      // Sepeti terk et
      await cart.abandon();

      // Stok rezervasyonlarını serbest bırak
      for (const item of cart.items) {
        if (item.isReserved) {
          await this.releaseStock(item.productId, item.quantity);
        }
      }

      // Kullanıcı istatistiklerini güncelle
      if (userId) {
        const user = await User.findById(userId);
        if (user) {
          await user.updateCartHistory({ 
            status: 'abandoned', 
            total: cart.pricing.total 
          });
        }
      }

      this.logger.info('Cart abandoned', {
        cartId: cart._id,
        userId,
        sessionId
      });

      return cart;
    } catch (error) {
      this.logger.error('Error abandoning cart', { 
        error: error.message,
        userId,
        sessionId
      });
      throw error;
    }
  }

  /**
   * Sepet detaylarını getir
   */
  async getCartWithDetails(cartId) {
    try {
      const cart = await Cart.findById(cartId)
        .populate('items.productId', 'name brand category price images specifications stockStatus')
        .populate('items.diaStockId', 'fiili_stok gercek_stok fiyat1 fiyat2')
        .populate('userId', 'email profile.firstName profile.lastName');

      if (!cart) {
        throw new Error('Cart not found');
      }

      return cart;
    } catch (error) {
      this.logger.error('Error getting cart details', { 
        error: error.message,
        cartId
      });
      throw error;
    }
  }

  /**
   * Kullanıcının sepet geçmişini getir
   */
  async getUserCartHistory(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        status = null,
        startDate = null,
        endDate = null
      } = options;

      const query = { userId };
      
      if (status) {
        query.status = status;
      }
      
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      const carts = await Cart.find(query)
        .populate('items.productId', 'name brand category images')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Cart.countDocuments(query);

      return {
        carts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      this.logger.error('Error getting user cart history', { 
        error: error.message,
        userId
      });
      throw error;
    }
  }

  /**
   * Stok kontrolü
   */
  async checkProductStock(productId, quantity) {
    try {
      const product = await Product.findById(productId);
      if (!product) {
        return { available: false, availableQuantity: 0 };
      }

      // DIA Stock kontrolü
      let availableQuantity = product.stock;
      
      if (product.sku) {
        const diaStock = await DiaStock.findOne({ 
          stokkartkodu: product.sku,
          durum: 'A',
          b2c_gonder: 'E'
        });
        
        if (diaStock) {
          availableQuantity = diaStock.fiili_stok || 0;
        }
      }

      // Inventory kontrolü
      const inventory = await Inventory.findOne({ productId });
      if (inventory) {
        availableQuantity = Math.min(availableQuantity, inventory.availableQuantity);
      }

      return {
        available: availableQuantity >= quantity,
        availableQuantity: availableQuantity,
        requestedQuantity: quantity
      };
    } catch (error) {
      this.logger.error('Error checking product stock', { 
        error: error.message,
        productId,
        quantity
      });
      return { available: false, availableQuantity: 0 };
    }
  }

  /**
   * Stok rezervasyonu
   */
  async reserveStock(productId, quantity) {
    try {
      const inventory = await Inventory.findOne({ productId });
      if (inventory) {
        await inventory.reserveStock(quantity);
      }
      
      this.logger.info('Stock reserved', { productId, quantity });
    } catch (error) {
      this.logger.error('Error reserving stock', { 
        error: error.message,
        productId,
        quantity
      });
    }
  }

  /**
   * Stok rezervasyonunu serbest bırak
   */
  async releaseStock(productId, quantity) {
    try {
      const inventory = await Inventory.findOne({ productId });
      if (inventory) {
        await inventory.releaseReservedStock(quantity);
      }
      
      this.logger.info('Stock released', { productId, quantity });
    } catch (error) {
      this.logger.error('Error releasing stock', { 
        error: error.message,
        productId,
        quantity
      });
    }
  }

  /**
   * Stok güncelle
   */
  async updateProductStock(productId, quantityChange) {
    try {
      const product = await Product.findById(productId);
      if (product) {
        await product.updateStock(quantityChange);
      }

      const inventory = await Inventory.findOne({ productId });
      if (inventory) {
        if (quantityChange > 0) {
          await inventory.addStock(quantityChange, 'cart_return');
        } else {
          await inventory.removeStock(Math.abs(quantityChange), 'cart_purchase');
        }
      }
      
      this.logger.info('Product stock updated', { productId, quantityChange });
    } catch (error) {
      this.logger.error('Error updating product stock', { 
        error: error.message,
        productId,
        quantityChange
      });
    }
  }

  /**
   * Kupon doğrulama
   */
  async validateCoupon(couponCode, cart) {
    try {
      // Basit kupon sistemi - gerçek implementasyonda veritabanından kontrol edilir
      const coupons = {
        'WELCOME10': {
          code: 'WELCOME10',
          type: 'percentage',
          value: 10,
          minAmount: 100,
          maxDiscount: 50
        },
        'FREESHIP': {
          code: 'FREESHIP',
          type: 'free_shipping',
          value: 0,
          minAmount: 200
        },
        'SAVE20': {
          code: 'SAVE20',
          type: 'fixed_amount',
          value: 20,
          minAmount: 150
        }
      };

      const coupon = coupons[couponCode.toUpperCase()];
      if (!coupon) {
        throw new Error('Invalid coupon code');
      }

      // Minimum tutar kontrolü
      if (cart.pricing.subtotal < coupon.minAmount) {
        throw new Error(`Minimum order amount is ${coupon.minAmount} TL`);
      }

      // İndirim miktarını hesapla
      let discountAmount = 0;
      
      if (coupon.type === 'percentage') {
        discountAmount = (cart.pricing.subtotal * coupon.value) / 100;
        if (coupon.maxDiscount) {
          discountAmount = Math.min(discountAmount, coupon.maxDiscount);
        }
      } else if (coupon.type === 'fixed_amount') {
        discountAmount = coupon.value;
      }

      return {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        discountAmount: discountAmount,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 gün
      };
    } catch (error) {
      this.logger.error('Error validating coupon', { 
        error: error.message,
        couponCode
      });
      throw error;
    }
  }

  /**
   * Terk edilmiş sepetleri bul
   */
  async findAbandonedCarts(daysSince = 1) {
    try {
      const carts = await Cart.findAbandonedCarts(daysSince);
      
      this.logger.info('Found abandoned carts', { 
        count: carts.length,
        daysSince
      });
      
      return carts;
    } catch (error) {
      this.logger.error('Error finding abandoned carts', { 
        error: error.message,
        daysSince
      });
      throw error;
    }
  }

  /**
   * Süresi dolmuş sepetleri bul ve temizle
   */
  async cleanupExpiredCarts() {
    try {
      const expiredCarts = await Cart.findExpiredCarts();
      
      for (const cart of expiredCarts) {
        // Stok rezervasyonlarını serbest bırak
        for (const item of cart.items) {
          if (item.isReserved) {
            await this.releaseStock(item.productId, item.quantity);
          }
        }
        
        // Sepeti expire et
        await cart.expire();
      }
      
      this.logger.info('Expired carts cleaned up', { 
        count: expiredCarts.length
      });
      
      return expiredCarts.length;
    } catch (error) {
      this.logger.error('Error cleaning up expired carts', { 
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Sepet analitiği
   */
  async getCartAnalytics(startDate, endDate) {
    try {
      const analytics = await Cart.getCartAnalytics(startDate, endDate);
      
      this.logger.info('Cart analytics generated', { 
        startDate,
        endDate,
        results: analytics.length
      });
      
      return analytics;
    } catch (error) {
      this.logger.error('Error generating cart analytics', { 
        error: error.message,
        startDate,
        endDate
      });
      throw error;
    }
  }
}

module.exports = CartService; 