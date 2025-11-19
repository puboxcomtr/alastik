// apps/web/src/types/brand.ts
export interface Brand {
    name: string;
    logo: string | null;
}

export interface BrandResponse {
    success: boolean;
    data: Brand | null;
}