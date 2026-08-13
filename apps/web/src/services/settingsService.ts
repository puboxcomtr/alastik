// apps/web/src/services/settingsService.ts
import { API_ENDPOINTS, getServerSiteHeaders } from '@/src/config/api';

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
export interface ServicePoint {
    name: string;
    phone: string;
}

/**
 * Servis noktaları — hizmet ürünlerinin kartlarında gösterilen iletişim bilgileri.
 * Site ayarlarından (Tanımlar > Servis Noktaları) okunur.
 */
export async function getServicePoints(): Promise<ServicePoint[]> {
    try {
        const response = await fetch(API_ENDPOINTS.definition.get(), {
            cache: 'no-store',
            headers: await getServerSiteHeaders()
        });

        if (!response.ok) return [];

        const data = await response.json();
        const points = data?.data?.serviceInfo?.points;

        return Array.isArray(points) ? points.filter((p: ServicePoint) => p?.name || p?.phone) : [];
    } catch (error) {
        console.error('[settingsService] getServicePoints hatası:', error);

        return [];
    }
}
