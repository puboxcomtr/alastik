// apps/web/src/services/settingsService.ts
import { API_ENDPOINTS } from '@/src/config/api';

export interface ShowcaseSettings {
    productsPerPage: number;
    showcaseProductSize: string;
}

export async function getShowcaseSettings(): Promise<ShowcaseSettings> {
    try {
        const response = await fetch(API_ENDPOINTS.settings.group('showcase'), {
            cache: 'no-store'
        });

        const data = await response.json();

        return {
            productsPerPage: data.data.productsPerPage,
            showcaseProductSize: data.data.showcaseProductSize
        };
    } catch (error) {
        console.error('[settingsService] getShowcaseSettings hatası:', error);
        return { productsPerPage: 12, showcaseProductSize: 'medium' };
    }
}