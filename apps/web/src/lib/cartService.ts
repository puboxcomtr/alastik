'use client';

import authService from './auth';
import { getBaseUrl } from '@/src/config/api';

interface CartItem {
  productId: string;
  name: string;
  brand: string;
  sku: string;
  price: number;
  originalPrice?: number;
  quantity: number;
  specifications: {
    size: string;
    width: number;
    aspectRatio: number;
    rimDiameter: number;
    season: string;
    loadIndex: string;
    speedIndex: string;
  };
  images: Array<{
    url: string;
    alt: string;
    isPrimary: boolean;
  }>;
  addedAt: string;
  updatedAt: string;
}

interface Cart {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  currency: string;
  lastUpdated: string;
  expiresAt: string;
}

interface CartResponse {
  success: boolean;
  message?: string;
  data?: Cart;
  error?: string;
}

class CartService {
  private baseUrl: string;
  private localCart: Cart | null = null;
  private legacyKey: string = 'shopping_cart';

  constructor() {
    this.baseUrl = getBaseUrl();

    if (typeof window !== 'undefined') {
      const localCartData = localStorage.getItem('local_cart');
      if (localCartData) {
        try {
          this.localCart = JSON.parse(localCartData);
        } catch (error) {
          console.error('Local cart parse error:', error);
          this.clearLocalCart();
        }
      }
    }
  }

  async getCart(): Promise<CartResponse> {
    try {
      if (authService.isAuthenticated()) {
        const response = await authService.authenticatedRequest('/cart');
        const data = await response.json();

        if (data.success) {
          const mergedCount = await this.syncLocalCartToBackend();
          if (mergedCount > 0) {
            const response2 = await authService.authenticatedRequest('/cart');
            const data2 = await response2.json();
            if (data2.success) return data2;
          }
          return data;
        }

        return {
          success: false,
          message: data.message || 'Sepet getirilemedi',
          error: data.error
        };
      } else {
        return {
          success: true,
          data: this.getLocalCart()
        };
      }
    } catch (error) {
      console.error('Get cart error:', error);
      return {
        success: false,
        message: 'Sepet bilgileri alınırken hata oluştu',
        error: 'network_error'
      };
    }
  }

