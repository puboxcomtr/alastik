export interface CartTotals {
    /** Ürün fiyatından hariç tutulan kargo (KDV dahil); fiyata dahilse 0 / tanımsız */
    shipping?: number;
    /** Tüm kalemler, KDV hariç (montaj dahil) */
    subtotal: number;
    /** Montaj/hizmet hariç ürünler, KDV hariç */
    productsSubtotal?: number;
    /** Montaj ve hizmet kalemleri, KDV hariç */
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
    // Sepet kuralları: kalem türü, lastik jant çapı, montaj hizmetinin çap aralığı
    itemType?: 'tire' | 'montage' | 'service' | 'product';
    rimSize?: number | null;
    rimRange?: { min: number; max: number } | null;
    // "Montaj Satın Al" sayfasından (müşterinin kendi lastiği) eklenen montaj
    ownTire?: boolean;
    productName: string;
    productImage: string | null;
    productSlug: string;
    brandName: string;
    quantity: number;
    unitPrice: number;
    originalPrice?: number;
    kdvRate: number;
    // Kategori ayarı 'haric' ise satırda fiyat KDV hariç gösterilir ve '+ KDV' ibaresi eklenir
    priceDisplay?: 'dahil' | 'haric';
}

export interface CartContentProps {
    items: CartItem[];
    onUpdateQuantity: (productKey: string, quantity: number) => void;
    onRemoveItem: (productKey: string) => void;
}