export interface AddressSnapshot {
    addressName?: string;
    invoiceType?: string;
    fullName?: string;
    tcNo?: string;
    companyName?: string;
    taxOffice?: string;
    taxNo?: string;
    authorizedPerson?: string;
    email?: string;
    phone?: string;
    cityName?: string;
    districtName?: string;
    neighborhoodName?: string;
    street?: string;
    buildingNo?: string;
    floor?: string;
    apartmentNo?: string;
    addressNote?: string;
}

export interface MemberSnapshot {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
}

export interface Order {
    orderNumber: string;
    isGuest: boolean;
    billingSnapshot?: AddressSnapshot | null;
    shippingSnapshot?: AddressSnapshot | null;
    memberSnapshot?: MemberSnapshot | null;
    pricing: {
        subtotal: number;
        total: number;
    };
    payment: {
        method: string;
        bankTransfer?: {
            referenceCode: string;
        };
    };
    items: Array<{
        name: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
    }>;
}

export interface OrderSummaryProps {
    order: Order;
}

export interface OrderItem {
    name: string;
    brand?: string;
    quantity: number;
    unitPrice: number;
    specifications?: { size?: string };
}

export interface OrderSummary {
    _id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    createdAt: string;
    pricing: { total: number; currency: string };
    items: OrderItem[];
}