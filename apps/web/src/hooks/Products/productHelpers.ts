// apps/web/src/hooks/Products/productHelpers.ts
import { Product } from '@src/types/products';
import { buildProductUrl } from '@src/config/routes';

const MEDIA_URL = process.env.NEXT_PUBLIC_MEDIA_URL || 'https://api.alastik.com';

/**
 * Ürün detay URL'ini oluştur
 */
export const getProductUrl = (product: Product): string => {
    return product.customData?.seoUrl
        ? buildProductUrl(product.customData.seoUrl)
        : buildProductUrl(product._key);
};

/**
 * Ürün özelliğini getir
 */
export const getProductFeature = (product: Product, featureName: string): string => {
    return product.diaData?.m_urunOzellikleri?.find(
        f => f.ozellikadi === featureName
    )?.detayaciklama || '-';
};

/**
 * Ürün fiyatını hesapla
 */
export const getProductPrice = (product: Product): number => {
    return product.customData?.webPrice ||
        product.diaData?.m_birimler?.[0]?.fiyat4 ||
        0;
};

/**
 * Ürün orijinal fiyatını hesapla (indirim öncesi)
 */
export const getProductOriginalPrice = (product: Product): number | undefined => {
    return product.customData?.originalPrice ||
        product.diaData?.m_birimler?.[0]?.fiyat1;
};

/**
 * Ürünün indirimde olup olmadığını kontrol et
 */
export const hasProductDiscount = (product: Product): boolean => {
    const price = getProductPrice(product);
    const originalPrice = getProductOriginalPrice(product);
    return !!originalPrice && originalPrice > price;
};

/**
 * URL'i normalize et (çift prefix önle)
 */
const normalizeUrl = (url: string): string => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${MEDIA_URL}${url.startsWith('/') ? url : '/' + url}`;
};
/**
 * Ürün görselini al
 * @param product - Ürün
 * @param defaultImage - Context'ten gelen default görsel
 */
export const getProductImage = (product: Product, defaultImage?: string): string => {
    if (product.customData?.featuredImage) {
        return normalizeUrl(product.customData.featuredImage);
    }
    
    if (defaultImage) {
        return normalizeUrl(defaultImage);
    }
    
    return `${MEDIA_URL}/theme/katalog-gorseli.jpg`;
};

/**
 * Ürün ebatını formatla
 */
export const getProductSize = (product: Product): string => {
    const genislik = getProductFeature(product, 'Genişlik');
    const yanak = getProductFeature(product, 'Yanak');
    const cap = getProductFeature(product, 'Jant Çapı');
    return `${genislik}/${yanak}${cap}`;
};

/**
 * Ürün özelliklerini toplu al
 */
export const getProductFeatures = (product: Product) => {
    return {
        genislik: getProductFeature(product, 'Genişlik'),
        yanak: getProductFeature(product, 'Yanak'),
        cap: getProductFeature(product, 'Jant Çapı'),
        yukEndeksi: getProductFeature(product, 'Yük Endeksi'),
        hizEndeksi: getProductFeature(product, 'Hız Endeksi'),
        uretimTarihi: getProductFeature(product, 'Üretim Tarihi'),
        ebat: getProductSize(product)
    };
};

/**
 * Ürün stok kodunu getir
 */
export const getProductStockCode = (product: Product): string => {
    return product.diaData?.anabarkod ||
        product.diaData?.stokkartkodu ||
        '-';
};
/**
 * Mevcut import'ların altına ekle 
 * */
export async function getRandomProducts(limit: number = 3) {
    try {
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/products/filter?limit=${limit}&random=true`,
            {
                cache: 'no-store',
                next: { revalidate: 0 }
            }
        );

        if (!response.ok) {
            console.error('Random products fetch failed:', response.status);
            return [];
        }

        const data = await response.json();
        return data.success && data.data?.products ? data.data.products : [];
    } catch (error) {
        console.error('Random products error:', error);
        return [];
    }
}
/**
 * Ürün mevsim bilgisini getir
 */
export const getProductSeason = (product: Product): { text: string; icon: string } | null => {
    const seasonFeature = product.diaData?.m_urunOzellikleri?.find(
        f => f.ozellikadi === 'Mevsim'
    );

    if (!seasonFeature || !seasonFeature.detayaciklama) {
        return null;
    }

    const season = seasonFeature.detayaciklama.trim();

    const seasonMap: Record<string, { text: string; icon: string }> = {
        'Kış': {
            text: 'Kış',
            icon: '/assets/icons/sezon-kis.svg'
        },
        'Yaz': {
            text: 'Yaz',
            icon: '/assets/icons/sezon-yaz.svg'
        },
        '4 Mevsim': {
            text: '4 Mevsim',
            icon: '/assets/icons/sezon-dort-mevsim.svg'
        }
    };

    return seasonMap[season] || null;
};