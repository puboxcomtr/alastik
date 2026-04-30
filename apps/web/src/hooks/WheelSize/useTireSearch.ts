// apps/web/src/hooks/WheelSize/useTireSearch.ts
'use client';
import { useState, useCallback, useEffect } from "react";
import { buildTireSearchUrl, getSeasonSlugFromValue } from '@/src/config/routes';
import { API_ENDPOINTS } from '@/src/config/api';


export function useTireSearch() {
    const [mevsim, setMevsim] = useState("1");
    const [genislikler, setGenislikler] = useState<{ value: number }[]>([]);
    const [yanakOranlari, setYanakOranlari] = useState<{ value: number }[]>([]);
    const [jantCaplari, setJantCaplari] = useState<{ value: number }[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedGenislik, setSelectedGenislikRaw] = useState("205");
    const [selectedYukseklik, setSelectedYukseklikRaw] = useState("55");
    const [selectedCap, setSelectedCap] = useState("16");

    // Genişlik değişince yanak ve çapı sıfırla
    const setSelectedGenislik = useCallback((val: string) => {
        setSelectedGenislikRaw(val);
        setSelectedYukseklikRaw('');
        setSelectedCap('');
    }, []);

    // Yanak değişince çapı sıfırla
    const setSelectedYukseklik = useCallback((val: string) => {
        setSelectedYukseklikRaw(val);
        setSelectedCap('');
    }, []);


    // İlk yüklemede sadece genişlikleri çek
    useEffect(() => {
        const fetchGenislikler = async () => {
            setLoading(true);
            try {
                const res = await fetch(`${API_ENDPOINTS.lastik.kesitGenislikleri()}?regions=eudm`);
                const data = await res.json();
                if (data.basarili) {
                    setGenislikler(data.veri.map((item: any) => ({ value: item.value || item })));
                }
            } catch (error) {
                console.error('Genişlikler yüklenirken hata:', error);
                setGenislikler([
                    { value: 145 }, { value: 155 }, { value: 165 }, { value: 175 },
                    { value: 185 }, { value: 195 }, { value: 205 }, { value: 215 },
                    { value: 225 }, { value: 235 }, { value: 245 }, { value: 255 },
                    { value: 265 }, { value: 275 }, { value: 285 }, { value: 295 },
                    { value: 305 }, { value: 315 }
                ]);
            } finally {
                setLoading(false);
            }
        };
        fetchGenislikler();
    }, []);

    // Genişlik değişince yanak oranlarını çek + alt seçimleri sıfırla
    useEffect(() => {
        if (!selectedGenislik) {
            setYanakOranlari([]);
            setJantCaplari([]);
            return;
        }

        const fetchYanaklar = async () => {
            try {
                const res = await fetch(
                    `${API_ENDPOINTS.lastik.yanakOranlari()}?regions=eudm&section_width=${selectedGenislik}`
                );
                const data = await res.json();
                if (data.basarili) {
                    const list = data.veri.map((item: any) => ({ value: item.value || item }));
                    setYanakOranlari(list);

                    // Mevcut seçim listede yoksa sıfırla
                    if (selectedYukseklik && !list.find((y: any) => String(y.value) === String(selectedYukseklik))) {
                        setSelectedYukseklik('');
                    }
                }
            } catch (error) {
                console.error('Yanaklar yüklenirken hata:', error);
            }
        };
        fetchYanaklar();
    }, [selectedGenislik]);

    // Genişlik + yanak değişince çapları çek + alt seçimi sıfırla
    useEffect(() => {
        if (!selectedGenislik || !selectedYukseklik) {
            setJantCaplari([]);
            return;
        }

        const fetchCaplar = async () => {
            try {
                const res = await fetch(
                    `${API_ENDPOINTS.lastik.jantCaplari()}?regions=eudm&section_width=${selectedGenislik}&aspect_ratio=${selectedYukseklik}`
                );
                const data = await res.json();
                if (data.basarili) {
                    const list = data.veri.map((item: any) => ({ value: item.value || item }));
                    setJantCaplari(list);

                    if (selectedCap && !list.find((c: any) => String(c.value) === String(selectedCap))) {
                        setSelectedCap('');
                    }
                }
            } catch (error) {
                console.error('Çaplar yüklenirken hata:', error);
            }
        };
        fetchCaplar();
    }, [selectedGenislik, selectedYukseklik]);

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