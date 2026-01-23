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