// apps/web/src/hooks/Products/productHelpers.ts
import { Product } from '@src/types/products';
import { buildProductUrl } from '@src/config/routes';
import { API_ENDPOINTS, getImageUrl } from '@/src/config/api';

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
    return getImageUrl(url);
};
/**
 * Ürün görselini al
 * @param product - Ürün
 * @param defaultImage - Context'ten gelen default görsel
 */
export const getProductImage = (product: Product, defaultImage?: string): string => {
    // 1. customImages varsa ilk görseli kullan (web sıralaması)
    if (product.customData?.customImages && product.customData.customImages.length > 0) {
        const sorted = [...product.customData.customImages].sort((a, b) => a.order - b.order);
        if (sorted[0]?.url) {
            return normalizeUrl(sorted[0].url);
        }
    }
    // 2. featuredImage varsa kullan
    if (product.customData?.featuredImage) {
        return normalizeUrl(product.customData.featuredImage);
    }
    // 3. DIA görselleri
    if (product.diaData?.m_resimler && product.diaData.m_resimler.length > 0) {
        const firstImage = product.diaData.m_resimler
            .sort((a, b) => parseInt(a.order_id || '999') - parseInt(b.order_id || '999'))[0];
        if (firstImage?.aws_url) {
            return normalizeUrl(firstImage.aws_url);
        }
    }
    if (defaultImage) {
        return normalizeUrl(defaultImage);
    }

    return getImageUrl('/theme/katalog-gorseli.jpg');
};

/**
 * Ürün görsel URL'ini al (direkt URL için)
 */
export const getProductImageUrl = (url: string | null | undefined): string => {
    if (!url) return getImageUrl('/theme/katalog-gorseli.jpg');
    return getImageUrl(url);
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
    const code = product.diaData?.anabarkod ||
        product.diaData?.stokkartkodu ||
        '-';
    return code.replace(/-XMLA$/i, '');
};

/**
 * Rastgele ürünler getir
 */
