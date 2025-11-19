import type { Slider } from '@/src/types/slider';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api';

export async function getSliderById(id: string): Promise<Slider | null> {
    try {
        if (!id) {
            console.warn('Slider ID boş');
            return null;
        }

        const response = await fetch(`${API_BASE_URL}/design/slider/${id}`, {
            cache: 'no-store',
            next: { revalidate: 0 }
        });

        if (!response.ok) {
            console.error('Slider fetch failed:', response.status);
            return null;
        }

        const data = await response.json();
        return data.success && data.data ? data.data : null;
    } catch (error) {
        console.error('❌ Slider error:', error);
        return null;
    }
}