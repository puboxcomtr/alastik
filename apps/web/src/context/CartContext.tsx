'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import * as cartService from '@/src/services/cartService';

interface CartItem {
    productKey: string;
    productName: string;
    productImage: string | null;
    productSlug: string;
    brandName: string;
    quantity: number;
    unitPrice: number;
    kdvRate: number;
}

interface CartTotals {
    subtotal: number;
    kdv: number;
    total: number;
    itemCount: number;
}

interface CartContextType {
    items: CartItem[];
    totals: CartTotals;
    loading: boolean;
    addToCart: (productKey: string, quantity?: number) => Promise<boolean>;
    updateQuantity: (productKey: string, quantity: number) => Promise<void>;
    removeItem: (productKey: string) => Promise<void>;
    clearCart: () => Promise<void>;
    refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [totals, setTotals] = useState<CartTotals>({ subtotal: 0, kdv: 0, total: 0, itemCount: 0 });
    const [loading, setLoading] = useState(true);

    const refreshCart = useCallback(async () => {
        try {
            const cart = await cartService.getCart();
            if (cart) {
                setItems(cart.items || []);
                setTotals(cart.totals || { subtotal: 0, kdv: 0, total: 0, itemCount: 0 });
            }
        } catch (error) {
            console.error('refreshCart error:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshCart();
    }, [refreshCart]);

    const addToCart = async (productKey: string, quantity: number = 1): Promise<boolean> => {
        try {
            const result = await cartService.addToCart(productKey, quantity);
            if (result.success) {
                setItems(result.data.items || []);
                setTotals(result.data.totals || totals);
                toast.success('Ürün sepetinize başarıyla eklendi.');
                return true;
            } else {
                toast.error(result.message || 'Ürün sepetinize eklenirken hata oluştu.');
                return false;
            }
        } catch (error) {
            toast.error('Bir hata olustu');
            return false;
        }
    };

    const updateQuantity = async (productKey: string, quantity: number) => {
        try {
            const result = await cartService.updateCartItem(productKey, quantity);
            if (result.success) {
                setItems(result.data.items || []);
                setTotals(result.data.totals || totals);
            } else {
                toast.error(result.message || 'Güncelleme işlemi başarısız oldu');
            }
        } catch (error) {
            toast.error('Bir hata oluştu');
        }
    };

    const removeItem = async (productKey: string) => {
        try {
            const result = await cartService.removeFromCart(productKey);
            if (result.success) {
                setItems(result.data.items || []);
                setTotals(result.data.totals || totals);
                toast.success('Ürün Sepetten Silindi');
            } else {
                toast.error(result.message || 'Silme işlemi başarısız oldu');
            }
        } catch (error) {
            toast.error('Bir hata oluştu');
        }
    };

    const clearCart = async () => {
        try {
            const result = await cartService.clearCart();
            if (result.success) {
                setItems([]);
                setTotals({ subtotal: 0, kdv: 0, total: 0, itemCount: 0 });
                toast.success('Sepetiniz temizlendi');
            }
        } catch (error) {
            toast.error('Bir hata oluştu');
        }
    };

    return (
        <CartContext.Provider value={{
            items,
            totals,
            loading,
            addToCart,
            updateQuantity,
            removeItem,
            clearCart,
            refreshCart
        }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within CartProvider');
    }
    return context;
}