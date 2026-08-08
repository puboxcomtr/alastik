import { API_ENDPOINTS, getServerSiteHeaders } from '@/src/config/api';
import type { TireSizeOptions } from '@/src/types/tire-calc/tire-calc';

/**
 * WheelSize'dan lastik ebat listelerini çeker
 * (widths, aspectRatios, rimDiameters)
 */
export async function getTireSizeOptions(): Promise<TireSizeOptions | null> {
    try {
        const res = await fetch(API_ENDPOINTS.wheelsize.calculatorSizes(), {
            next: { revalidate: 86400 },
            headers: { ...(await getServerSiteHeaders()) }
        });

        if (!res.ok) return null;

        const result = await res.json();
        return result.success ? result.data : null;
    } catch (error) {
        console.error('[calculatorService] getTireSizeOptions hatası:', error);
        return null;
    }
}