// apps/web/src/hooks/Products/brandHelpers.ts
import type { Brand } from '@/src/types/brand';

/**
 * Marka logosunu veya ismini döndür
 * @param brand - Marka bilgisi
 * @param fallbackName - Logo yoksa gösterilecek isim
 */
export const getBrandDisplay = (brand: Brand | null, fallbackName?: string) => {
    if (!brand) {
        return {
            hasLogo: false,
            display: fallbackName || 'Marka Bilgisi Yok',
            logo: null
        };
    }

    return {
        hasLogo: !!brand.logo,
        display: brand.logo ? brand.logo : brand.name,
        logo: brand.logo,
        name: brand.name
    };
};