  async addToCart(item: Omit<CartItem, 'addedAt' | 'updatedAt'>): Promise<CartResponse> {
    try {
      if (authService.isAuthenticated()) {
        const response = await authService.authenticatedRequest('/cart/add', {
          method: 'POST',
          body: JSON.stringify(item),
        });

        const data = await response.json();

        if (data.success) {
          this.notifyCartUpdate();
          return data;
        }

        return {
          success: false,
          message: data.message || 'Ürün sepete eklenemedi',
          error: data.error
        };
      } else {
        const cart = this.getLocalCart();
        const existingItemIndex = cart.items.findIndex(
          cartItem => cartItem.productId === item.productId
        );

        if (existingItemIndex > -1) {
          cart.items[existingItemIndex].quantity += item.quantity;
          cart.items[existingItemIndex].updatedAt = new Date().toISOString();
        } else {
          cart.items.push({
            ...item,
            addedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }

        this.updateCartTotals(cart);
        this.saveLocalCart(cart);
        this.notifyCartUpdate();

        return {
          success: true,
          message: 'Ürün sepete eklendi',
          data: cart
        };
      }
    } catch (error) {
      console.error('Add to cart error:', error);
      return {
        success: false,
        message: 'Ürün sepete eklenirken hata oluştu',
        error: 'network_error'
      };
    }
  }

  async removeFromCart(productId: string): Promise<CartResponse> {
    try {
      if (authService.isAuthenticated()) {
        const response = await authService.authenticatedRequest(`/cart/remove/${productId}`, {
          method: 'DELETE',
        });

        const data = await response.json();

        if (data.success) {
          this.notifyCartUpdate();
          return data;
        }

        return {
          success: false,
          message: data.message || 'Ürün sepetten çıkarılamadı',
          error: data.error
        };
      } else {
        const cart = this.getLocalCart();
        cart.items = cart.items.filter(item => item.productId !== productId);

        this.updateCartTotals(cart);
        this.saveLocalCart(cart);
        this.notifyCartUpdate();

        return {
          success: true,
          message: 'Ürün sepetten çıkarıldı',
          data: cart
        };
      }
    } catch (error) {
      console.error('Remove from cart error:', error);
      return {
        success: false,
        message: 'Ürün sepetten çıkarılırken hata oluştu',
        error: 'network_error'
      };
    }
  }

  async updateQuantity(productId: string, quantity: number): Promise<CartResponse> {
    try {
      if (quantity < 1) {
        return this.removeFromCart(productId);
      }

      if (authService.isAuthenticated()) {
        const response = await authService.authenticatedRequest(`/cart/update/${productId}`, {
          method: 'PUT',
          body: JSON.stringify({ quantity }),
        });

        const data = await response.json();

        if (data.success) {
          this.notifyCartUpdate();
          return data;
        }

        return {
          success: false,
          message: data.message || 'Ürün miktarı güncellenemedi',
          error: data.error
        };
      } else {
        const cart = this.getLocalCart();
        const itemIndex = cart.items.findIndex(item => item.productId === productId);

        if (itemIndex === -1) {
          return {
            success: false,
            message: 'Ürün sepette bulunamadı',
            error: 'item_not_found'
          };
        }

        cart.items[itemIndex].quantity = quantity;
        cart.items[itemIndex].updatedAt = new Date().toISOString();

        this.updateCartTotals(cart);
        this.saveLocalCart(cart);
        this.notifyCartUpdate();

        return {
          success: true,
          message: 'Ürün miktarı güncellendi',
          data: cart
        };
      }
    } catch (error) {
      console.error('Update quantity error:', error);
      return {
        success: false,
        message: 'Ürün miktarı güncellenirken hata oluştu',
        error: 'network_error'
      };
    }
  }

  async clearCart(): Promise<CartResponse> {
    try {
      if (authService.isAuthenticated()) {
        const response = await authService.authenticatedRequest('/cart/clear', {
          method: 'DELETE',
        });

        const data = await response.json();

        if (data.success) {
          this.notifyCartUpdate();
          return data;
        }

        return {
          success: false,
          message: data.message || 'Sepet temizlenemedi',
          error: data.error
        };
      } else {
        const cart = this.createEmptyCart();
        this.saveLocalCart(cart);
        this.notifyCartUpdate();

        return {
          success: true,
          message: 'Sepet temizlendi',
          data: cart
        };
      }
    } catch (error) {
      console.error('Clear cart error:', error);
      return {
        success: false,
        message: 'Sepet temizlenirken hata oluştu',
        error: 'network_error'
      };
    }
  }

  async getCartSummary(): Promise<{ itemCount: number; totalPrice: number; currency: string }> {
    try {
      if (authService.isAuthenticated()) {
        await this.syncLocalCartToBackend();
        const response = await authService.authenticatedRequest('/cart/summary');
        const data = await response.json();

        if (data.success) {
          return {
            itemCount: data.data.itemCount,
            totalPrice: data.data.totalPrice,
            currency: data.data.currency
          };
        }
      }

      if (typeof window !== 'undefined') {
        const modern = this.getLocalCart();
        if (modern.totalItems > 0) {
          return { itemCount: modern.totalItems, totalPrice: modern.totalPrice, currency: modern.currency };
        }
        const legacyJson = localStorage.getItem(this.legacyKey);
        if (legacyJson) {
          try {
            const legacyItems: Array<any> = JSON.parse(legacyJson);
            const itemCount = legacyItems.reduce((sum, it) => sum + (it.quantity || 1), 0);
            const totalPrice = legacyItems.reduce((sum, it) => sum + (it.price * (it.quantity || 1)), 0);
            return { itemCount, totalPrice, currency: 'TRY' };
          } catch { }
        }
      }
      return { itemCount: 0, totalPrice: 0, currency: 'TRY' };
    } catch (error) {
      console.error('Get cart summary error:', error);
      try {
        if (typeof window !== 'undefined') {
          const modern = this.getLocalCart();
          if (modern.totalItems > 0) return { itemCount: modern.totalItems, totalPrice: modern.totalPrice, currency: modern.currency };
          const legacyJson = localStorage.getItem(this.legacyKey);
          if (legacyJson) {
            const legacyItems: Array<any> = JSON.parse(legacyJson);
            const itemCount = legacyItems.reduce((sum, it) => sum + (it.quantity || 1), 0);
            const totalPrice = legacyItems.reduce((sum, it) => sum + (it.price * (it.quantity || 1)), 0);
            return { itemCount, totalPrice, currency: 'TRY' };
          }
        }
      } catch { }
      return { itemCount: 0, totalPrice: 0, currency: 'TRY' };
    }
  }

  async syncLocalCartToBackend(): Promise<number> {
    try {
      if (!authService.isAuthenticated()) {
        return 0;
      }

      let merged = 0;

      if (typeof window !== 'undefined') {
        const legacyJson = localStorage.getItem(this.legacyKey);
        if (legacyJson) {
          try {
            const legacyItems: Array<any> = JSON.parse(legacyJson);
            for (const lItem of legacyItems) {
              await authService.authenticatedRequest('/cart/add', {
                method: 'POST',
                body: JSON.stringify({
                  productId: lItem.id,
                  name: lItem.name,
                  brand: lItem.brand,
                  sku: lItem.id,
                  price: lItem.price,
                  originalPrice: lItem.price,
                  quantity: lItem.quantity,
                  specifications: {
                    size: lItem.size,
                    width: null,
                    aspectRatio: null,
                    rimDiameter: null,
                    season: null,
                    loadIndex: null,
                    speedIndex: null
                  },
                  images: lItem.image ? [{ url: lItem.image, alt: lItem.name, isPrimary: true }] : []
                }),
              });
              merged += 1;
            }
            localStorage.removeItem(this.legacyKey);
          } catch (e) {
          }
        }
      }

      if (this.localCart && this.localCart.items.length > 0) {
        for (const item of this.localCart.items) {
          await authService.authenticatedRequest('/cart/add', {
            method: 'POST',
            body: JSON.stringify({
              productId: item.productId,
              name: item.name,
              brand: item.brand,
              sku: item.sku,
              price: item.price,
              originalPrice: item.originalPrice,
              quantity: item.quantity,
              specifications: item.specifications,
              images: item.images
            }),
          });
          merged += 1;
        }
      }

      this.clearLocalCart();
      return merged;
    } catch (error) {
      console.error('Sync local cart error:', error);
      return 0;
    }
  }

  private getLocalCart(): Cart {
    if (!this.localCart) {
      this.localCart = this.createEmptyCart();
    }
    return this.localCart;
  }

  private saveLocalCart(cart: Cart): void {
    this.localCart = cart;
    if (typeof window !== 'undefined') {
      localStorage.setItem('local_cart', JSON.stringify(cart));
    }
  }

  private clearLocalCart(): void {
    this.localCart = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('local_cart');
      localStorage.removeItem(this.legacyKey);
    }
  }

  private createEmptyCart(): Cart {
    return {
      items: [],
      totalItems: 0,
      totalPrice: 0,
      currency: 'TRY',
      lastUpdated: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };
  }

  private updateCartTotals(cart: Cart): void {
    cart.totalItems = cart.items.reduce((total, item) => total + item.quantity, 0);
    cart.totalPrice = cart.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    cart.lastUpdated = new Date().toISOString();
  }

  private async safeBackendSummary(): Promise<{ itemCount: number; totalPrice: number } | null> {
    try {
      const res = await authService.authenticatedRequest('/cart/summary');
      const data = await res.json();
      if (data?.success) {
        return { itemCount: data.data.itemCount, totalPrice: data.data.totalPrice };
      }
    } catch { }
    return null;
  }

  private notifyCartUpdate(): void {
    if (typeof window !== 'undefined') {
      const dispatchBare = () => window.dispatchEvent(new CustomEvent('cartUpdated'));
      if (authService.isAuthenticated()) {
        this.safeBackendSummary()
          .then((sum) => {
            if (sum) {
              window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { itemCount: sum.itemCount, totalPrice: sum.totalPrice } }));
            } else {
              dispatchBare();
            }
          })
          .catch(dispatchBare);
      } else {
        try {
          const modern = this.getLocalCart();
          if (modern.totalItems > 0) {
            window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { itemCount: modern.totalItems, totalPrice: modern.totalPrice } }));
            return;
          }
          const legacyJson = localStorage.getItem(this.legacyKey);
          if (legacyJson) {
            const legacyItems: Array<any> = JSON.parse(legacyJson);
            const itemCount = legacyItems.reduce((sum, it) => sum + (it.quantity || 1), 0);
            const totalPrice = legacyItems.reduce((sum, it) => sum + (it.price * (it.quantity || 1)), 0);
            window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { itemCount, totalPrice } }));
            return;
          }
          dispatchBare();
        } catch {
          dispatchBare();
        }
      }
    }
  }
}

const cartService = new CartService();
export default cartService;

export type { CartItem, Cart, CartResponse };