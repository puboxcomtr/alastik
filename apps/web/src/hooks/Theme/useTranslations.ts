'use client';

import { useState, useEffect } from 'react';
import { api } from '@lib/api';

export function useTranslations(category?: string) {
    const [translations, setTranslations] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTranslations = async () => {
            try {
                const result = await api.getTranslations(category);
                if (result.success && result.data) {
                    setTranslations(result.data);
                }
            } catch (error) {
                console.error('Translation fetch error:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTranslations();
    }, [category]);

    const t = (key: string, defaultValue: string = key) => {
        return translations[key] || defaultValue;
    };

    return { t, translations, loading };
}