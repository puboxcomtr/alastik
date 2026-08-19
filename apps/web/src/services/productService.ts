// apps/web/src/services/productService.ts
import { API_ENDPOINTS, getServerSiteHeaders } from '@/src/config/api';
import type { ProductFilterParams, ProductFilterResponse } from '@src/types/products';

export async function filterProducts(params: ProductFilterParams): Promise<ProductFilterResponse | null> {
    try {
        const queryParams = new URLSearchParams();

        if (params.category === 'tum-lastikler') {
            queryParams.append('category', 'otomobil-lastikleri,elektrikli-arac-lastikleri,suv-lastikleri,ticari-arac-lastikleri,agir-vasita-lastikleri');
        } else if (params.category) {
            queryParams.append('category', params.category);
        }
        if (params.haricKategori) queryParams.append('haricKategori', params.haricKategori);
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
        if (params.jantCap) queryParams.append('jantCap', params.jantCap);
        if (params.bijon) queryParams.append('bijon', params.bijon);
        if (params.fiyatMin) queryParams.append('fiyatMin', params.fiyatMin.toString());
        if (params.fiyatMax) queryParams.append('fiyatMax', params.fiyatMax.toString());
        if (params.sortBy) queryParams.append('sortBy', params.sortBy);
        if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
        if (params.page) queryParams.append('page', params.page.toString());
        if (params.limit) queryParams.append('limit', params.limit.toString());

        const res = await fetch(`${API_ENDPOINTS.products.filter()}?${queryParams.toString()}`, {
            cache: 'no-store',
            next: { revalidate: 0 },
            // SSR'da aktif site API'ye iletilir; aksi halde varsayılan site çözülür
            headers: await getServerSiteHeaders()
        });

        if (!res.ok) return null;

        const result = await res.json();
        return result.success ? result.data : null;
    } catch (error) {
        console.error('[productService] filterProducts error:', error);
        return null;
    }
}

export async function getRandomProducts(limit: number = 10) {
    try {
        const res = await fetch(`${API_ENDPOINTS.products.filter()}?limit=${limit}`, {
            cache: 'no-store'
        });

        if (!res.ok) return [];

        const result = await res.json();
        return result.success && result.data?.products ? result.data.products : [];
    } catch (error) {
        console.error('[productService] getRandomProducts error:', error);
        return [];
    }
}

export async function getProductBySlug(slug: string) {
    try {
        const res = await fetch(API_ENDPOINTS.products.detail(slug), {
            cache: 'no-store',
            // SSR'da aktif site API'ye iletilir; aksi halde yalnızca LJAVM'de yayınlı ürünler 404 olur
            headers: await getServerSiteHeaders()
        });

        if (!res.ok) return null;

        const result = await res.json();
        return result.success ? result.data : null;
    } catch (error) {
        console.error('[productService] getProductBySlug error:', error);
        return null;
    }
}

export async function getProductWheelSize(slug: string) {
    try {
        const res = await fetch(API_ENDPOINTS.products.wheelSize(slug), {
            cache: 'no-store',
            headers: await getServerSiteHeaders()
        });

        if (!res.ok) return null;

        const result = await res.json();
        return result.success ? result.data : null;
    } catch (error) {
        console.error('[productService] getProductWheelSize error:', error);
        return null;
    }
}

export async function getCompatibleVehicles(width: number, aspectRatio: number, rimDiameter: number) {
    try {
        const res = await fetch(
            `${API_ENDPOINTS.wheelsize.byTire()}?width=${width}&aspect_ratio=${aspectRatio}&rim_diameter=${rimDiameter}`,
            { next: { revalidate: 3600 } }
        );

        if (!res.ok) return null;

        const result = await res.json();
        return result.success ? result.data : null;
    } catch (error) {
        console.error('[productService] getCompatibleVehicles error:', error);
        return null;
    }
}

export async function getRelatedBlogs(pattern: string): Promise<any[]> {
    if (!pattern) return [];

    try {
        const res = await fetch(API_ENDPOINTS.blogs.byPattern(pattern), {
            cache: 'no-store'
        });

        if (!res.ok) return [];

        const result = await res.json();
        return result.success ? result.data : [];
    } catch (error) {
        console.error('[productService] getRelatedBlogs error:', error);
        return [];
    }
}