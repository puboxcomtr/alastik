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
    montagePointId?: string;
    montagePointLabel?: string;
    // Sepet kuralları: kalem türü, lastik jant çapı, montaj hizmetinin çap aralığı
    itemType?: 'tire' | 'montage' | 'service' | 'product';
    rimSize?: number | null;
    rimRange?: { min: number; max: number } | null;
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
    addToCart: (productKey: string, quantity?: number, successMessage?: string, montagePointId?: string) => Promise<boolean>;
    updateQuantity: (productKey: string, quantity: number) => Promise<void>;
    removeItem: (productKey: string, successMessage?: string) => Promise<void>;
    clearCart: (silent?: boolean) => Promise<void>;
    refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Sunucunun sepet kurallarıyla yaptığı otomatik düzeltmeleri (montaj adedi, düşen hizmetler) bildirir
const notifyRuleNotes = (notes?: string[]) => {
    (notes || []).forEach(note => toast.info(note));
};

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

    const addToCart = async (productKey: string, quantity: number = 1, successMessage: string = 'Ürün sepetinize başarıyla eklendi.', montagePointId?: string): Promise<boolean> => {
        try {
            const result = await cartService.addToCart(productKey, quantity, montagePointId);
            if (result.success) {
                setItems(result.data.items || []);
                setTotals(result.data.totals || totals);
                toast.success(successMessage);
                notifyRuleNotes(result.notes);
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
                notifyRuleNotes(result.notes);
            } else {
                toast.error(result.message || 'Güncelleme işlemi başarısız oldu');
            }
        } catch (error) {
            toast.error('Bir hata oluştu');
        }
    };

    const removeItem = async (productKey: string, successMessage: string = 'Ürün Sepetten Silindi') => {
        try {
            const result = await cartService.removeFromCart(productKey);
            if (result.success) {
                notifyRuleNotes(result.notes);
                setItems(result.data.items || []);
                setTotals(result.data.totals || totals);
                toast.success(successMessage);
            } else {
                toast.error(result.message || 'Silme işlemi başarısız oldu');
            }
        } catch (error) {
            toast.error('Bir hata oluştu');
        }
    };

    const clearCart = async (silent: boolean = false) => {
        try {
            const result = await cartService.clearCart();
            if (result.success) {
                setItems([]);
                setTotals({ subtotal: 0, kdv: 0, total: 0, itemCount: 0 });
                if (!silent) {
                    toast.success('Sepetiniz temizlendi');
                }
            }
        } catch (error) {
            if (!silent) {
                toast.error('Bir hata oluştu');
            }
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