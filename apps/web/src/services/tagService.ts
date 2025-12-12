// apps/web/src/services/tagService.ts

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.alastik.com/api';

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

// Filtre parametreleri için interface
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
}

/**
 * Slug ile tag getir
 */
async function getTagBySlug(slug: string): Promise<WebTag | null> {
    try {
        const response = await fetch(`${API_BASE_URL}/tags/${slug}`, {
            next: { revalidate: 60 }
        });

        if (!response.ok) {
            return null;
        }

        const result = await response.json();
        return result.success ? result.data : null;
    } catch (error) {
        console.error('[tagService] getTagBySlug error:', error);
        return null;
    }
}

/**
 * Tag'e ait ürünleri getir
 */
async function getTagProducts(
    slug: string,
    page: number = 1,
    limit: number = 12,
    filters?: TagFilterParams
): Promise<TagProductsResponse | null> {
    try {
        // URL parametrelerini oluştur
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('limit', limit.toString());

        // Filtre parametrelerini ekle
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

        const response = await fetch(
            `${API_BASE_URL}/tags/${slug}/products?${params.toString()}`,
            { next: { revalidate: 60 } }
        );

        if (!response.ok) {
            return null;
        }

        const result = await response.json();
        return result.success ? result.data : null;
    } catch (error) {
        console.error('[tagService] getTagProducts error:', error);
        return null;
    }
}

/**
 * Lastik ebatına göre tag seoUrl bul
 */
async function getTireSizeTag(width: number, aspectRatio: number, diameter: number): Promise<{ seoUrl: string; title: string } | null> {
    try {
        const response = await fetch(
            `${API_BASE_URL}/tags/tire-size?width=${width}&aspectRatio=${aspectRatio}&diameter=${diameter}`
        );

        if (!response.ok) {
            return null;
        }

        const result = await response.json();
        return result.success ? result.data : null;
    } catch (error) {
        console.error('[tagService] getTireSizeTag error:', error);
        return null;
    }
}

/**
 * Jant ebatına göre tag seoUrl bul
 */
async function getRimPcdTag(pcd: string): Promise<{ seoUrl: string; title: string } | null> {
    try {
        const response = await fetch(`${API_BASE_URL}/tags/rim-pcd?pcd=${pcd}`, {
            next: { revalidate: 60 }
        });

        if (!response.ok) {
            return null;
        }

        const result = await response.json();
        return result.success ? result.data : null;
    } catch (error) {
        console.error('getRimPcdTag error:', error);
        return null;
    }
}
/**
 * Kar paleti ebatına göre tag seoUrl bul
 */
async function getChainSizeTag(width: number, aspectRatio: number, diameter: number): Promise<{ seoUrl: string; title: string } | null> {
    try {
        const response = await fetch(
            `${API_BASE_URL}/tags/chain-size?width=${width}&aspectRatio=${aspectRatio}&diameter=${diameter}`
        );

        if (!response.ok) {
            return null;
        }

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