export async function getRandomProducts(limit: number = 3) {
    try {
        const response = await fetch(
            `${API_ENDPOINTS.products.filter()}?limit=${limit}&random=true`,
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
 * Metni capitalize et (Baş harf büyük, geri kalanı küçük)
 */
export const capitalizeText = (text: string): string => {
    if (!text || text === '-') return text;
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};
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
    value: string | number | Array<{ text: string; tooltip: string }>;
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
export const fetchAlternativeSizes = async (product: Product): Promise<Product[]> => {
    const marka = product.diaData?.marka;
    const ozelkod5 = product.diaData?.ozelkod5kodu;

    if (!marka || !ozelkod5) return [];

    try {
        const response = await fetch(
            `${API_ENDPOINTS.products.filter()}?marka=${encodeURIComponent(marka)}&ozelkod5=${encodeURIComponent(ozelkod5)}&limit=50`
        );
        const data = await response.json();

        if (data.success && data.data?.products) {
            return data.data.products.filter((p: Product) => p._key !== product._key);
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
 * Yük endeksi ve maksimum ağırlık bilgisini formatla
 */
export const getLoadIndexDisplay = (loadIndex: string): string => {
    if (loadIndex === '-') return '-';

    const loadMap: Record<string, string> = {
        '70': '335 kg', '71': '345 kg', '72': '355 kg', '73': '365 kg', '74': '375 kg',
        '75': '387 kg', '76': '400 kg', '77': '412 kg', '78': '425 kg', '79': '437 kg',
        '80': '450 kg', '81': '462 kg', '82': '475 kg', '83': '487 kg', '84': '500 kg',
        '85': '515 kg', '86': '530 kg', '87': '545 kg', '88': '560 kg', '89': '580 kg',
        '90': '600 kg', '91': '615 kg', '92': '630 kg', '93': '650 kg', '94': '670 kg',
        '95': '690 kg', '96': '710 kg', '97': '730 kg', '98': '750 kg', '99': '775 kg',
        '100': '800 kg', '101': '825 kg', '102': '850 kg', '103': '875 kg', '104': '900 kg',
        '105': '925 kg', '106': '950 kg', '107': '975 kg', '108': '1000 kg', '109': '1030 kg',
        '110': '1060 kg', '111': '1090 kg', '112': '1120 kg', '113': '1150 kg', '114': '1180 kg',
        '115': '1215 kg', '116': '1250 kg', '117': '1285 kg', '118': '1320 kg', '119': '1360 kg',
        '120': '1400 kg'
    };

    const load = loadMap[loadIndex];
    return load ? `${loadIndex} (${load})` : loadIndex;
};
/**
 * Ürün kartı hover detayları için özellikleri getir (Lastik/Jant)
 */
export const getCardHoverFeatures = (product: Product): Array<{ label: string; value: string }> => {
    const type = getProductType(product);

    if (type === 'JANT') {
        return [
            { label: 'Bijon Sayısı', value: getProductFeature(product, 'Bijon Sayısı') },
            { label: 'Bijon Aralığı', value: getProductFeature(product, 'Bijon Aralığı') || product.diaData?.ozelkod3kodu || '-' },
            { label: 'Jant Çapı', value: getProductFeature(product, 'Jant Çapı') || product.diaData?.ozelkod4kodu || '-' }
        ].filter(f => f.value && f.value !== '-');
    }

    // Lastik (varsayılan)
    const { ebat, yukEndeksi, hizEndeksi, uretimTarihi } = getProductFeatures(product);
    return [
        { label: 'Ebat', value: ebat },
        { label: 'Yük Endeksi', value: yukEndeksi },
        { label: 'Hız Endeksi', value: hizEndeksi },
        { label: 'Üretim Tarihi', value: uretimTarihi }
    ].filter(f => f.value && f.value !== '-');
};
/**
 * Tüm lastik özelliklerini detaylı getir (Description için)
 */
export const getAllLastikFeatures = (product: Product): Array<{ label: string; value: string }> => {
    const genislik = getProductFeature(product, 'Genişlik');
    const yanak = getProductFeature(product, 'Yanak');
    const cap = getProductFeature(product, 'Jant Çapı');
    const yukEndeksi = getProductFeature(product, 'Yük Endeksi');
    const hizEndeksi = getProductFeature(product, 'Hız Endeksi');
    const ebat = (genislik !== '-' && yanak !== '-' && cap !== '-')
        ? `${genislik}/${yanak} ${cap}`
        : '-';

    const xl = getProductFeature(product, 'XL');
    const runFlat = getProductFeature(product, 'Run Flat');
    const seal = getProductFeature(product, 'Seal');
    const oem = getProductFeature(product, 'OEM');

    const ekstraOzellikler: string[] = [];
    if (xl.toLowerCase() === 'evet') ekstraOzellikler.push('XL');
    if (runFlat.toLowerCase() === 'evet') ekstraOzellikler.push('Run Flat');
    if (seal.toLowerCase() === 'evet') ekstraOzellikler.push('Seal');
    if (oem !== '-' && oem.toLowerCase() !== 'hayır') ekstraOzellikler.push(`OEM: ${oem}`);

    return [
        { label: 'Stok Kodu', value: getProductStockCode(product) },
        { label: 'Ürün Tipi', value: capitalizeText(product.diaData?.ozelkod7kodu || '-') },
        { label: 'Araç Tipi', value: getProductFeature(product, 'Araç Tipi') },
        { label: 'Marka', value: capitalizeText(product.diaData?.marka || '-') },
        { label: 'Model', value: product.diaData?.ozelkod5 || product.diaData?.ozelkod5kodu || '-' },
        { label: 'Mevsim', value: getProductFeature(product, 'Mevsim') },
        { label: 'Ebat', value: ebat },
        { label: 'Yük Endeksi', value: getLoadIndexDisplay(yukEndeksi) },
        { label: 'Hız Endeksi', value: getSpeedIndexDisplay(hizEndeksi) },
        { label: 'Ekstra Özellikler', value: ekstraOzellikler.length > 0 ? ekstraOzellikler.join(', ') : '-' },
        { label: 'Üretim Tarihi (DOT)', value: product.diaData?.ekalan5 || getProductFeature(product, 'Üretim Tarihi') },
        { label: 'Garanti Süresi', value: product.customData?.warranty || '2 Yıl' },
        { label: 'Yakıt Verimliliği', value: getProductFeature(product, 'Yakıt Verimliliği') },
        { label: 'Islak Zeminde Frenleme', value: getProductFeature(product, 'Islak Zeminde Frenleme') },
        { label: 'Gürültü Seviyesi', value: `${getProductFeature(product, 'Gürültü Seviyesi')} dB` }
    ].filter(f => f.value && f.value !== '-');
};

/**
 * Tüm jant özelliklerini detaylı getir (Description için)
 */
export const getAllJantFeatures = (product: Product): Array<{ label: string; value: string }> => {
    return [
        { label: 'Stok Kodu', value: getProductStockCode(product) },
        { label: 'Ürün Tipi', value: capitalizeText(product.diaData?.ozelkod7kodu || '-') },
        { label: 'Marka', value: capitalizeText(product.diaData?.marka || '-') },
        { label: 'Model', value: product.diaData?.ozelkod5 || product.diaData?.ozelkod5kodu || '-' },
        { label: 'Jant Genişliği', value: getProductFeature(product, 'Jant Genişliği') },
        { label: 'Bijon Sayısı', value: getProductFeature(product, 'Bijon Sayısı') },
        { label: 'Bijon Aralığı (PCD)', value: getProductFeature(product, 'Bijon Aralığı') || product.diaData?.ozelkod3kodu || '-' },
        { label: 'Jant Çapı', value: getProductFeature(product, 'Jant Çapı') || product.diaData?.ozelkod4kodu || '-' },
        { label: 'Göbek Çapı', value: getProductFeature(product, 'Göbek Çapı') },
        { label: 'ET (Offset)', value: getProductFeature(product, 'ET') },
        { label: 'Renk', value: getProductFeature(product, 'Renk') }
    ].filter(f => f.value && f.value !== '-');
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

    const ozelOzellikler: Array<{ text: string; tooltip: string }> = [];
    if (getProductFeature(product, 'Run Flat').toLowerCase() === 'evet') {
        ozelOzellikler.push({
            text: 'RFT',
            tooltip: 'Run Flat Technology - Patlamaya karşı güvenli lastik teknolojisi'
        });
    }
    if (getProductFeature(product, 'XL').toLowerCase() === 'evet') {
        ozelOzellikler.push({
            text: 'XL',
            tooltip: 'Extra Load - Yüksek yük taşıma kapasitesi'
        });
    }
    if (getProductFeature(product, 'Seal').toLowerCase() === 'evet') {
        ozelOzellikler.push({
            text: 'Seal',
            tooltip: 'Self-Sealing - Kendi kendini onarma teknolojisi'
        });
    }

    const oem = getProductFeature(product, 'OEM');
    if (oem !== '-' && oem.toLowerCase() !== 'hayır') {
        ozelOzellikler.push({
            text: oem,
            tooltip: 'Orijinal Ekipman Üreticisi onaylı lastik'
        });
    }

    return [
        { label: 'Stok Kodu', value: getProductStockCode(product) },
        {
            label: 'Ebat',
            value: ebat,
            isClickable: (() => {
                const model = product.diaData?.ozelkod5 || '';
                const modelKodu = product.diaData?.ozelkod5kodu || '';
                return model.toLowerCase() !== 'yok' && modelKodu.toLowerCase() !== 'yok' && !!modelKodu;
            })(),
            tooltip: 'Taban Genişliği - Yanak Yüksekliği - Jant Çapı'
        },
        {
            label: 'Hız Endeksi',
            value: getSpeedIndexDisplay(hizEndeksi),
            isClickable: false,
            tooltip: 'Lastiğin güvenli şekilde ulaşabileceği maksimum hızı gösterir'
        },
        {
            label: 'Yük Endeksi',
            value: getLoadIndexDisplay(yukEndeksi),
            isClickable: false,
            tooltip: 'Lastiğin güvenli bir şekilde taşıyabileceği maksimum ağırlığı gösterir'
        },
        {
            label: 'Ekstra Özellikler',
            value: ozelOzellikler,
            color: '#f2223b'
        },
        { label: 'Üretim Tarihi (DOT)', value: product.diaData?.ekalan5 || getProductFeature(product, 'Üretim Tarihi') }
    ].filter(f => {
        if (Array.isArray(f.value)) return f.value.length > 0;
        return f.value && f.value !== '-' && f.value !== 'Hayır';
    });
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
        { label: 'Stok Kodu', value: getProductStockCode(product) }
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
        { label: 'Stok Kodu', value: getProductStockCode(product) }
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
        { label: 'Stok Kodu', value: getProductStockCode(product) }
    ].filter(f => f.value && f.value !== '-');
};

/**
 * Generic özellikler (tip belirlenemezse)
 */
const getGenericFeatures = (product: Product): ProductFeatureItem[] => {
    return [
        { label: 'Kategori', value: product.diaData?.m_kategoriler?.[0]?.kategori_aciklama_1 || '-' },
        { label: 'Marka', value: product.diaData?.marka || '-' },
        { label: 'Stok Kodu', value: getProductStockCode(product) }
    ].filter(f => f.value && f.value !== '-');
};

/**
 * Modal Helper
 */

/**
 * Lastik ebatını formatla (modal için)
 */
export const getLastikEbatDisplay = (product: Product): string => {
    const genislik = getProductFeature(product, 'Genişlik');
    const yanak = getProductFeature(product, 'Yanak');
    const cap = getProductFeature(product, 'Jant Çapı');
    const yukEndeksi = getProductFeature(product, 'Yük Endeksi');
    const hizEndeksi = getProductFeature(product, 'Hız Endeksi');

    if (genislik === '-' || yanak === '-' || cap === '-') return '-';

    return `${genislik}/${yanak} ${cap} ${yukEndeksi}${hizEndeksi}`;
};

/**
 * Marka + Model (ozelkod5kodu)
 */
export const getBrandModel = (product: Product): string => {
    const marka = product.diaData?.marka || '';
    const model = product.diaData?.ozelkod5kodu || '';
    return `${marka} ${model}`.trim();
};

/**
 * Fiyat2 (orijinal fiyat)
 */
export const getProductPrice2 = (product: Product): number | null => {
    return product.diaData?.m_birimler?.[0]?.fiyat2 || null;
};

/**
 * Teslimat tarih aralığını hesapla
 */
export const getDeliveryDateRange = (product: Product): {
    startDate: string;
    endDate: string
} | null => {
    const delivery = product.customData?.delivery;
    if (!delivery) return null;

    const today = new Date();

    const formatDate = (date: Date): string => {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        return `${day}.${month}`;
    };

    const addDays = (date: Date, days: number): Date => {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    };

    switch (delivery) {
        case 'same_day':
            return {
                startDate: formatDate(today),
                endDate: formatDate(addDays(today, 1))
            };
        case 'next_day':
            return {
                startDate: formatDate(addDays(today, 1)),
                endDate: formatDate(addDays(today, 2))
            };
        case 'next_week':
            return {
                startDate: formatDate(addDays(today, 6)),
                endDate: formatDate(addDays(today, 7))
            };
        default:
            return null;
    }
};
