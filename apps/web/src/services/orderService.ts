// apps/web/src/services/orderService.ts
import { API_ENDPOINTS } from '@/src/config/api';

export interface OrderItem {
    productId?: string;
    productKey?: string;
    stockCode?: string;
    name: string;
    quantity: number;
    unitPrice: number;
    // Hizmetin alınacağı montaj noktası (fiyat sunucuda noktaya göre çözülür)
    montagePointId?: string;
    totalPrice: number;
}

/** Stok yetersizliği nedeniyle siparişe alınmayan kalem (sunucu yanıtındaki cikarilanlar) */
export interface RemovedOrderItem {
    productKey: string;
    stockCode: string;
    name: string;
    /** müşterinin istediği adet */
    istenen: number;
    /** stokta kalan (sipariş verilebilecek) adet */
    kalan: number;
}

/** Ödeme sayfasının gönderdiği sipariş isteği: kalemler yalnız ürün + adet taşır, fiyatı sunucu hesaplar */
export interface CreateOrderRequest {
    items: { productKey: string; quantity: number; montagePointId?: string }[];
    [field: string]: unknown;
}

export interface CreateOrderData {
    memberId?: string;
    isGuest: boolean;
    customerEmail: string;
    customerPhone: string;
    customerName: string;
    billingAddressId?: string;
    shippingAddressId?: string;
    guestBillingAddress?: any;
    guestShippingAddress?: any;
    // Siparişin verildiği sepetin oturum numarası (ödeme sonucu gelince sunucu o sepeti siler)
    cartSessionId?: string;
    items: OrderItem[];
    pricing: {
        subtotal: number;
        shippingCost: number;
        discountAmount: number;
        total: number;
    };
    paymentMethod: 'bank_transfer' | 'credit_card';
    customerNote?: string;
}

export const orderService = {
    async createOrder(data: CreateOrderData) {
        try {
            const res = await fetch(API_ENDPOINTS.order.create(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            return result.success ? result.data : null;
        } catch (error) {
            console.error('[orderService] createOrder error:', error);
            return null;
        }
    },

    /**
     * Sipariş oluşturur ve sunucunun yanıtını ayrıntısıyla döner: başarısızsa neden (message) ve
     * stok yetersizliğinden çıkarılan kalemler (removed) müşteriye gösterilebilsin.
     */
    async createOrderDetailed(data: CreateOrderRequest): Promise<{ order: any | null; message: string; removed: RemovedOrderItem[] }> {
        try {
            const res = await fetch(API_ENDPOINTS.order.create(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            return {
                order: result.success ? result.data : null,
                message: result.message || '',
                removed: Array.isArray(result.cikarilanlar) ? result.cikarilanlar : []
            };
        } catch (error) {
            console.error('[orderService] createOrderDetailed error:', error);
            return { order: null, message: '', removed: [] };
        }
    },

    async getUserOrders(userId: string) {
        try {
            const res = await fetch(API_ENDPOINTS.order.userOrders(userId));
            const result = await res.json();
            return result.success ? result.data : [];
        } catch (error) {
            console.error('[orderService] getUserOrders error:', error);
            return [];
        }
    },

    async getOrder(orderId: string) {
        try {
            const res = await fetch(API_ENDPOINTS.order.detail(orderId));
            const result = await res.json();
            return result.success ? result.data : null;
        } catch (error) {
            console.error('[orderService] getOrder error:', error);
            return null;
        }
    },

    async getOrderByNumber(orderNumber: string) {
        try {
            const res = await fetch(API_ENDPOINTS.order.byNumber(orderNumber));
            const result = await res.json();
            return result.success ? result.data : null;
        } catch (error) {
            console.error('[orderService] getOrderByNumber error:', error);
            return null;
        }
    }
};