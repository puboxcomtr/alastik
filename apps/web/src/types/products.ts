// apps/web/src/types/products.ts

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

// Ürün görselleri (DIA)
export interface ProductResim {
    _key: string;
    aws_url: string;
    order_id?: string;
    content_type?: string;
}

// Kategori bilgileri (DIA)
export interface ProductKategori {
    kategori_aciklama_1?: string;
    kategori_aciklama_2?: string;
    kategori_aciklama_3?: string;
}

// Custom Data
export interface CustomData {
    seoUrl?: string;
    seoTitle?: string;
    seoDescription?: string;
    seoKeywords?: string[];
    webPrice?: number;
    originalPrice?: number;
    featuredImage?: string;
    webVisible?: boolean;
    webOrder?: number;
    delivery?: string;
    customDescription?: string;
    shortDescription?: string;
    webTags?: string[];
    webCategory?: string;
    webSubCategory?: string;
    customImages?: Array<{
        order: number;
        url: string;
        alt?: string;
        title?: string;
    }>;
    webDiscount?: number;
    discountType?: string;
    minOrderQuantity?: number;
    maxOrderQuantity?: number;
    stockAlert?: number;
    isNew?: boolean;
    isBestSeller?: boolean;
    isFeatured?: boolean;
    reviewStats?: {
        averageRating: number;
        reviewCount: number;
    };
}

// DIA Data
export interface DiaData {
    aciklama?: string;
    marka?: string;
    stokkartkodu?: string;
    anabarkod?: string;
    durum?: string;
    gercek_stok?: number;
    ozelkod5kodu?: string;
    ozelkod7kodu?: string;
    ekalan5?: string;
    ozelkod1?: string;
    m_birimler?: ProductBirim[];
    m_urunOzellikleri?: ProductOzellik[];
    m_resimler?: ProductResim[];
    m_kategoriler?: ProductKategori[];
}

// Sync Info
export interface SyncInfo {
    diaStatus?: string;
    webStatus?: string;
    lastDiaSync?: string;
}

// Ana Product Interface
export interface Product {
    _id?: string;
    _key: string;
    customData?: CustomData;
    diaData?: DiaData;
    syncInfo?: SyncInfo;
    createdAt?: string;
    updatedAt?: string;
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
    jantCap?: string;
    bijon?: string;
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
    sortBy?: string;
    sortOrder?: string;
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