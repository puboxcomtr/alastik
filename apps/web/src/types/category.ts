// apps/web/src/types/category.ts
export interface ParentCategory {
    _id: string;
    name: string;
    slug: string;
    seoUrl?: string;
}

export interface Category {
    _id: string;
    name: string;
    slug: string;
    level: number;
    parent: string | null;
    parentPath: string[];
    diaCategory: string;
    diaLevel: string;
    webVisible: boolean;
    webOrder: number;
    seoTitle: string;
    seoUrl: string;
    seoKeywords: string[];
    productCount: number;
    activeProductCount: number;
    filteredProductCount?: number;
    totalStock: number;
    customImage: string | null;
    description: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface SizeInfo {
    genislik: string;
    yukseklik: string;
    cap: string;
    formatted: string;
    search: string;
}

export interface BreadcrumbProps {
    categoryName: string;
    categorySlug: string;
    parentCategory?: ParentCategory | null;
    sizeInfo?: SizeInfo | null;
}