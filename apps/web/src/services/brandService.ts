// apps/web/src/services/brandService.ts 
import type { BrandResponse } from '@/src/types/brand';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api';

export async function getBrandByName(brandName: string): Promise<BrandResponse> {
    try {
        const response = await fetch(`${API_BASE_URL}/brands/${encodeURIComponent(brandName)}`, {
            cache: 'no-store',
            next: { revalidate: 3600 } // 1 saat cache
        });

        if (!response.ok) {
            return { success: false, data: null };
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('❌ Brand service error:', error);
        return { success: false, data: null };
    }
}