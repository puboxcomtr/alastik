// apps/web/src/services/brandService.ts
import type {
    Brand,
    BrandResponse,
    BrandDetailResponse,
    BrandListResponse
} from '@/src/types/brand';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api';
const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3082';

/**
 * Anasayfa markaları (showOnHomepage: true)
 */
export async function getHomepageBrands(): Promise<BrandListResponse> {
    try {
        const response = await fetch(`${API_BASE_URL}/brands/homepage`, {
            next: { revalidate: 3600 }
        });

        if (!response.ok) {
            return { success: false, data: [], count: 0 };
        }

        return await response.json();
    } catch (error) {
        console.error('Homepage brands error:', error);
        return { success: false, data: [], count: 0 };
    }
}

/**
 * Marka bilgisi (ProductCard için - basit)
 */
export async function getBrandByName(brandName: string): Promise<BrandResponse> {
    try {
        const response = await fetch(`${API_BASE_URL}/brands/${encodeURIComponent(brandName)}`, {
            next: { revalidate: 3600 }
        });

        if (!response.ok) {
            return { success: false, data: null };
        }

        const result = await response.json();

        // BrandDetail'i Brand'e dönüştür (ProductCard uyumluluğu)
        if (result.success && result.data) {
            return {
                success: true,
                data: {
                    name: result.data.name,
                    logo: result.data.logo,
                    logoAlt: result.data.logoAlt
                }
            };
        }

        return { success: false, data: null };
    } catch (error) {
        console.error('Brand service error:', error);
        return { success: false, data: null };
    }
}

/**
 * Marka detayı (Marka sayfası için - tam bilgi)
 */
export async function getBrandDetail(seoUrl: string): Promise<BrandDetailResponse> {
    try {
        const response = await fetch(`${API_BASE_URL}/brands/${encodeURIComponent(seoUrl)}`, {
            next: { revalidate: 3600 }
        });

        if (!response.ok) {
            return { success: false, data: null };
        }

        return await response.json();
    } catch (error) {
        console.error('Brand detail error:', error);
        return { success: false, data: null };
    }
}

/**
 * Görsel URL helper
 */
export function getBrandImageUrl(url: string | null | undefined): string {
    if (!url) return '/images/marka/gorsel-bulunamadi.jpg';
    if (url.startsWith('http')) return url;
    return url.startsWith('/') ? `${BASE_URL}${url}` : `${BASE_URL}/${url}`;
}