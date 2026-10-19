import { API_ENDPOINTS, getServerSiteHeaders } from '@/src/config/api';

export function getCartSessionId(): string {
    if (typeof window === 'undefined') return '';

    let sessionId = localStorage.getItem('cartSessionId');
    if (!sessionId) {
        sessionId = 'cart_' + crypto.randomUUID();
        localStorage.setItem('cartSessionId', sessionId);
    }
    return sessionId;
}

function getAuthHeader(): Record<string, string> {
    if (typeof window === 'undefined') return {};
    const token = localStorage.getItem('authToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getCart() {
    const sessionId = getCartSessionId();
    if (!sessionId) return null;

    try {
        const res = await fetch(API_ENDPOINTS.cart.get(sessionId), {
            headers: { ...(await getServerSiteHeaders()) }
        });
        const data = await res.json();
        return data.success ? { ...data.data, notes: data.notes } : null;
    } catch (error) {
        console.error('[cartService] getCart error:', error);
        return null;
    }
}

export async function addToCart(productKey: string, quantity: number = 1, montagePointId?: string, ownTire?: boolean) {
    const sessionId = getCartSessionId();

    try {
        const res = await fetch(API_ENDPOINTS.cart.add(), {
            method: 'POST',
            body: JSON.stringify({ sessionId, productKey, quantity, montagePointId, ...(ownTire ? { ownTire: true } : {}) }),
            headers: {
                ...(await getServerSiteHeaders()),
                ...getAuthHeader(),
                'Content-Type': 'application/json'
            }
        });
        return await res.json();
    } catch (error) {
        console.error('[cartService] addToCart error:', error);
        return { success: false, message: 'Bir hata olustu' };
    }
}

export async function updateCartItem(productKey: string, quantity: number) {
    const sessionId = getCartSessionId();

    try {
        const res = await fetch(API_ENDPOINTS.cart.update(), {
            method: 'PUT',
            body: JSON.stringify({ sessionId, productKey, quantity }),
            headers: {
                ...(await getServerSiteHeaders()),
                ...getAuthHeader(),
                'Content-Type': 'application/json'
            }
        });
        return await res.json();
    } catch (error) {
        console.error('[cartService] updateCartItem error:', error);
        return { success: false, message: 'Bir hata olustu' };
    }
}

export async function removeFromCart(productKey: string) {
    const sessionId = getCartSessionId();

    try {
        const res = await fetch(API_ENDPOINTS.cart.remove(), {
            method: 'DELETE',
            body: JSON.stringify({ sessionId, productKey }),
            headers: {
                ...(await getServerSiteHeaders()),
                'Content-Type': 'application/json'
            }
        });
        return await res.json();
    } catch (error) {
        console.error('[cartService] removeFromCart error:', error);
        return { success: false, message: 'Bir hata olustu' };
    }
}

export async function clearCart() {
    const sessionId = getCartSessionId();

    try {
        const res = await fetch(API_ENDPOINTS.cart.clear(sessionId), {
            method: 'DELETE',
            headers: { ...(await getServerSiteHeaders()) }
        });
        return await res.json();
    } catch (error) {
        console.error('[cartService] clearCart error:', error);
        return { success: false, message: 'Bir hata olustu' };
    }
}