// apps/web/src/types/brand.ts

// Temel marka bilgisi (ProductCard için)
export interface Brand {
    name: string;
    logo: string | null;
    logoAlt?: string;
}

// Anasayfa marka listesi için
export interface HomepageBrand {
    _id: string;
    name: string;
    slug: string;
    seoUrl: string;
    logo: string | null;
    logoAlt: string;
    productCount: number;
}

// Marka detay sayfası için
export interface BrandDetail {
    _id: string;
    name: string;
    slug: string;
    seoUrl: string;
    logo: string | null;
    logoAlt: string;
    bannerImage: string | null;
    seoTitle: string;
    seoDescription: string;
    description: string | null;
    productCount: number;
    brandInfo: {
        foundedYear: number | null;
        country: string | null;
        website: string | null;
        about: string | null;
    };
}

// Response tipleri
export interface BrandResponse {
    success: boolean;
    data: Brand | null;
}

export interface BrandDetailResponse {
    success: boolean;
    data: BrandDetail | null;
}

export interface BrandListResponse {
    success: boolean;
    data: HomepageBrand[];
    count: number;
}