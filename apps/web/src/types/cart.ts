export interface CartTotals {
    subtotal: number;
    kdv: number;
    total: number;
    itemCount: number;
}

export interface CartSidebarProps {
    totals: CartTotals;
    showCheckoutButton?: boolean;
    showContinueButton?: boolean;
}

export interface CartItem {
    productKey: string;
    montagePointLabel?: string;
    productName: string;
    productImage: string | null;
    productSlug: string;
    brandName: string;
    quantity: number;
    unitPrice: number;
    originalPrice?: number;
    kdvRate: number;
}

export interface CartContentProps {
    items: CartItem[];
    onUpdateQuantity: (productKey: string, quantity: number) => void;
    onRemoveItem: (productKey: string) => void;
}