import { API_ENDPOINTS, getImageUrl, getServerSiteHeaders } from '@/src/config/api';
import { throwIfUnavailable, rethrowUnavailable, PAGE_FETCH_TIMEOUT } from '@/src/lib/apiError';
import type {
    Brand,
    BrandResponse,
    BrandDetailResponse,
    BrandListResponse
} from '@/src/types/brand';

export async function getHomepageBrands(): Promise<BrandListResponse> {
    try {
        const response = await fetch(API_ENDPOINTS.brands.homepage(), {
            next: { revalidate: 3600 },
            headers: { ...(await getServerSiteHeaders()) }
        });

        if (!response.ok) {
            return { success: false, data: [], count: 0 };
        }

        return await response.json();
    } catch (error) {
        console.error('[brandService] getHomepageBrands error:', error);
        return { success: false, data: [], count: 0 };
    }
}

export async function getBrandByName(brandName: string): Promise<BrandResponse> {
    try {
        const response = await fetch(API_ENDPOINTS.brands.detail(brandName), {
            next: { revalidate: 3600 },
            headers: { ...(await getServerSiteHeaders()) }
        });

        if (!response.ok) {
            return { success: false, data: null };
        }

        const result = await response.json();

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
        console.error('[brandService] getBrandByName error:', error);
        return { success: false, data: null };
    }
}

export async function getBrandDetail(seoUrl: string): Promise<BrandDetailResponse> {
    try {
        const response = await fetch(API_ENDPOINTS.brands.detail(seoUrl), {
            next: { revalidate: 3600 },
            headers: { ...(await getServerSiteHeaders()) },
            signal: AbortSignal.timeout(PAGE_FETCH_TIMEOUT)
        });

        throwIfUnavailable(response, 'getBrandDetail');
        if (!response.ok) {
            return { success: false, data: null };
        }

        return await response.json();
    } catch (error) {
        console.error('[brandService] getBrandDetail error:', error);
        rethrowUnavailable(error, 'getBrandDetail');
    }
}

export function getBrandImageUrl(url: string | null | undefined): string {
    if (!url) return '/images/marka/gorsel-bulunamadi.jpg';
    return getImageUrl(url);
}