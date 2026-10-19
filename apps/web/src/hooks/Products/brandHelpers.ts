import type { Brand } from '@/src/types/brand';
import { getBrandImageUrl } from '@/src/services/brandService';

export interface BrandDisplayResult {
    hasLogo: boolean;
    display: string;
    logo: string | null;
    name: string;
}

export const formatBrandName = (name: string): string => {
    if (!name) return '';
    return name
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

export const normalizeForSearch = (text: string): string => {
    if (!text) return '';
    return text
        .toLowerCase()
        .replace(/İ/g, 'i')
        .replace(/I/g, 'ı')
        .replace(/ı/gi, 'i')
        .replace(/ş/gi, 's')
        .replace(/ğ/gi, 'g')
        .replace(/ü/gi, 'u')
        .replace(/ö/gi, 'o')
        .replace(/ç/gi, 'c');
};

export const getBrandDisplay = (
    brand: Brand | null,
    fallbackName?: string
): BrandDisplayResult => {
    if (!brand) {
        return {
            hasLogo: false,
            display: fallbackName ? formatBrandName(fallbackName) : 'Marka Bilgisi Yok',
            logo: null,
            name: fallbackName ? formatBrandName(fallbackName) : ''
        };
    }

    const logoUrl = brand.logo ? getBrandImageUrl(brand.logo) : null;
    const formattedName = formatBrandName(brand.name);

    return {
        hasLogo: !!brand.logo,
        display: formattedName,
        logo: logoUrl,
        name: formattedName
    };
};