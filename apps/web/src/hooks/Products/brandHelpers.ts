// apps/web/src/hooks/Products/brandHelpers.ts
import type { Brand } from '@/src/types/brand';
import { getBrandImageUrl } from '@/src/services/brandService';

export interface BrandDisplayResult {
    hasLogo: boolean;
    display: string;
    logo: string | null;
    name: string;
}

/**
 * Marka logosunu veya ismini döndür
 */
export const getBrandDisplay = (
    brand: Brand | null,
    fallbackName?: string
): BrandDisplayResult => {
    if (!brand) {
        return {
            hasLogo: false,
            display: fallbackName || 'Marka Bilgisi Yok',
            logo: null,
            name: fallbackName || ''
        };
    }

    const logoUrl = brand.logo ? getBrandImageUrl(brand.logo) : null;

    return {
        hasLogo: !!brand.logo,
        display: brand.name,
        logo: logoUrl,
        name: brand.name
    };
};