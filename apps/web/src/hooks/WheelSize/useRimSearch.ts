// apps/web/src/hooks/WheelSize/useRimSearch.ts
'use client';
import { useState, useCallback, useEffect } from "react";

export function useRimSearch() {
    const [jantCaplari, setJantCaplari] = useState<{ value: string }[]>([]);
    const [bijonAraliklari, setBijonAraliklari] = useState<{ value: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedCap, setSelectedCap] = useState("");
    const [selectedBijon, setSelectedBijon] = useState("");

    const getApiUrl = () => {
        if (typeof window !== 'undefined') {
            return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api';
        }
        return 'http://localhost:3082/api';
    };

    useEffect(() => {
        const fetchRimSizes = async () => {
            setLoading(true);
            const apiUrl = getApiUrl();

            try {
                const [capResponse, bijonResponse] = await Promise.all([
                    fetch(`${apiUrl}/jant/caplar?regions=eudm`),
                    fetch(`${apiUrl}/jant/vida-sablonlari?regions=eudm`)
                ]);

                const capData = await capResponse.json();
                const bijonData = await bijonResponse.json();

                if (capData.basarili) {
                    setJantCaplari(capData.veri.map((item: any) => ({
                        value: item.value?.toString() || item.toString()
                    })));
                }

                if (bijonData.basarili) {
                    setBijonAraliklari(bijonData.veri.map((item: any) => ({
                        value: item.pcd || item.value || item.toString()
                    })));
                }

            } catch (error) {
                console.error('Jant ölçüleri yüklenirken hata:', error);

                // Fallback
                setJantCaplari([
                    { value: '14' }, { value: '15' }, { value: '16' }, { value: '17' },
                    { value: '18' }, { value: '19' }, { value: '20' }, { value: '21' },
                    { value: '22' }
                ]);

                setBijonAraliklari([
                    { value: '4x100' }, { value: '4x108' }, { value: '5x100' },
                    { value: '5x108' }, { value: '5x112' }, { value: '5x114.3' },
                    { value: '5x120' }, { value: '5x130' }
                ]);
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