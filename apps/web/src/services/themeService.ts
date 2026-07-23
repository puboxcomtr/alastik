// apps/web/src/services/themeService.ts
// apps/web/src/services/themeService.ts
import { API_ENDPOINTS, getImageUrl as baseGetImageUrl } from '@/src/config/api';
import type { ThemeSettings } from '@/src/types/theme';

export async function getThemeSettings(site?: string): Promise<ThemeSettings> {
    try {
        const response = await fetch(API_ENDPOINTS.theme.get(), {
            cache: 'no-store',
            next: { revalidate: 0 },
            headers: site ? { 'X-Site': site } : undefined
        });

        if (!response.ok) {
            throw new Error('Theme settings fetch failed');
        }

        const data = await response.json();
        return data.success && data.data ? data.data : getDefaultThemeSettings();
    } catch (error) {
        console.error('[themeService] getThemeSettings hatası:', error);
        return getDefaultThemeSettings();
    }
}

function getDefaultThemeSettings(): ThemeSettings {
    return {
        defaultCatalogImage: '/alastik/assets/img/shop/default-product.jpg',
        brandDisplayType: 'image',
        showcaseDisplayCount: '4',
        blogDisplayCount: '6',
        isActive: true,
        isBrand: false,
        isTax: true,
        isLazyLoad: false,
        footerMobile: 'list',
        homepage: true,
        autostart: true
    };
}

export function getImageUrl(path?: string): string {
    if (!path) return '/alastik/assets/img/shop/default-product.jpg';
    return baseGetImageUrl(path);
}