const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api';

export async function getDefinition() {
    try {
        const res = await fetch(`${API_URL}/definition`, {
            cache: 'no-store',
            next: { revalidate: 3600 } // 1 saat cache
        });

        if (!res.ok) {
            throw new Error('Definition yüklenemedi');
        }

        const data = await res.json();
        return data.success ? data.data : null;
    } catch (error) {
        console.error('Definition fetch error:', error);
        return null;
    }
}