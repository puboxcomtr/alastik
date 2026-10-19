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

  async getOrCreateCart(userId, sessionId, metadata = {}) {
    try {
      let cart = await Cart.findActiveCart(userId, sessionId);
      
      if (!cart) {
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

  async addToCart(userId, sessionId, productId, quantity = 1, options = {}) {
    try {
      const product = await Product.findById(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      if (!product.isActive) {
        throw new Error('Product is not active');
      }

      const stockCheck = await this.checkProductStock(productId, quantity);
      if (!stockCheck.available) {
        throw new Error(`Insufficient stock. Available: ${stockCheck.availableQuantity}`);
      }

      let diaStock = null;
      if (product.sku) {
        diaStock = await DiaStock.findOne({ 
          stokkartkodu: product.sku,
          durum: 'A',
          b2c_gonder: 'E'
        });
      }

      const cart = await this.getOrCreateCart(userId, sessionId, options.metadata);

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

      let unitPrice = product.price;
      let discountAmount = 0;
      let discountPercentage = 0;

      if (diaStock && diaStock.fiyat1) {
        unitPrice = diaStock.fiyat1;
      }

      if (product.originalPrice && product.originalPrice > unitPrice) {
        discountAmount = (product.originalPrice - unitPrice) * quantity;
        discountPercentage = ((product.originalPrice - unitPrice) / product.originalPrice) * 100;
      }

      await cart.addItem({
        productId: productId,
        diaStockId: diaStock?._id,
        unitPrice: unitPrice,
        productSnapshot: productSnapshot,
        discountAmount: discountAmount,
        discountPercentage: discountPercentage
      }, quantity);

      if (options.reserveStock) {
        await this.reserveStock(productId, quantity);
      }

      if (sessionId) {
        const session = await Session.findBySessionId(sessionId);
        if (session) {
          session.data.cartId = cart._id;
          await session.updateActivity('cart_add', { productId, quantity });
        }
      }

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

  async removeFromCart(userId, sessionId, productId) {
    try {
      const cart = await Cart.findActiveCart(userId, sessionId);
      if (!cart) {
        throw new Error('Cart not found');
      }

      await cart.removeItem(productId);

      const item = cart.items.find(item => item.productId.toString() === productId.toString());
      if (item && item.isReserved) {
        await this.releaseStock(productId, item.quantity);
      }

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

  async updateCartItemQuantity(userId, sessionId, productId, quantity) {
    try {
      if (quantity <= 0) {
        return await this.removeFromCart(userId, sessionId, productId);
      }

      const cart = await Cart.findActiveCart(userId, sessionId);
      if (!cart) {
        throw new Error('Cart not found');
      }

      const stockCheck = await this.checkProductStock(productId, quantity);
      if (!stockCheck.available) {
        throw new Error(`Insufficient stock. Available: ${stockCheck.availableQuantity}`);
      }

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

  async applyCoupon(userId, sessionId, couponCode) {
    try {
      const cart = await Cart.findActiveCart(userId, sessionId);
      if (!cart) {
        throw new Error('Cart not found');
      }

      const couponData = await this.validateCoupon(couponCode, cart);
      
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

  async removeCoupon(userId, sessionId, couponCode) {
    try {
      const cart = await Cart.findActiveCart(userId, sessionId);
      if (!cart) {
        throw new Error('Cart not found');
      }

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

  async clearCart(userId, sessionId) {
    try {
      const cart = await Cart.findActiveCart(userId, sessionId);
      if (!cart) {
        throw new Error('Cart not found');
      }

      for (const item of cart.items) {
        if (item.isReserved) {
          await this.releaseStock(item.productId, item.quantity);
        }
      }

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

  async mergeCarts(userId, sessionId) {
    try {
      const userCart = await Cart.findActiveCart(userId, null);
      
      const sessionCart = await Cart.findActiveCart(null, sessionId);

      if (!sessionCart) {
        return userCart;
      }

      if (!userCart) {
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

  async completeCart(userId, sessionId, orderData) {
    try {
      const cart = await Cart.findActiveCart(userId, sessionId);
      if (!cart) {
        throw new Error('Cart not found');
      }

      for (const item of cart.items) {
        const stockCheck = await this.checkProductStock(item.productId, item.quantity);
        if (!stockCheck.available) {
          throw new Error(`Insufficient stock for product ${item.productSnapshot.name}`);
        }
      }

      await cart.complete();

      for (const item of cart.items) {
        await this.updateProductStock(item.productId, -item.quantity);
      }

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

  async abandonCart(userId, sessionId) {
    try {
      const cart = await Cart.findActiveCart(userId, sessionId);
      if (!cart) {
        throw new Error('Cart not found');
      }

      await cart.abandon();

      for (const item of cart.items) {
        if (item.isReserved) {
          await this.releaseStock(item.productId, item.quantity);
        }
      }

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

  async checkProductStock(productId, quantity) {
    try {
      const product = await Product.findById(productId);
      if (!product) {
        return { available: false, availableQuantity: 0 };
      }

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

  async validateCoupon(couponCode, cart) {
    try {
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

      if (cart.pricing.subtotal < coupon.minAmount) {
        throw new Error(`Minimum order amount is ${coupon.minAmount} TL`);
      }

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
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      };
    } catch (error) {
      this.logger.error('Error validating coupon', { 
        error: error.message,
        couponCode
      });
      throw error;
    }
  }

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

  async cleanupExpiredCarts() {
    try {
      const expiredCarts = await Cart.findExpiredCarts();
      
      for (const cart of expiredCarts) {
        for (const item of cart.items) {
          if (item.isReserved) {
            await this.releaseStock(item.productId, item.quantity);
          }
        }
        
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