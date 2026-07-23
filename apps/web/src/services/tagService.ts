// apps/web/src/services/tagService.ts
import { API_ENDPOINTS } from '@/src/config/api';

export interface WebTag {
    _id: string;
    seoUrl: string;
    title: string;
    description?: string;
    seoTitle?: string;
    seoDescription?: string;
    type: string;
    season?: string;
    isActive: boolean;
    order: number;
    productCount: number;
    products: string[];
    createdAt: string;
    updatedAt: string;
}

export interface TagProductsResponse {
    products: any[];
    pagination: {
        currentPage: number;
        totalPages: number;
        totalProducts: number;
        limit: number;
    };
}

export interface TagFilterParams {
    marka?: string;
    arac?: string;
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
}

async function getTagBySlug(slug: string): Promise<WebTag | null> {
    try {
        const response = await fetch(API_ENDPOINTS.tags.detail(slug), {
            next: {
                revalidate: 300,
                tags: [`tag-${slug}`]
            }
        });

        if (response.status === 404) {
            return null;
        }

        if (!response.ok) return null;

        const result = await response.json();
        return result.success ? result.data : null;
    } catch (error) {
        console.error('[tagService] getTagBySlug error:', error);
        return null;
    }
}
async function getTagProducts(
    slug: string,
    page: number = 1,
    limit: number = 12,
    filters?: TagFilterParams
): Promise<TagProductsResponse | null> {
    try {
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('limit', limit.toString());

        if (filters?.marka) params.append('marka', filters.marka);
        if (filters?.arac) params.append('arac', filters.arac);
        if (filters?.oem) params.append('oem', filters.oem);
        if (filters?.mevsim) params.append('mevsim', filters.mevsim);
        if (filters?.ozellik) params.append('ozellik', filters.ozellik);
        if (filters?.yukEndeksi) params.append('yukEndeksi', filters.yukEndeksi);
        if (filters?.hizEndeksi) params.append('hizEndeksi', filters.hizEndeksi);
        if (filters?.uretim) params.append('uretim', filters.uretim);
        if (filters?.fiyatMin) params.append('fiyatMin', filters.fiyatMin.toString());
        if (filters?.fiyatMax) params.append('fiyatMax', filters.fiyatMax.toString());
        if (filters?.sortBy) params.append('sortBy', filters.sortBy);
        if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);

        const response = await fetch(
            `${API_ENDPOINTS.tags.products(slug)}?${params.toString()}`,
            { cache: 'no-store' }
        );
        if (!response.ok) return null;

        const result = await response.json();
        return result.success ? result.data : null;
    } catch (error) {
        console.error('[tagService] getTagProducts error:', error);
        return null;
    }
}

async function getTireSizeTag(
    width: number,
    aspectRatio: number,
    diameter: number
): Promise<{ seoUrl: string; title: string } | null> {
    try {
        const response = await fetch(
            `${API_ENDPOINTS.tags.tireSize()}?width=${width}&aspectRatio=${aspectRatio}&diameter=${diameter}`
        );

        if (!response.ok) return null;

        const result = await response.json();
        return result.success ? result.data : null;
    } catch (error) {
        console.error('[tagService] getTireSizeTag error:', error);
        return null;
    }
}

async function getRimPcdTag(pcd: string): Promise<{ seoUrl: string; title: string } | null> {
    try {
        const response = await fetch(
            `${API_ENDPOINTS.tags.rimPcd()}?pcd=${pcd}`,
            { next: { revalidate: 60 } }
        );

        if (!response.ok) return null;

        const result = await response.json();
        return result.success ? result.data : null;
    } catch (error) {
        console.error('[tagService] getRimPcdTag error:', error);
        return null;
    }
}

async function getChainSizeTag(
    width: number,
    aspectRatio: number,
    diameter: number
): Promise<{ seoUrl: string; title: string } | null> {
    try {
        const response = await fetch(
            `${API_ENDPOINTS.tags.chainSize()}?width=${width}&aspectRatio=${aspectRatio}&diameter=${diameter}`
        );

        if (!response.ok) return null;

        const result = await response.json();
        return result.success ? result.data : null;
    } catch (error) {
        console.error('[tagService] getChainSizeTag error:', error);
        return null;
    }
}

const tagService = {
    getTagBySlug,
    getTagProducts,
    getTireSizeTag,
    getRimPcdTag,
    getChainSizeTag
};

export default tagService;