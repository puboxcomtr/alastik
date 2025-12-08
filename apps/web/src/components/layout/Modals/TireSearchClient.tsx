// apps/web/src/components/layout/TireSearchClient.tsx
"use client";

import { useState, useEffect } from 'react';
import TireSearchModal from "@/src/components/layout/Modals/TireSearch";

export default function TireSearchClient() {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const handleOpen = () => setOpen(true);
        window.addEventListener('openTireSearchModal', handleOpen);
        return () => window.removeEventListener('openTireSearchModal', handleOpen);
    }, []);

    return (
        <TireSearchModal
            open={open}
            onClose={() => setOpen(false)}
        />
    );
}