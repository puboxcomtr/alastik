"use client";

import { useState, useEffect } from 'react';
import TireSearchModal from "@/src/components/layout/Modals/TireSearch";

type ModalMode = 'search' | 'addVehicle' | 'rimSearch' | 'chainSearch';

export default function TireSearchClient() {
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<ModalMode>('search');
    const [condition, setCondition] = useState<string | undefined>(undefined);

    useEffect(() => {
        const handleOpenTireSearch = (event: Event) => {
            setCondition((event as CustomEvent)?.detail?.condition || undefined);
            setMode('search');
            setOpen(true);
        };

        const handleOpenRimSearch = () => {
            setMode('rimSearch');
            setOpen(true);
        };

        const handleOpenChainSearch = () => {
            setMode('chainSearch');
            setOpen(true);
        };

        const handleOpenAddVehicle = () => {
            setMode('addVehicle');
            setOpen(true);
        };

        window.addEventListener('openTireSearchModal', handleOpenTireSearch);
        window.addEventListener('openRimSearchModal', handleOpenRimSearch);
        window.addEventListener('openChainSearchModal', handleOpenChainSearch);
        window.addEventListener('openAddVehicleModal', handleOpenAddVehicle);

        return () => {
            window.removeEventListener('openTireSearchModal', handleOpenTireSearch);
            window.removeEventListener('openRimSearchModal', handleOpenRimSearch);
            window.removeEventListener('openChainSearchModal', handleOpenChainSearch);
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
            condition={condition}
        />
    );
}