'use client';

import React, { useState, useEffect } from 'react';
import authService from '@lib/auth';
import toast from '@lib/toast';
import styles from '@components/cart/cart.module.css';

interface CartItem {
  id: string;
  name: string;
  brand: string;
  size: string;
  price: number;
  quantity: number;
  image: string;
  stockStatus: 'in_stock' | 'out_of_stock';
  maxStock: number;
}

interface ShoppingCartProps {
  isOpen: boolean;
  onClose: () => void;
}

const ShoppingCart: React.FC<ShoppingCartProps> = ({ isOpen, onClose }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Load cart from localStorage on mount and listen for cart updates
  useEffect(() => {
    const loadCart = async () => {
      try {
        // Öncelik: auth ise backend sepeti
        if (authService.getToken && authService.getToken()) {
          const res = await authService.authenticatedRequest('/cart');
          const data = await res.json();
          if (data?.success && data.data?.items) {
            const items = data.data.items.map((it: any) => ({
              id: it.productId,
              name: it.name,
              brand: it.brand,
              size: it.specifications?.size,
              price: it.price,
              quantity: it.quantity,
              image: it.images?.[0]?.url || '/assets/img/placeholder-tire.jpg',
              stockStatus: 'in_stock',
              maxStock: 99
            }));
            setCartItems(items);
            return;
          }
        }
        // Fallback: local sepet
        const savedCart = localStorage.getItem('shopping_cart');
        setCartItems(savedCart ? JSON.parse(savedCart) : []);
      } catch (error) {
        try {
          const savedCart = localStorage.getItem('shopping_cart');
          setCartItems(savedCart ? JSON.parse(savedCart) : []);
        } catch {}
      }
    };

    // Initial load
    loadCart();

    // Listen for cart updates from other components
    const handleCartUpdate = () => { loadCart(); };
    window.addEventListener('cartUpdated', handleCartUpdate as EventListener);
    
    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate as EventListener);
    };
  }, []);

  const updateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeItem(id);
      return;
    }

    const item = cartItems.find(item => item.id === id);
    if (!item) return;

    if (newQuantity > item.maxStock) {
      toast.cart.stockLimited(item.name, item.maxStock);
      return;
    }

    // Use cartUtils for consistency
    cartUtils.updateCartItemQuantity(id, newQuantity);
    toast.cart.updatedQuantity(item.name, newQuantity);
  };

  const removeItem = (id: string) => {
    const item = cartItems.find(item => item.id === id);
    
    // Use cartUtils for consistency
    cartUtils.removeFromCart(id);
    
    if (item) {
      toast.cart.removedFromCart(item.name);
    }
  };

  const clearCart = () => {
    if (cartItems.length > 0) {
      // Use cartUtils for consistency
      cartUtils.clearCart();
      toast.cart.cartCleared();
    }
  };

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getTotalItems = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    
    // Redirect to checkout page
    window.location.href = '/checkout';
  };

  if (!isOpen) return null;

  return (
    <div className={styles.cartOverlay} onClick={onClose}>
      <div className={styles.cartSidebar} onClick={e => e.stopPropagation()}>
        <div className={styles.cartHeader}>
          <h3 className="text-uppercase fw-bold mb-0">
            SEPETİM ({getTotalItems()})
          </h3>
          <button 
            className={styles.closeButton}
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <div className={styles.cartBody}>
          {cartItems.length === 0 ? (
            <div className={styles.emptyCart}>
              <i className="ci-shopping-cart fs-1 text-muted mb-3"></i>
              <h4 className="text-muted">Sepetiniz Boş</h4>
              <p className="text-muted mb-4">
                Henüz sepetinize ürün eklemediniz.
              </p>
              <button 
                className={styles.continueShoppingBtn}
                onClick={onClose}
              >
                ALIŞVERİŞE DEVAM ET
              </button>
            </div>
          ) : (
            <>
              <div className={styles.cartItems}>
                {cartItems.map(item => (
                  <div key={item.id} className={styles.cartItem}>
                    <div className={styles.itemImage}>
                      <img 
                        src={item.image || '/assets/img/placeholder-tire.jpg'} 
                        alt={item.name}
                        onError={(e) => {
                          e.currentTarget.src = '/assets/img/placeholder-tire.jpg';
                        }}
                      />
                    </div>
                    
                    <div className={styles.itemDetails}>
                      <h6 className={styles.itemName}>{item.name}</h6>
                      <div className={styles.itemMeta}>
                        <span className={styles.itemBrand}>{item.brand}</span>
                        <span className={styles.itemSize}>{item.size}</span>
                      </div>
                      
                      <div className={styles.itemActions}>
                        <div className={styles.quantityControls}>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className={styles.quantityBtn}
                            type="button"
                          >
                            -
                          </button>
                          <span className={styles.quantity}>{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className={styles.quantityBtn}
                            disabled={item.quantity >= item.maxStock}
                            type="button"
                          >
                            +
                          </button>
                        </div>
                        
                        <button
                          onClick={() => removeItem(item.id)}
                          className={styles.removeBtn}
                          type="button"
                          title="Sepetten Çıkar"
                        >
                          <i className="ci-trash"></i>
                        </button>
                      </div>
                    </div>
                    
                    <div className={styles.itemPrice}>
                      <div className={styles.unitPrice}>
                        {item.price.toLocaleString('tr-TR')} ₺
                      </div>
                      <div className={styles.totalPrice}>
                        {(item.price * item.quantity).toLocaleString('tr-TR')} ₺
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.cartFooter}>
                <div className={styles.cartSummary}>
                  <div className={styles.summaryRow}>
                    <span>Ara Toplam:</span>
                    <strong>{getTotalPrice().toLocaleString('tr-TR')} ₺</strong>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>KDV:</span>
                    <span>Dahil</span>
                  </div>
                  <div className={styles.summaryRow + ' ' + styles.totalRow}>
                    <strong>Toplam:</strong>
                    <strong className={styles.totalPrice}>
                      {getTotalPrice().toLocaleString('tr-TR')} ₺
                    </strong>
                  </div>
                </div>

                <div className={styles.cartActions}>
                  <button
                    onClick={clearCart}
                    className={styles.clearCartBtn}
                    type="button"
                  >
                    SEPETİ TEMIZLE
                  </button>
                  
                  <button
                    onClick={handleCheckout}
                    className={styles.checkoutBtn}
                    disabled={loading}
                    type="button"
                  >
                    {loading ? (
                      <>
                        <i className="fas fa-spinner fa-spin me-2"></i>
                        YÜKLENIYOR...
                      </>
                    ) : (
                      'SİPARİŞİ TAMAMLA'
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Export utility functions for cart management
export const cartUtils = {
  addToCart: (product: Omit<CartItem, 'quantity'>) => {
    const savedCart = localStorage.getItem('shopping_cart');
    let cartItems: CartItem[] = [];
    
    if (savedCart) {
      try {
        cartItems = JSON.parse(savedCart);
      } catch (error) {
        console.error('Error loading cart:', error);
      }
    }

    const existingItem = cartItems.find(item => item.id === product.id);
    
    if (existingItem) {
      if (existingItem.quantity >= product.maxStock) {
        // Import toast at the top of the function since it's in cartUtils
        const { showWarning } = require('@lib/toast');
        showWarning(`${product.name} için maksimum ${product.maxStock} adet ekleyebilirsiniz`, {
          icon: '📦',
          autoClose: 4000,
        });
        return cartItems;
      }
      existingItem.quantity = Math.min(existingItem.quantity + 1, product.maxStock);
    } else {
      cartItems.push({ ...product, quantity: 1 });
    }

    localStorage.setItem('shopping_cart', JSON.stringify(cartItems));
    
    // Trigger custom event for real-time updates
    window.dispatchEvent(new CustomEvent('cartUpdated', { 
      detail: { 
        itemCount: cartItems.reduce((total, item) => total + item.quantity, 0),
        cartItems 
      } 
    }));
    
    return cartItems;
  },

  removeFromCart: (productId: string) => {
    const savedCart = localStorage.getItem('shopping_cart');
    let cartItems: CartItem[] = [];
    
    if (savedCart) {
      try {
        cartItems = JSON.parse(savedCart);
      } catch (error) {
        console.error('Error loading cart:', error);
      }
    }

    cartItems = cartItems.filter(item => item.id !== productId);
    localStorage.setItem('shopping_cart', JSON.stringify(cartItems));
    
    // Trigger custom event for real-time updates
    window.dispatchEvent(new CustomEvent('cartUpdated', { 
      detail: { 
        itemCount: cartItems.reduce((total, item) => total + item.quantity, 0),
        cartItems 
      } 
    }));
    
    return cartItems;
  },

  updateCartItemQuantity: (productId: string, quantity: number) => {
    const savedCart = localStorage.getItem('shopping_cart');
    let cartItems: CartItem[] = [];
    
    if (savedCart) {
      try {
        cartItems = JSON.parse(savedCart);
      } catch (error) {
        console.error('Error loading cart:', error);
      }
    }

    const item = cartItems.find(item => item.id === productId);
    if (item) {
      if (quantity <= 0) {
        cartItems = cartItems.filter(item => item.id !== productId);
      } else {
        item.quantity = Math.min(quantity, item.maxStock);
      }
    }

    localStorage.setItem('shopping_cart', JSON.stringify(cartItems));
    
    // Trigger custom event for real-time updates
    window.dispatchEvent(new CustomEvent('cartUpdated', { 
      detail: { 
        itemCount: cartItems.reduce((total, item) => total + item.quantity, 0),
        cartItems 
      } 
    }));
    
    return cartItems;
  },

  clearCart: () => {
    localStorage.removeItem('shopping_cart');
    
    // Trigger custom event for real-time updates
    window.dispatchEvent(new CustomEvent('cartUpdated', { 
      detail: { 
        itemCount: 0,
        cartItems: [] 
      } 
    }));
  },

  getCartItemCount: (): number => {
    const savedCart = localStorage.getItem('shopping_cart');
    if (!savedCart) return 0;
    
    try {
      const cartItems: CartItem[] = JSON.parse(savedCart);
      return cartItems.reduce((total, item) => total + item.quantity, 0);
    } catch (error) {
      return 0;
    }
  },

  getCartTotal: (): number => {
    const savedCart = localStorage.getItem('shopping_cart');
    if (!savedCart) return 0;
    
    try {
      const cartItems: CartItem[] = JSON.parse(savedCart);
      return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    } catch (error) {
      return 0;
    }
  },

  getCartItems: (): CartItem[] => {
    const savedCart = localStorage.getItem('shopping_cart');
    if (!savedCart) return [];
    
    try {
      return JSON.parse(savedCart);
    } catch (error) {
      return [];
    }
  }
};

export default ShoppingCart;