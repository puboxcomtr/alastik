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