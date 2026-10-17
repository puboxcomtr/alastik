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
    brandDisplayName?: string;
    seoDescription?: string;
    seoKeywords?: string[];
    webPrice?: number;
    originalPrice?: number;
    shippingIncludedPrice?: number;
    shippingPerUnit?: number;
    featuredImage?: string;
    webVisible?: boolean;
    hideBrand?: boolean;
    // Üründe açık Ürün Butonları (panel: Ürünler > Ürün Butonları) — API yanıtına site bazlı eklenir
    buttons?: ProductButton[];
    hideProductionDate?: boolean;
    hideStock?: boolean;
    hideDelivery?: boolean;
    videos?: { order?: number; url: string; videoId: string; title?: string }[];
    webOrder?: number;
    delivery?: string;
    customDescription?: string;
    shortDescription?: string;
    siteDescriptions?: { alastik?: string; lastikjantavm?: string };
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
    barkodu?: string;
    durum?: string;
    gercek_stok?: number;
    menseiulkeadi?: string;

    // Özel Kodlar
    ozelkod1?: string;
    ozelkod1kodu?: string;
    ozelkod2?: string;
    ozelkod2kodu?: string;
    ozelkod3?: string;
    ozelkod3kodu?: string;
    ozelkod4?: string;
    ozelkod4kodu?: string;
    ozelkod5?: string;
    ozelkod5kodu?: string;
    ozelkod6?: string;
    ozelkod6kodu?: string;
    ozelkod7?: string;
    ozelkod7kodu?: string;
    ozelkod8?: string;
    ozelkod8kodu?: string;
    ozelkod9?: string;
    ozelkod9kodu?: string;
    ozelkod10?: string;
    ozelkod10kodu?: string;
    ozelkod11?: string;
    ozelkod11kodu?: string;

    // Ek alanlar
    ekalan1?: string;
    ekalan2?: string;
    ekalan3?: string;
    ekalan4?: string;
    ekalan5?: string;
    ekalan6?: string;
    ekalan7?: string;
    ekalan8?: string;
    ekalan9?: string;
    ekalan10?: string;

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

// Üründe açık bir Ürün Butonu: görünüş (geçişli zemin renkleri, yazı rengi, ikon) tanımından gelir
export interface ProductButton {
    key: string;
    label: string;
    colorFrom?: string;
    colorTo?: string;
    textColor?: string;
    icon?: string;
}

// Component props
export interface ProductCardProps {
    product: Product;
    // Kartta favori (kalp) butonu gösterilsin mi. Varsayılan gizli; Favorilerim sayfası açar.
    showFavourite?: boolean;
    brandInfo?: {
        name: string;
        logo: string | null;
    } | null;
}

// Filter parametreleri
export interface ProductFilterParams {
    category?: string;
    // Hariç tutulacak kategori slug'ları (virgülle) — örn. marka sayfası Sıfır sekmesinde 'ikinci-el'
    haricKategori?: string;
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