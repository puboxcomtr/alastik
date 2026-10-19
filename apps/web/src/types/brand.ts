export interface Brand {
    name: string;
    logo: string | null;
    logoAlt?: string;
}

export interface HomepageBrand {
    _id: string;
    name: string;
    slug: string;
    seoUrl: string;
    logo: string | null;
    logoAlt: string;
    productCount: number;
}

export interface BrandDetail {
    _id: string;
    name: string;
    slug: string;
    diaBrand: string;
    diaMarkaAck: string;
    seoUrl: string;
    seoTitle: string;
    seoDescription: string;
    seoKeywords: string[];
    logo: string | null;
    logoAlt: string;
    bannerImage: string | null;
    description: string | null;
    productCount: number;
    activeProductCount: number;
    totalStock: number;
    priceRange: {
        min: number;
        max: number;
        average: number;
    } | null;
    categoryDistribution: {
        categoryName: string;
        productCount: number;
    }[];
    brandInfo: {
        foundedYear: number | null;
        country: string | null;
        website: string | null;
        about: string | null;
    } | null;
}

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