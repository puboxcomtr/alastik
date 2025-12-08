// apps/web/src/services/themeService.ts
import type { ThemeSettings } from '@/src/types/theme';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api';
const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3082';

export async function getThemeSettings(): Promise<ThemeSettings> {
    try {
        const response = await fetch(`${API_BASE_URL}/theme`, {
            cache: 'no-store',
            next: { revalidate: 0 }
        });

        if (!response.ok) {
            throw new Error('Theme settings fetch failed');
        }

        const data = await response.json();
        return data.success && data.data ? data.data : getDefaultThemeSettings();
    } catch (error) {
        console.error('❌ Theme settings error:', error);
        return getDefaultThemeSettings();
    }
}

// Default ayarlar (fallback)
function getDefaultThemeSettings(): ThemeSettings {
    return {
        defaultCatalogImage: '/assets/img/shop/default-product.jpg',
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

// Image URL helper
export function getImageUrl(path?: string): string {
    if (!path) return '/assets/img/shop/default-product.jpg';
    if (path.startsWith('http')) return path;
    if (path.startsWith('/')) return `${BASE_URL}${path}`;
    return `${BASE_URL}/${path}`;
}