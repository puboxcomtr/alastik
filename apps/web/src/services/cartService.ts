// apps/web/src/services/cartService.ts
import { API_ENDPOINTS } from '@/src/config/api';

// SessionId al veya olustur
export function getCartSessionId(): string {
    if (typeof window === 'undefined') return '';

    let sessionId = localStorage.getItem('cartSessionId');
    if (!sessionId) {
        sessionId = 'cart_' + crypto.randomUUID();
        localStorage.setItem('cartSessionId', sessionId);
    }
    return sessionId;
}

// Sepeti getir
export async function getCart() {
    const sessionId = getCartSessionId();
    if (!sessionId) return null;

    try {
        const res = await fetch(API_ENDPOINTS.cart.get(sessionId));
        const data = await res.json();
        return data.success ? data.data : null;
    } catch (error) {
        console.error('[cartService] getCart error:', error);
        return null;
    }
}

// Sepete ekle
export async function addToCart(productKey: string, quantity: number = 1) {
    const sessionId = getCartSessionId();

    try {
        const res = await fetch(API_ENDPOINTS.cart.add(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, productKey, quantity })
        });
        return await res.json();
    } catch (error) {
        console.error('[cartService] addToCart error:', error);
        return { success: false, message: 'Bir hata olustu' };
    }
}

// Adet guncelle
export async function updateCartItem(productKey: string, quantity: number) {
    const sessionId = getCartSessionId();

    try {
        const res = await fetch(API_ENDPOINTS.cart.update(), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, productKey, quantity })
        });
        return await res.json();
    } catch (error) {
        console.error('[cartService] updateCartItem error:', error);
        return { success: false, message: 'Bir hata olustu' };
    }
}

// Urun kaldir
export async function removeFromCart(productKey: string) {
    const sessionId = getCartSessionId();

    try {
        const res = await fetch(API_ENDPOINTS.cart.remove(), {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, productKey })
        });
        return await res.json();
    } catch (error) {
        console.error('[cartService] removeFromCart error:', error);
        return { success: false, message: 'Bir hata olustu' };
    }
}

// Sepeti temizle
export async function clearCart() {
    const sessionId = getCartSessionId();

    try {
        const res = await fetch(API_ENDPOINTS.cart.clear(sessionId), {
            method: 'DELETE'
        });
        return await res.json();
    } catch (error) {
        console.error('[cartService] clearCart error:', error);
        return { success: false, message: 'Bir hata olustu' };
    }
}