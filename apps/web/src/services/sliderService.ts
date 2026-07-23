// apps/web/src/services/sliderService.ts
import { API_ENDPOINTS, getImageUrl } from '@/src/config/api';
import type { Slider } from '@/src/types/slider';

/**
 * ID ile slider getir (dropdown sistemi için)
 */
export async function getSliderById(id: string): Promise<Slider | null> {
    try {
        if (!id) return null;

        const response = await fetch(API_ENDPOINTS.slider.detail(id), {
            next: { revalidate: 3600 }
        });

        if (!response.ok) return null;

        const data = await response.json();
        return data.success && data.data ? data.data : null;
    } catch (error) {
        console.error('[sliderService] getSliderById hatası:', error);
        return null;
    }
}

/**
 * Key ile slider getir (placeholder sistemi için)
 */
export async function getSliderByKey(key: string, site?: string): Promise<Slider | null> {
    try {
        if (!key) return null;
        const response = await fetch(API_ENDPOINTS.slider.byKey(key), {
            next: { revalidate: 3600 },
            headers: site ? { 'X-Site': site } : undefined
        });

        if (!response.ok) return null;

        const data = await response.json();
        return data.success && data.data ? data.data : null;
    } catch (error) {
        console.error('[sliderService] getSliderByKey hatası:', error);
        return null;
    }
}

/**
 * Slider görsel URL helper
 */
export function getSliderImageUrl(url: string | null | undefined): string {
    if (!url) return '/images/slider/gorsel-bulunamadi.jpg';
    return getImageUrl(url);
}