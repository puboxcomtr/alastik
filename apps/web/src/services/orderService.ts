const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api';

export interface OrderItem {
    productId?: string;
    productKey?: string;
    stockCode?: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
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
            const res = await fetch(`${API_URL}/order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            return result.success ? result.data : null;
        } catch (error) {
            console.error('Sipariş oluşturma hatası:', error);
            return null;
        }
    },

    async getUserOrders(userId: string) {
        try {
            const res = await fetch(`${API_URL}/order/user/${userId}`);
            const result = await res.json();
            return result.success ? result.data : [];
        } catch (error) {
            console.error('Siparişler yükleme hatası:', error);
            return [];
        }
    },

    async getOrder(orderId: string) {
        try {
            const res = await fetch(`${API_URL}/order/${orderId}`);
            const result = await res.json();
            return result.success ? result.data : null;
        } catch (error) {
            console.error('Sipariş detay hatası:', error);
            return null;
        }
    },

    async getOrderByNumber(orderNumber: string) {
        try {
            const res = await fetch(`${API_URL}/order/number/${orderNumber}`);
            const result = await res.json();
            return result.success ? result.data : null;
        } catch (error) {
            console.error('Sipariş sorgulama hatası:', error);
            return null;
        }
    }
};