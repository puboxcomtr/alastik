// apps/web/src/hooks/WheelSize/useTireSearch.ts
'use client';
import { useState, useCallback, useEffect } from "react";
import { buildTireSearchUrl, getSeasonSlugFromValue } from '@/src/config/routes';

export function useTireSearch() {
    const [mevsim, setMevsim] = useState("1");
    const [genislikler, setGenislikler] = useState<{ value: number }[]>([]);
    const [yanakOranlari, setYanakOranlari] = useState<{ value: number }[]>([]);
    const [jantCaplari, setJantCaplari] = useState<{ value: number }[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedGenislik, setSelectedGenislik] = useState("205");
    const [selectedYukseklik, setSelectedYukseklik] = useState("55");
    const [selectedCap, setSelectedCap] = useState("16");

    const getApiUrl = () => {
        if (typeof window !== 'undefined') {
            return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api';
        }
        return 'http://localhost:3082/api';
    };

    useEffect(() => {
        const fetchTireSizes = async () => {
            setLoading(true);
            const apiUrl = getApiUrl();

            try {
                const [genislikResponse, yanakResponse, capResponse] = await Promise.all([
                    fetch(`${apiUrl}/lastik/kesit-genislikleri?regions=eudm`),
                    fetch(`${apiUrl}/lastik/yanak-oranlari?regions=eudm`),
                    fetch(`${apiUrl}/lastik/jant-caplari?regions=eudm`)
                ]);

                const genislikData = await genislikResponse.json();
                const yanakData = await yanakResponse.json();
                const capData = await capResponse.json();

                if (genislikData.basarili) {
                    setGenislikler(genislikData.veri.map((item: any) => ({ value: item.value || item })));
                }

                if (yanakData.basarili) {
                    setYanakOranlari(yanakData.veri.map((item: any) => ({ value: item.value || item })));
                }

                if (capData.basarili) {
                    setJantCaplari(capData.veri.map((item: any) => ({ value: item.value || item })));
                }

            } catch (error) {
                console.error('Lastik ölçüleri yüklenirken hata:', error);

                // Fallback
                setGenislikler([
                    { value: 145 }, { value: 155 }, { value: 165 }, { value: 175 },
                    { value: 185 }, { value: 195 }, { value: 205 }, { value: 215 },
                    { value: 225 }, { value: 235 }, { value: 245 }, { value: 255 },
                    { value: 265 }, { value: 275 }, { value: 285 }, { value: 295 },
                    { value: 305 }, { value: 315 }
                ]);

                setYanakOranlari([
                    { value: 30 }, { value: 35 }, { value: 40 }, { value: 45 },
                    { value: 50 }, { value: 55 }, { value: 60 }, { value: 65 },
                    { value: 70 }, { value: 75 }, { value: 80 }
                ]);

                setJantCaplari([
                    { value: 13 }, { value: 14 }, { value: 15 }, { value: 16 },
                    { value: 17 }, { value: 18 }, { value: 19 }, { value: 20 },
                    { value: 21 }, { value: 22 }
                ]);
            } finally {
                setLoading(false);
            }
        };

        fetchTireSizes();
    }, []);

    // Janta göre arama
    const handleJantaGoreArama = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();

            if (!selectedGenislik || !selectedYukseklik || !selectedCap) {
                alert("Lütfen tüm alanları doldurunuz");
                return;
            }

            // Mevsim → Kategori slug
            const categorySlug = getSeasonSlugFromValue(mevsim);

            // URL oluştur
            const url = buildTireSearchUrl(
                categorySlug,
                selectedGenislik,
                selectedYukseklik,
                selectedCap
            );

            window.location.href = url;
        },
        [mevsim, selectedGenislik, selectedYukseklik, selectedCap]
    );

    const handleAracaGoreArama = useCallback(() => {
        console.log("Araça göre arama yakında eklenecek");
    }, []);

    return {
        mevsim,
        setMevsim,
        genislikler,
        yanakOranlari,
        jantCaplari,
        selectedGenislik,
        setSelectedGenislik,
        selectedYukseklik,
        setSelectedYukseklik,
        selectedCap,
        setSelectedCap,
        handleJantaGoreArama,
        handleAracaGoreArama,
        loading
    };
}