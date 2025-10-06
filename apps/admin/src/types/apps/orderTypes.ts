// apps/admin/src/types/orderTypes.ts

// Backend'den gelen API response tipi
export interface OrderApiResponse {
    _id: string;
    _key: string;
    orderNumber: string;
    customerName: string;
    phone: string;
    email: string;
    date: string;
    status: OrderStatus;
    total: number;
    currency: string;
    itemCount: number;
}

// Tablo için kullanılan tip
export interface OrderTableRow {
    id: number;
    order: string;
    date: string;
    customer: string;
    phone: string;
    email: string;
    status: OrderStatus;
    payment: string;
    total: number;
    currency: string;
    actions: string;
}

// Durum tipleri
export type OrderStatus =
    | 'pending'
    | 'confirmed'
    | 'processing'
    | 'shipped'
    | 'delivered'
    | 'cancelled'
    | 'returned';

export type PaymentStatus =
    | 'pending'
    | 'paid'
    | 'failed'
    | 'refunded';

export type OrderSource =
    | 'web'
    | 'mobile'
    | 'admin'
    | 'dia_sync'
    | 'marketplace';

// Tam sipariş detayı (detay sayfası için)
export interface OrderDetail {
    _id: string;
    orderNumber: string;
    userId?: {
        _id: string;
        email?: string;
        firstName?: string;
        lastName?: string;
    };
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    source: OrderSource;
    items: OrderItem[];
    billing: BillingInfo;
    shipping: ShippingInfo;
    pricing: PricingInfo;
    payment?: PaymentInfo;
    integration?: IntegrationInfo;
    createdAt: string;
    updatedAt: string;
}

export interface OrderItem {
    productId: string;
    name: string;
    brand: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    vatRate: number;
    vatAmount: number;
}

export interface BillingInfo {
    address: {
        firstName?: string;
        lastName?: string;
        address?: string;
        city?: string;
        phone?: string;
    };
    taxNumber?: string;
    isCompany?: boolean;
}

export interface ShippingInfo {
    address: {
        address?: string;
        city?: string;
        phone?: string;
    };
}

export interface PricingInfo {
    subtotal: number;
    vatAmount: number;
    total: number;
    currency: string;
}

export interface PaymentInfo {
    method?: string;
    status?: string;
}

export interface IntegrationInfo {
    diaSync?: {
        status: string;
        diaOrderNumber?: string;
        diaOrderKey?: string;
        syncedAt?: string;
    };
}