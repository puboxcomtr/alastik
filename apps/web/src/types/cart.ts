export interface CartTotals {
    shipping?: number;
    subtotal: number;
    productsSubtotal?: number;
    montage?: number;
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
    itemType?: 'tire' | 'montage' | 'service' | 'product';
    rimSize?: number | null;
    rimRange?: { min: number; max: number } | null;
    ownTire?: boolean;
    productName: string;
    productImage: string | null;
    productSlug: string;
    brandName: string;
    quantity: number;
    unitPrice: number;
    originalPrice?: number;
    kdvRate: number;
    priceDisplay?: 'dahil' | 'haric';
}

export interface CartContentProps {
    items: CartItem[];
    onUpdateQuantity: (productKey: string, quantity: number) => void;
    onRemoveItem: (productKey: string) => void;
}