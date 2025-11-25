import type { Slider } from '@/src/types/slider';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api';
const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3082';

/**
 * ID ile slider getir (mevcut - dropdown sistemi için)
 */
export async function getSliderById(id: string): Promise<Slider | null> {
    try {
        if (!id) {
            console.warn('Slider ID bos');
            return null;
        }

        const response = await fetch(`${API_BASE_URL}/admin/design/slider/${id}`, {
            next: { revalidate: 3600 }
        });

        if (!response.ok) {
            console.error('Slider fetch failed:', response.status);
            return null;
        }

        const data = await response.json();
        return data.success && data.data ? data.data : null;
    } catch (error) {
        console.error('Slider error:', error);
        return null;
    }
}

/**
 * Key ile slider getir (yeni - placeholder sistemi için)
 */
export async function getSliderByKey(key: string): Promise<Slider | null> {
    try {
        if (!key) {
            console.warn('Slider key bos');
            return null;
        }

        const response = await fetch(`${API_BASE_URL}/admin/design/slider/key/${key}`, {
            next: { revalidate: 3600 }
        });

        if (!response.ok) {
            console.error('Slider key fetch failed:', response.status);
            return null;
        }

        const data = await response.json();
        return data.success && data.data ? data.data : null;
    } catch (error) {
        console.error('Slider key error:', error);
        return null;
    }
}

/**
 * Slider görsel URL helper
 */
export function getSliderImageUrl(url: string | null | undefined): string {
    if (!url) return '/images/slider/gorsel-bulunamadi.jpg';
    if (url.startsWith('http')) return url;
    return url.startsWith('/') ? `${BASE_URL}${url}` : `${BASE_URL}/${url}`;
}