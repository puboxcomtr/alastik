// apps/web/src/components/layout/TireSearchClient.tsx
"use client";

import { useState, useEffect } from 'react';
import TireSearchModal from "@/src/components/layout/Modals/TireSearch";

type ModalMode = 'search' | 'addVehicle' | 'rimSearch';

export default function TireSearchClient() {
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<ModalMode>('search');

    useEffect(() => {
        // Lastik arama
        const handleOpenTireSearch = () => {
            setMode('search');
            setOpen(true);
        };

        // Jant arama
        const handleOpenRimSearch = () => {
            setMode('rimSearch');
            setOpen(true);
        };

        // Araç ekleme (garaj için)
        const handleOpenAddVehicle = () => {
            setMode('addVehicle');
            setOpen(true);
        };

        window.addEventListener('openTireSearchModal', handleOpenTireSearch);
        window.addEventListener('openRimSearchModal', handleOpenRimSearch);
        window.addEventListener('openAddVehicleModal', handleOpenAddVehicle);

        return () => {
            window.removeEventListener('openTireSearchModal', handleOpenTireSearch);
            window.removeEventListener('openRimSearchModal', handleOpenRimSearch);
            window.removeEventListener('openAddVehicleModal', handleOpenAddVehicle);
        };
    }, []);

    const handleClose = () => {
        setOpen(false);
    };

    return (
        <TireSearchModal
            open={open}
            onClose={handleClose}
            mode={mode}
        />
    );
}