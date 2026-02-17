// apps/web/src/services/filterService.ts
import { API_ENDPOINTS } from '@/src/config/api';

export interface FilterOption {
    value: string;
    label?: string;
    count: number;
}

export interface VehicleTypeOption {
    value: string;
    label: string;
    count: number;
}

export interface TireFilterOptions {
    productType: 'LASTİK' | 'JANT';
    brands: FilterOption[];
    vehicleTypes: VehicleTypeOption[];
    priceRange: { min: number; max: number };
    widths?: FilterOption[];
    aspects?: FilterOption[];
    rims?: FilterOption[];
    oem?: FilterOption[];
    seasons?: FilterOption[];
    properties?: FilterOption[];
    loadIndex?: FilterOption[];
    speedIndex?: FilterOption[];
    productionYears?: FilterOption[];
    jantCaplar?: FilterOption[];
    bijonlar?: FilterOption[];
}

export async function getTireFilterOptions(
    categorySlug?: string,
    tagSlug?: string
): Promise<TireFilterOptions | null> {
    try {
        const params = new URLSearchParams();
        if (categorySlug) params.append('category', categorySlug);
        if (tagSlug) params.append('tag', tagSlug);

        const queryString = params.toString();
        const url = `${API_ENDPOINTS.filters.tireOptions()}${queryString ? `?${queryString}` : ''}`;

        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) return null;

        const result = await res.json();
        return result.success ? result.data : null;
    } catch (error) {
        console.error('[filterService] getTireFilterOptions error:', error);
        return null;
    }
}