// apps/web/src/hooks/WheelSize/useRimSearch.ts
'use client';
import { useState, useCallback, useEffect } from "react";
import { API_ENDPOINTS } from '@/src/config/api';

export function useRimSearch() {
    const [jantCaplari, setJantCaplari] = useState<{ value: string }[]>([]);
    const [bijonAraliklari, setBijonAraliklari] = useState<{ value: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedCap, setSelectedCap] = useState("");
    const [selectedBijon, setSelectedBijon] = useState("");

    useEffect(() => {
        const fetchRimSizes = async () => {
            setLoading(true);

            try {
                const res = await fetch(`${API_ENDPOINTS.filters.tireOptions()}?category=jant`, { cache: 'no-store' });
                const result = await res.json();

                if (result.success && result.data) {
                    setJantCaplari((result.data.jantCaplari || []).map((item: any) => ({
                        value: item.value
                    })));

                    setBijonAraliklari((result.data.bijonAraliklari || []).map((item: any) => ({
                        value: item.value
                    })));
                }

            } catch (error) {
                console.error('Jant ölçüleri yüklenirken hata:', error);
                setJantCaplari([]);
                setBijonAraliklari([]);
            } finally {
                setLoading(false);
            }
        };

        fetchRimSizes();
    }, []);

    // Ebata göre jant arama
    const handleJantArama = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();

            if (!selectedCap) {
                alert("Lütfen jant çapını seçiniz");
                return;
            }

            const params = new URLSearchParams();
            params.set('jantCap', selectedCap);

            if (selectedBijon) {
                params.set('bijon', selectedBijon);
            }

            const url = `/kategori/jant?${params.toString()}`;
            window.location.href = url;
        },
        [selectedCap, selectedBijon]
    );

    const handleAracaGoreArama = useCallback(() => {
        console.log("Araca göre jant arama yakında eklenecek");
    }, []);

    return {
        jantCaplari,
        bijonAraliklari,
        selectedCap,
        setSelectedCap,
        selectedBijon,
        setSelectedBijon,
        handleJantArama,
        handleAracaGoreArama,
        loading
    };
}