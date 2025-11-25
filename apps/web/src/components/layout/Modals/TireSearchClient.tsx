// apps/web/src/components/layout/TireSearchClient.tsx
"use client";

import { useState } from 'react';
import TireSearchModal from "@/src/components/layout/Modals/TireSearch";

export default function TireSearchClient() {
    const [open, setOpen] = useState(false);

    const handleSearchComplete = (searchData: any) => {
        console.log("[TIRE SEARCH CLIENT] Arama tamamlandı:", searchData);

        const params = new URLSearchParams({
            tip: "arac",
            marka: searchData.marka,
            model: searchData.model,
            yil: searchData.yil,
        });

        if (searchData.modifikasyon) {
            params.append("modifikasyon", searchData.modifikasyon);
        }

        const categoryUrl = `/category?${params.toString()}`;

        try {
            sessionStorage.setItem("force_category_url", categoryUrl);
        } catch (e) {
            console.warn("SessionStorage yazma hatası:", e);
        }

        window.location.replace(categoryUrl);
    };

    // Global event listener - butona tıklanınca modal'ı aç
    if (typeof window !== 'undefined') {
        window.addEventListener('openTireSearchModal', () => setOpen(true));
    }

    return (
        <TireSearchModal
            open={open}
            onClose={() => setOpen(false)}
            onSearchComplete={handleSearchComplete}
        />
    );
}