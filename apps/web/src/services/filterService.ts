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
    priceRange: { min: number; max: number } | null;
    widths?: FilterOption[];
    aspects?: FilterOption[];
    rims?: FilterOption[];
    oem?: FilterOption[];
    seasons?: FilterOption[];
    properties?: FilterOption[];
    loadIndex?: FilterOption[];
    speedIndex?: FilterOption[];
    productionYears?: FilterOption[];
    jantGenislikleri?: FilterOption[];
    jantCaplari?: FilterOption[];
    bijonSayilari?: FilterOption[];
    bijonAraliklari?: FilterOption[];
    gobekCaplari?: FilterOption[];
    etler?: FilterOption[];
    renkler?: FilterOption[];
}

export async function getTireFilterOptions(
    categorySlug?: string,
    tagSlug?: string,
    brandSlug?: string,
    activeFilters?: Record<string, string | undefined>,
    searchQuery?: string
): Promise<TireFilterOptions | null> {
    try {
        const params = new URLSearchParams();
        if (categorySlug) params.append('category', categorySlug);
        if (tagSlug) params.append('tag', tagSlug);
        if (brandSlug) params.append('brand', brandSlug);
        if (searchQuery) params.append('q', searchQuery);

        if (activeFilters) {
            const filterKeys = [
                'genislik', 'yanak', 'jant', 'arac', 'marka',
                'mevsim', 'oem', 'yukEndeksi', 'hizEndeksi',
                'ozellik', 'uretim',
                'jantGenisligi', 'jantCap', 'bijonSayisi', 'bijon',
                'gobekCapi', 'et', 'renk'
            ];
            filterKeys.forEach(key => {
                const value = activeFilters[key];
                if (value && value !== 'all') {
                    params.append(key, value);
                }
            });
        }

        const queryString = params.toString();
        const url = `${API_ENDPOINTS.filters.tireOptions()}${queryString ? `?${queryString}` : ''}`;
        
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) return null;

        const result = await res.json();
        return result.success ? result.data : null;
    } catch (error) {
        console.error('[filterService] getTireFilterOptions hatası:', error);
        return null;
    }
}