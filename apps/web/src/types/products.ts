// apps/web/src/types/product.ts

// Birim bilgileri
export interface ProductBirim {
    fiyat1?: number;
    fiyat4?: number;
    birimadi?: string;
}

// Ürün özellikleri
export interface ProductOzellik {
    ozellikadi: string;
    detayaciklama: string;
}

// Ana Product interface
export interface Product {
    _key: string;
    customData: {
        seoUrl?: string;
        seoTitle?: string;
        webPrice?: number;
        originalPrice?: number;
        featuredImage?: string;
        webVisible?: boolean;
    };
    diaData: {
        aciklama: string;
        marka?: string;
        gercek_stok: number;
        anabarkod?: string;
        stokkartkodu?: string;
        m_birimler?: ProductBirim[];
        m_urunOzellikleri?: ProductOzellik[];
    };
    brandInfo?: {
        name: string;
        logo: string | null;
    };
}

// Component props
export interface ProductCardProps {
    product: Product;
    brandInfo?: {
        name: string;
        logo: string | null;
    } | null;
}

// Filter parametreleri
export interface ProductFilterParams {
    category?: string;
    genislik?: string;
    yukseklik?: string;
    cap?: string;
    arac?: string;
    marka?: string;
    oem?: string;
    mevsim?: string;
    ozellik?: string;
    yukEndeksi?: string;
    hizEndeksi?: string;
    uretim?: string;
    fiyatMin?: number;
    fiyatMax?: number;
    page?: number;
    limit?: number;
}

// Pagination bilgileri
export interface PaginationInfo {
    currentPage: number;
    totalPages: number;
    totalProducts: number;
    productsPerPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

// API Response
export interface ProductFilterResponse {
    products: Product[];
    pagination: PaginationInfo;
}