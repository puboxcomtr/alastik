import { api } from '@lib/api';

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
    // Ortak
    brands: FilterOption[];
    vehicleTypes: VehicleTypeOption[];
    priceRange: {
        min: number;
        max: number;
    };
    // Lastik
    widths?: FilterOption[];
    aspects?: FilterOption[];
    rims?: FilterOption[];
    oem?: FilterOption[];
    seasons?: FilterOption[];
    properties?: FilterOption[];
    loadIndex?: FilterOption[];
    speedIndex?: FilterOption[];
    productionYears?: FilterOption[];
    // Jant
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
        const url = `/filters/tire-options${queryString ? `?${queryString}` : ''}`;

        const result = await api.get(url);

        if (result?.success && result?.data) {
            return result.data;
        }
        if (result?.data?.success && result?.data?.data) {
            return result.data.data;
        }

        return null;
    } catch (error) {
        console.error('Filtre seçenekleri alınamadı:', error);
        return null;
    }
}