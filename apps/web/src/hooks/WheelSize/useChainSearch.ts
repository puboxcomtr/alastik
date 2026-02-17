'use client';
import { useState, useCallback, useEffect } from 'react';
import { API_ENDPOINTS } from '@/src/config/api';

export function useChainSearch() {
    const [genislikler, setGenislikler] = useState<{ value: string }[]>([]);
    const [yanakOranlari, setYanakOranlari] = useState<{ value: string }[]>([]);
    const [jantCaplari, setJantCaplari] = useState<{ value: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedGenislik, setSelectedGenislik] = useState('');
    const [selectedYukseklik, setSelectedYukseklik] = useState('');
    const [selectedCap, setSelectedCap] = useState('');


    useEffect(() => {
        const fetchWidths = async () => {
            setLoading(true);
            try {
                const response = await fetch(API_ENDPOINTS.filters.chainOptions());
                const data = await response.json();

                if (data.success && data.widths) {
                    setGenislikler(data.widths);
                }
            } catch (error) {
                console.error('Genişlikler yüklenirken hata:', error);
                setGenislikler([
                    { value: '175' }, { value: '185' }, { value: '195' },
                    { value: '205' }, { value: '215' }, { value: '225' }
                ]);
            } finally {
                setLoading(false);
            }
        };

        fetchWidths();
    }, []);

    useEffect(() => {
        if (!selectedGenislik) {
            setYanakOranlari([]);
            return;
        }

        const fetchAspects = async () => {
            try {
                const response = await fetch(`${API_ENDPOINTS.filters.chainOptions()}?genislik=${selectedGenislik}`);
                const data = await response.json();
                if (data.success && data.aspects) {
                    setYanakOranlari(data.aspects);
                }
            } catch (error) {
                console.error('Yanaklar yüklenirken hata:', error);
                setYanakOranlari([]);
            }
        };

        fetchAspects();
    }, [selectedGenislik]);

    useEffect(() => {
        if (!selectedGenislik || !selectedYukseklik) {
            setJantCaplari([]);
            return;
        }

        const fetchRims = async () => {
            try {
                const response = await fetch(`${API_ENDPOINTS.filters.chainOptions()}?genislik=${selectedGenislik}&yanak=${selectedYukseklik}`);
                const data = await response.json();
                if (data.success && data.rims) {
                    setJantCaplari(data.rims);
                }
            } catch (error) {
                console.error('Jant çapları yüklenirken hata:', error);
                setJantCaplari([]);
            }
        };

        fetchRims();
    }, [selectedGenislik, selectedYukseklik]);

    const handleKarPaletiArama = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();

            if (!selectedGenislik || !selectedYukseklik || !selectedCap) {
                alert('Lütfen tüm alanları seçiniz');
                return;
            }

            const params = new URLSearchParams();
            params.set('genislik', selectedGenislik);
            params.set('yanak', selectedYukseklik);
            params.set('jant', selectedCap);

            const url = `/kategori/kar-paleti-ve-zinciri?${params.toString()}`;
            window.location.href = url;
        },
        [selectedGenislik, selectedYukseklik, selectedCap]
    );

    const handleAracaGoreArama = useCallback(() => {
        console.log('Araca göre kar paleti arama yakında eklenecek');
    }, []);

    return {
        genislikler,
        yanakOranlari,
        jantCaplari,
        selectedGenislik,
        setSelectedGenislik,
        selectedYukseklik,
        setSelectedYukseklik,
        selectedCap,
        setSelectedCap,
        handleKarPaletiArama,
        handleAracaGoreArama,
        loading
    };
}