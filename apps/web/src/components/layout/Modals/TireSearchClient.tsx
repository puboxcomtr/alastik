"use client";

import TireSearchModal from "@components/layout/Modals/TireSearch";

export default function TireSearchClient() {
    const handleAracaGoreArama = (searchData: any) => {
        console.log("[GLOBAL] Modal arama tamamlandı:", searchData);
        // Kategori URL oluştur
        const searchParams = new URLSearchParams({
            tip: "arac",
            marka: searchData.marka,
            model: searchData.model,
            yil: searchData.yil,
            ...(searchData.modifikasyon && { modifikasyon: searchData.modifikasyon }),
        });

        const categoryUrl = `/category?${searchParams.toString()}`;
        try { sessionStorage.setItem("force_category_url", categoryUrl); } catch { }
        window.location.replace(categoryUrl);
    };

    return <TireSearchModal onSearchComplete={handleAracaGoreArama} />;
}
