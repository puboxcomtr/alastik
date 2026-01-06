const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api';

export async function getProductReviews(productKey: string) {
    try {
        const res = await fetch(`${API_URL}/reviews/${productKey}`, {
            cache: 'no-store'
        });

        if (!res.ok) {
            throw new Error('Yorumlar yüklenemedi');
        }

        const data = await res.json();
        return data.success ? data.data : null;
    } catch (error) {
        console.error('Reviews fetch error:', error);
        return null;
    }
}