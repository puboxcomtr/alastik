import { api } from '@lib/api';

export interface FilterOption {
    value: string;
    label?: string;
    count: number;
}
export interface TireFilterOptions {
    widths: FilterOption[];
    heights: FilterOption[];
    rims: FilterOption[];
    vehicleTypes: VehicleTypeOption[];
    brands: FilterOption[];
    oem: FilterOption[];
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