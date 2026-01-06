import { useState, useEffect } from 'react';
import type { Definition } from '@src/types/definition';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api';
const MEDIA_URL = process.env.NEXT_PUBLIC_MEDIA_URL || 'http://localhost:3082';

export const useDefinition = () => {
    const [definition, setDefinition] = useState<Definition | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchDefinition();
    }, []);

    const fetchDefinition = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_URL}/definition`, {
                cache: 'no-store'
            });

            if (!res.ok) {
                throw new Error('Site ayarları yüklenemedi');
            }

            const data = await res.json();

            if (data.success && data.data) {
                setDefinition(data.data);
            }
        } catch (err: any) {
            setError(err.message);
            console.error('Definition fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const getImageUrl = (path?: string) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        return `${MEDIA_URL}${path.startsWith('/') ? path : '/' + path}`;
    };

    return {
        definition,
        loading,
        error,
        getImageUrl,
        refetch: fetchDefinition
    };
};