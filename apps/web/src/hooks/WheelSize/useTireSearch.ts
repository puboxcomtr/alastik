'use client';
import { useState, useEffect, useCallback } from "react";
import { wheelSizeApi } from "@src/lib/wheel-size-api";

interface AracAramaData {
    marka: string;
    model: string;
    yil: string;
    modifikasyon?: string;
}

export function useTireSearch() {
    const [mevsim, setMevsim] = useState("1");
    const [genislikler, setGenislikler] = useState<{ value: number; total: number }[]>([]);
    const [yanakOranlari, setYanakOranlari] = useState<{ value: number; total: number }[]>([]);
    const [jantCaplari, setJantCaplari] = useState<{ value: number; total: number }[]>([]);

    const [selectedGenislik, setSelectedGenislik] = useState("205");
    const [selectedYukseklik, setSelectedYukseklik] = useState("55");
    const [selectedCap, setSelectedCap] = useState("16");

    // Ölçüleri yükle
    const loadLastikOlculeri = useCallback(async () => {
        try {
            const [genislikResponse, yanakResponse, capResponse] = await Promise.all([
                wheelSizeApi.lastik.kesitGenislikleri(),
                wheelSizeApi.lastik.yanakOranlari(),
                wheelSizeApi.lastik.jantCaplari(),
            ]);

            if (genislikResponse.basarili && genislikResponse.veri) setGenislikler(genislikResponse.veri);
            if (yanakResponse.basarili && yanakResponse.veri) setYanakOranlari(yanakResponse.veri);
            if (capResponse.basarili && capResponse.veri) setJantCaplari(capResponse.veri);
        } catch (error) {
            console.error("Lastik ölçüleri yüklenemedi:", error);
        }
    }, []);

    useEffect(() => {
        loadLastikOlculeri();
    }, [loadLastikOlculeri]);

    // Janta göre arama
    const handleJantaGoreArama = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();

            if (!selectedGenislik || !selectedYukseklik || !selectedCap) {
                alert("Lütfen tüm alanları doldurunuz");
                return;
            }

            const searchParams = new URLSearchParams({
                tip: "jant",
                mevsim,
                genislik: selectedGenislik,
                yanak: selectedYukseklik,
                cap: selectedCap,
            });

            const categoryUrl = `/category?${searchParams.toString()}`;
            try {
                sessionStorage.setItem("force_category_url", categoryUrl);
            } catch { }
            window.location.replace(categoryUrl);
        },
        [mevsim, selectedGenislik, selectedYukseklik, selectedCap]
    );

    // Araç ile arama
    const handleAracaGoreArama = useCallback((searchData: AracAramaData) => {
        const searchParams = new URLSearchParams({
            tip: "arac",
            marka: searchData.marka,
            model: searchData.model,
            yil: searchData.yil,
            ...(searchData.modifikasyon && { modifikasyon: searchData.modifikasyon }),
        });

        const categoryUrl = `/category?${searchParams.toString()}`;
        try {
            sessionStorage.setItem("force_category_url", categoryUrl);
        } catch { }
        window.location.replace(categoryUrl);
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
    };
}
