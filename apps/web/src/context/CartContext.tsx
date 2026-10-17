'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import * as cartService from '@/src/services/cartService';
import { pushDataLayer, fireAdsConversion } from '@/src/lib/tracking';

interface CartItem {
    productKey: string;
    productName: string;
    productImage: string | null;
    productSlug: string;
    brandName: string;
    quantity: number;
    unitPrice: number;
    kdvRate: number;
    /** Kategori ayarı: 'haric' ise fiyat KDV hariç gösterilir */
    priceDisplay?: 'dahil' | 'haric';
    montagePointId?: string;
    montagePointLabel?: string;
    // Sepet kuralları: kalem türü, lastik jant çapı, montaj hizmetinin çap aralığı
    itemType?: 'tire' | 'montage' | 'service' | 'product';
    rimSize?: number | null;
    rimRange?: { min: number; max: number } | null;
}

interface CartTotals {
    /** Tüm kalemler, KDV hariç (montaj dahil) */
    subtotal: number;
    /** Montaj/hizmet hariç ürünler, KDV hariç */
    productsSubtotal?: number;
    /** Montaj ve hizmet kalemleri, KDV hariç */
    montage?: number;
    kdv: number;
    /** Ürün fiyatından hariç tutulan kargo (KDV dahil); fiyata dahilse 0 / tanımsız */
    shipping?: number;
    total: number;
    itemCount: number;
}

interface CartContextType {
    items: CartItem[];
    totals: CartTotals;
    loading: boolean;
    addToCart: (productKey: string, quantity?: number, successMessage?: string, montagePointId?: string, ownTire?: boolean) => Promise<boolean>;
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
                // Stok azaldığı için adedi düşen / çıkarılan kalemler müşteriye bildirilir
                (cart.notes || []).forEach((note: string) => toast.warning(note));
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

    const addToCart = async (productKey: string, quantity: number = 1, successMessage: string = 'Ürün sepetinize başarıyla eklendi.', montagePointId?: string, ownTire?: boolean): Promise<boolean> => {
        try {
            const result = await cartService.addToCart(productKey, quantity, montagePointId, ownTire);
            if (result.success) {
                setItems(result.data.items || []);
                setTotals(result.data.totals || totals);
                // Boş mesaj = bildirim gösterme (mobil satın alma çubuğu kendi onay panelini açar)
                if (successMessage) toast.success(successMessage);
                notifyRuleNotes(result.notes);

                // GTM dönüşüm tetikleyicileri için dataLayer olayı + Google Ads dönüşümü
                const addedItem = (result.data.items || []).find((i: CartItem) => i.productKey === productKey);
                const addedValue = addedItem ? Math.round(addedItem.unitPrice * quantity * 100) / 100 : undefined;
                pushDataLayer({
                    event: 'add_to_cart',
                    item_id: productKey,
                    quantity,
                    value: addedValue,
                    currency: 'TRY'
                });
                fireAdsConversion('addToCart', { value: addedValue ?? 1.0 });
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
                // Boş mesaj = bildirim gösterme
                if (successMessage) toast.success(successMessage);
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