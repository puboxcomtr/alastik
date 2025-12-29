// apps/web/src/services/productService.ts
import { api } from '@lib/api';
import type { ProductFilterParams, ProductFilterResponse } from '@src/types/products';

export async function filterProducts(params: ProductFilterParams): Promise<ProductFilterResponse | null> {
    try {
        const queryParams = new URLSearchParams();

        if (params.category) queryParams.append('category', params.category);
        if (params.genislik) queryParams.append('genislik', params.genislik);
        if (params.yukseklik) queryParams.append('yukseklik', params.yukseklik);
        if (params.cap) queryParams.append('cap', params.cap);
        if (params.arac) queryParams.append('arac', params.arac);
        if (params.marka) queryParams.append('marka', params.marka);
        if (params.oem) queryParams.append('oem', params.oem);
        if (params.mevsim) queryParams.append('mevsim', params.mevsim);
        if (params.ozellik) queryParams.append('ozellik', params.ozellik);
        if (params.yukEndeksi) queryParams.append('yukEndeksi', params.yukEndeksi);
        if (params.hizEndeksi) queryParams.append('hizEndeksi', params.hizEndeksi);
        if (params.uretim) queryParams.append('uretim', params.uretim);
        // Jant parametreleri
        if (params.jantCap) queryParams.append('jantCap', params.jantCap);
        if (params.bijon) queryParams.append('bijon', params.bijon);
        if (params.fiyatMin) queryParams.append('fiyatMin', params.fiyatMin.toString());
        if (params.fiyatMin) queryParams.append('fiyatMin', params.fiyatMin.toString());
        if (params.fiyatMax) queryParams.append('fiyatMax', params.fiyatMax.toString());
        if (params.page) queryParams.append('page', params.page.toString());
        if (params.limit) queryParams.append('limit', params.limit.toString());

        const url = `/products/filter?${queryParams.toString()}`;
        const result = await api.get<ProductFilterResponse>(url);
        return result.success && result.data ? result.data : null;
    } catch (error) {
        return null;
    }
}

export async function getRandomProducts(limit: number = 10) {
    try {
        const url = `/products/filter?limit=${limit}`;
        const result = await api.get<ProductFilterResponse>(url);
        return result.success && result.data?.products ? result.data.products : [];
    } catch (error) {
        return [];
    }
}

/**
 * Ürün detayı - slug ile getir
 */
export async function getProductBySlug(slug: string): Promise<Product | null> {
    try {
        const result = await api.get<{ success: boolean; data: Product | null }>(`/products/${encodeURIComponent(slug)}`);
        return result.success ? result.data : null;
    } catch (error) {
        console.error('Ürün yükleme hatası:', error);
        return null;
    }
}
/**
 * Ürün detayı - Wheelsize Verileri
 */
export async function getProductWheelSize(slug: string) {
    try {
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/products/${slug}/wheelsize`,
            { cache: 'no-store' }
        );
        const data = await response.json();
        return data.success ? data.data : null;
    } catch (error) {
        console.error('WheelSize fetch error:', error);
        return null;
    }
}