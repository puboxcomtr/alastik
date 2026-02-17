import { useState, useEffect } from 'react';
import type { Definition } from '@src/types/definition';
import { API_ENDPOINTS, getImageUrl as apiGetImageUrl } from '@/src/config/api';

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
            const res = await fetch(API_ENDPOINTS.definition.get(), {
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
        return apiGetImageUrl(path);
    };

    return {
        definition,
        loading,
        error,
        getImageUrl,
        refetch: fetchDefinition
    };
};