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
 * Ürün ana kategorisini getir
 */
export const getCategory = (product: Product): string => {
    return product.diaData?.m_kategoriler?.[0]?.kategori_aciklama_2 || '-';
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
 * Ürün görsel URL'ini al (direkt URL için)
 */
export const getProductImageUrl = (url: string | null | undefined): string => {
    if (!url) return `${MEDIA_URL}/theme/katalog-gorseli.jpg`;
    if (url.startsWith('http')) return url;
    return `${MEDIA_URL}${url.startsWith('/') ? url : '/' + url}`;
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
        mevsim: getProductFeature(product, 'Mevsim'),
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
 * Rastgele ürünler getir
 */
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
/**
 * Ürün görsellerini al (customImages + featuredImage + m_resimler)
 */
export const getProductImages = (product: Product): Array<{ url: string; alt: string; order: number }> => {
    const images: Array<{ url: string; alt: string; order: number }> = [];
    const productName = product.customData?.seoTitle || product.diaData?.aciklama || 'Ürün';
    if (product.customData?.customImages && product.customData.customImages.length > 0) {
        product.customData.customImages.forEach((img) => {
            images.push({
                url: getProductImageUrl(img.url),
                alt: img.alt || productName,
                order: img.order
            });
        });
        return images.sort((a, b) => a.order - b.order);
    }
    if (product.customData?.featuredImage) {
        images.push({
            url: getProductImageUrl(product.customData.featuredImage),
            alt: productName,
            order: 0
        });
    }
    if (product.diaData?.m_resimler && product.diaData.m_resimler.length > 0) {
        product.diaData.m_resimler.forEach((img, index) => {
            if (img.aws_url !== product.customData?.featuredImage) {
                images.push({
                    url: getProductImageUrl(img.aws_url),
                    alt: productName,
                    order: parseInt(img.order_id || '999') || (index + 1)
                });
            }
        });
    }
    if (images.length === 0) {
        images.push({
            url: getProductImageUrl(null),
            alt: productName,
            order: 0
        });
    }

    return images.sort((a, b) => a.order - b.order);
};

/**
 * Ürün Tipi (ozelkod7kodu bazlı)
 */
export type ProductType = 'LASTIK' | 'JANT' | 'ZINCIR' | 'AKSESUAR' | 'GENEL';

/**
 * Ürün tipini belirle (Backend ile aynı mantık)
 * DİKKAT: Türkçe karakterler! LASTİK, ZİNCİR (Büyük İ)
 */
export const getProductType = (product: Product): ProductType => {
    const ozelkod7 = product?.diaData?.ozelkod7kodu;

    if (!ozelkod7) return 'GENEL';

    // Türkçe karakterlere dikkat! Büyük İ var
    switch (ozelkod7.toUpperCase()) {
        case 'LASTİK':
            return 'LASTIK';
        case 'JANT':
            return 'JANT';
        case 'ZİNCİR':
        case 'KAR ZİNCİRİ':
        case 'PALET':
            return 'ZINCIR';
        case 'AKSESUAR':
            return 'AKSESUAR';
        default:
            return 'GENEL';
    }
};

/**
 * Ürün tipi kontrol fonksiyonları
 */
export const isLastik = (product: Product): boolean => {
    return getProductType(product) === 'LASTIK';
};

export const isJant = (product: Product): boolean => {
    return getProductType(product) === 'JANT';
};

export const isZincir = (product: Product): boolean => {
    return getProductType(product) === 'ZINCIR';
};

export const isAksesuar = (product: Product): boolean => {
    return getProductType(product) === 'AKSESUAR';
};

/**
 * Ürün özelliklerini tip bazlı getir
 */
export interface ProductFeatureItem {
    label: string;
    value: string | number;
    isClickable?: boolean;
    tooltip?: string;
}
const getLastikEbat = (product: Product): string => {
    const genislik = getProductFeature(product, 'Genişlik');
    const yanak = getProductFeature(product, 'Yanak');
    const cap = getProductFeature(product, 'Jant Çapı');
    const yukEndeksi = getProductFeature(product, 'Yük Endeksi');
    const hizEndeksi = getProductFeature(product, 'Hız Endeksi');

    if (genislik === '-' || yanak === '-' || cap === '-') return '-';

    return `${genislik}/${yanak} ${cap} ${yukEndeksi}${hizEndeksi}`;
};
export const getProductDetailFeatures = (product: Product): ProductFeatureItem[] => {
    const type = getProductType(product);

    switch (type) {
        case 'LASTIK':
            return getLastikDetailFeatures(product);
        case 'JANT':
            return getJantDetailFeatures(product);
        case 'ZINCIR':
            return getZincirDetailFeatures(product);
        case 'AKSESUAR':
            return getAksesuarDetailFeatures(product);
        default:
            return getGenericFeatures(product);
    }
};
/**
 * Aynı desenin diğer ebatlarını getir
 */
export const fetchAlternativeSizes = async (product: Product, productName: string): Promise<Product[]> => {
    if (!product.diaData?.marka) return [];

    try {
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/products/filter?marka=${product.diaData.marka}&limit=50`
        );
        const data = await response.json();

        if (data.success && data.data?.products) {
            const currentName = productName.split(' ').slice(0, 2).join(' ');
            return data.data.products.filter((p: Product) => {
                const pName = (p.customData?.seoTitle || p.diaData?.aciklama || '')
                    .split(' ').slice(0, 2).join(' ');
                return pName === currentName && p._key !== product._key;
            });
        }
        return [];
    } catch (error) {
        console.error('Alternatif ebatlar yüklenemedi:', error);
        return [];
    }
};
/**
 * Hız endeksi ve maksimum hız bilgisini formatla
 */
export const getSpeedIndexDisplay = (speedIndex: string): string => {
    if (speedIndex === '-') return '-';

    const speedMap: Record<string, string> = {
        'L': '120 km/h',
        'M': '130 km/h',
        'N': '140 km/h',
        'Q': '160 km/h',
        'R': '170 km/h',
        'S': '180 km/h',
        'T': '190 km/h',
        'U': '200 km/h',
        'H': '210 km/h',
        'V': '240 km/h',
        'W': '270 km/h',
        'Y': '300 km/h',
        'ZR (Y)': '> 300 km/h',
        'ZR': '> 240 km/h'
    };

    const speed = speedMap[speedIndex.toUpperCase()];
    return speed ? `${speedIndex} (max. ${speed})` : speedIndex;
};
/**
 * Lastik özellikleri
 */
const getLastikDetailFeatures = (product: Product): ProductFeatureItem[] => {
    const genislik = getProductFeature(product, 'Genişlik');
    const yanak = getProductFeature(product, 'Yanak');
    const cap = getProductFeature(product, 'Jant Çapı');
    const yukEndeksi = getProductFeature(product, 'Yük Endeksi');
    const hizEndeksi = getProductFeature(product, 'Hız Endeksi');

    const ebat = (genislik !== '-' && yanak !== '-' && cap !== '-')
        ? `${genislik}/${yanak} ${cap} ${yukEndeksi}${hizEndeksi}`
        : '-';

    return [
        {
            label: 'Ebat',
            value: ebat,
            isClickable: true,
            tooltip: 'Lastik ebatı ve endeksleri. Tıklayarak bu desene ait diğer ebatları görebilirsiniz.'
        },
        {
            label: 'Hız Endeksi',
            value: getSpeedIndexDisplay(hizEndeksi),
            isClickable: false,
            tooltip: 'Lastiğin güvenli şekilde ulaşabileceği maksimum hızı gösterir.'
        },
        { label: 'Mevsim', value: getProductFeature(product, 'Mevsim') || product.diaData?.ozelkod1 || '-' },
        { label: 'Run Flat', value: getProductFeature(product, 'Run Flat') },
        { label: 'XL', value: getProductFeature(product, 'XL') },
        { label: 'OEM', value: getProductFeature(product, 'OEM') },
        { label: 'Üretim Yılı', value: product.diaData?.ekalan5 || getProductFeature(product, 'Üretim Tarihi') },
        { label: 'Stok Kodu', value: product.diaData?.stokkartkodu || '-' }
    ].filter(f => f.value && f.value !== '-' && f.value !== 'Hayır');
};

/**
 * Jant özellikleri
 */
const getJantDetailFeatures = (product: Product): ProductFeatureItem[] => {
    return [
        { label: 'Kategori', value: product.diaData?.m_kategoriler?.[0]?.kategori_aciklama_2 || '-' },
        { label: 'Jant Genişliği', value: getProductFeature(product, 'Jant Genişliği') },
        { label: 'Jant Çapı', value: getProductFeature(product, 'Jant Çapı') || product.diaData?.ozelkod4kodu || '-' },
        { label: 'Bijon Sayısı', value: getProductFeature(product, 'Bijon Sayısı') },
        { label: 'Bijon Aralığı (PCD)', value: getProductFeature(product, 'Bijon Aralığı') || product.diaData?.ozelkod3kodu || '-' },
        { label: 'Göbek Çapı', value: getProductFeature(product, 'Göbek Çapı') },
        { label: 'Offset (ET)', value: getProductFeature(product, 'ET') },
        { label: 'Renk', value: getProductFeature(product, 'Renk') },
        { label: 'Stok Kodu', value: product.diaData?.stokkartkodu || '-' }
    ].filter(f => f.value && f.value !== '-');
};

/**
 * Kar zinciri/palet özellikleri
 */
const getZincirDetailFeatures = (product: Product): ProductFeatureItem[] => {
    return [
        { label: 'Kategori', value: product.diaData?.m_kategoriler?.[0]?.kategori_aciklama_2 || '-' },
        { label: 'Uyumlu Lastik Genişliği', value: getProductFeature(product, 'Genişlik') || product.diaData?.ozelkod3kodu || '-' },
        { label: 'Uyumlu Jant Çapı', value: getProductFeature(product, 'Jant Çapı') || product.diaData?.ozelkod4kodu || '-' },
        { label: 'Tip', value: product.diaData?.ekalan2 || '-' },
        { label: 'Stok Kodu', value: product.diaData?.stokkartkodu || '-' }
    ].filter(f => f.value && f.value !== '-');
};

/**
 * Aksesuar özellikleri
 */
const getAksesuarDetailFeatures = (product: Product): ProductFeatureItem[] => {
    return [
        { label: 'Kategori', value: product.diaData?.m_kategoriler?.[0]?.kategori_aciklama_1 || '-' },
        { label: 'Marka', value: product.diaData?.marka || '-' },
        { label: 'Tip', value: product.diaData?.ekalan1 || '-' },
        { label: 'Stok Kodu', value: product.diaData?.stokkartkodu || '-' }
    ].filter(f => f.value && f.value !== '-');
};

/**
 * Generic özellikler (tip belirlenemezse)
 */
const getGenericFeatures = (product: Product): ProductFeatureItem[] => {
    return [
        { label: 'Kategori', value: product.diaData?.m_kategoriler?.[0]?.kategori_aciklama_1 || '-' },
        { label: 'Marka', value: product.diaData?.marka || '-' },
        { label: 'Stok Kodu', value: product.diaData?.stokkartkodu || '-' }
    ].filter(f => f.value && f.value !== '-');
};