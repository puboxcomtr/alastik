const API_URL = process.env.NEXT_PUBLIC_API_URL;

// SessionId al veya oluştur
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
        const res = await fetch(`${API_URL}/cart/${sessionId}`);
        const data = await res.json();
        return data.success ? data.data : null;
    } catch (error) {
        console.error('getCart error:', error);
        return null;
    }
}

// Sepete ekle
export async function addToCart(productKey: string, quantity: number = 1) {
    const sessionId = getCartSessionId();

    try {
        const res = await fetch(`${API_URL}/cart/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, productKey, quantity })
        });
        return await res.json();
    } catch (error) {
        console.error('addToCart error:', error);
        return { success: false, message: 'Bir hata oluştu' };
    }
}

// Adet güncelle
export async function updateCartItem(productKey: string, quantity: number) {
    const sessionId = getCartSessionId();

    try {
        const res = await fetch(`${API_URL}/cart/update`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, productKey, quantity })
        });
        return await res.json();
    } catch (error) {
        console.error('updateCartItem error:', error);
        return { success: false, message: 'Bir hata oluştu' };
    }
}

// Ürün kaldır
export async function removeFromCart(productKey: string) {
    const sessionId = getCartSessionId();

    try {
        const res = await fetch(`${API_URL}/cart/remove`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, productKey })
        });
        return await res.json();
    } catch (error) {
        console.error('removeFromCart error:', error);
        return { success: false, message: 'Bir hata oluştu' };
    }
}

// Sepeti temizle
export async function clearCart() {
    const sessionId = getCartSessionId();

    try {
        const res = await fetch(`${API_URL}/cart/clear/${sessionId}`, {
            method: 'DELETE'
        });
        return await res.json();
    } catch (error) {
        console.error('clearCart error:', error);
        return { success: false, message: 'Bir hata oluştu' };
    }
}