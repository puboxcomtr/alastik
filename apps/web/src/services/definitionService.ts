// apps/web/src/services/definitionService.ts
import { API_ENDPOINTS } from '@/src/config/api';

export async function getDefinition() {
    try {
        const res = await fetch(API_ENDPOINTS.definition.get(), {
            cache: 'no-store',
            next: { revalidate: 3600 }
        });

        if (!res.ok) {
            throw new Error('Definition yuklenemedi');
        }

        const data = await res.json();
        return data.success ? data.data : null;
    } catch (error) {
        console.error('[definitionService] getDefinition error:', error);
        return null;
    }
}