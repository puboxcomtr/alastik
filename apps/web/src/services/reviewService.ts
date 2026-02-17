
// apps/web/src/services/reviewService.ts
import { API_ENDPOINTS } from '@/src/config/api';

export async function getProductReviews(productKey: string) {
    try {
        const res = await fetch(API_ENDPOINTS.reviews.byProduct(productKey), {
            cache: 'no-store'
        });

        if (!res.ok) return null;

        const data = await res.json();
        return data.success ? data.data : null;
    } catch (error) {
        console.error('[reviewService] getProductReviews error:', error);
        return null;
    }
}