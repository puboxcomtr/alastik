"use client";
import { useState, useEffect } from "react";
import Brand from "@/src/components/category/Sidebar/Brand";
import Oem from "@/src/components/category/Sidebar/Oem";
import Price from "@/src/components/category/Sidebar/Price";
import Properties from "@/src/components/category/Sidebar/Properties";
import Season from "@/src/components/category/Sidebar/Season";
import SpeedIndex from "@/src/components/category/Sidebar/SpeedIndex";
import ProductionYear from "@/src/components/category/Sidebar/ProductionYear";
import TireFilter from '@components/category/Filter/TireFilter';
import RimsFilter from '@components/category/Filter/RimsFilter';
import { getTireFilterOptions, type TireFilterOptions } from "@/src/services/filterService";
import { useFilterToast } from "@/src/hooks/Category/useFilterToast";

interface MobileFilterOffcanvasProps {
    isOpen: boolean;
    onClose: () => void;
    hideEbatFilters?: boolean;
    categorySlug?: string;
    tagSlug?: string;
    tagType?: string;
    brandSlug?: string;
}

export default function MobileFilterOffcanvas({
    isOpen,
    onClose,
    hideEbatFilters = false,
    categorySlug,
    tagSlug,
    tagType,
    brandSlug
}: MobileFilterOffcanvasProps) {
    const [options, setOptions] = useState<TireFilterOptions | null>(null);
    const [productType, setProductType] = useState<string>('LASTİK');

    useFilterToast();

    useEffect(() => {
        if (tagType) setProductType(tagType === 'rim_pcd' ? 'JANT' : 'LASTİK');
        const loadOptions = async () => {
            const data = await getTireFilterOptions(categorySlug, tagSlug, brandSlug);
            if (data) {
                setOptions(data);
                if (!tagType) setProductType(data.productType || 'LASTİK');
            }
        };
        loadOptions();
    }, [categorySlug, tagSlug, tagType, brandSlug]);

    const isJant = productType === 'JANT';

    return (
        <>
            {isOpen && (
                <div className="offcanvas-backdrop fade show" onClick={onClose} />
            )}
            <div
                className={`offcanvas offcanvas-start${isOpen ? ' show' : ''}`}
                style={{ visibility: isOpen ? 'visible' : 'hidden' }}
                tabIndex={-1}
            >
                <div className="offcanvas-header">
                    <h5 className="offcanvas-title">Filtrele</h5>
                    <button type="button" className="btn-close" onClick={onClose} aria-label="Kapat" />
                </div>
                <div className="offcanvas-body">
                    {/* Marka Sayfası Gizli */}
                    {!brandSlug && (
                        <Brand categorySlug={categorySlug} brands={options?.brands || []} />
                    )}
                    <Price priceRange={options?.priceRange} />
                    {isJant && <RimsFilter categorySlug={categorySlug} tagSlug={tagSlug} />}
                    {!isJant && (
                        <>
                            <Season seasonOptions={options?.seasons || []} />
                            <Properties propertyOptions={options?.properties || []} />
                            <TireFilter hideEbatFilters={hideEbatFilters} categorySlug={categorySlug} tagSlug={tagSlug} />
                            <SpeedIndex loadIndexOptions={options?.loadIndex || []} speedIndexOptions={options?.speedIndex || []} />
                            <Oem oemOptions={options?.oem || []} />
                            <ProductionYear productionYears={options?.productionYears} />
                        </>
                    )}
                </div>
            </div>
        </>
    );
}