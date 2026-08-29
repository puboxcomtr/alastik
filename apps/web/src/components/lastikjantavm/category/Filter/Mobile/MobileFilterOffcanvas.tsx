"use client";
import { useState, useEffect } from "react";
import Brand from "@components/lastikjantavm/category/Sidebar/Brand";
import Oem from "@components/lastikjantavm/category/Sidebar/Oem";
import Price from "@components/lastikjantavm/category/Sidebar/Price";
import Properties from "@components/lastikjantavm/category/Sidebar/Properties";
import Season from "@components/lastikjantavm/category/Sidebar/Season";
import SpeedIndex from "@components/lastikjantavm/category/Sidebar/SpeedIndex";
import ProductionYear from "@components/lastikjantavm/category/Sidebar/ProductionYear";
import TireFilter from '@components/lastikjantavm/category/Filter/TireFilter';
import RimsFilter from '@components/lastikjantavm/category/Filter/RimsFilter';
import { getTireFilterOptions, type TireFilterOptions } from "@/src/services/filterService";
import { useFilterToast } from "@/src/hooks/Category/useFilterToast";

interface MobileFilterOffcanvasProps {
    isOpen: boolean;
    onClose: () => void;
    hideEbatFilters?: boolean;
    hiddenFilters?: string[];
    categorySlug?: string;
    tagSlug?: string;
    tagType?: string;
    brandSlug?: string;
}

export default function MobileFilterOffcanvas({
    isOpen,
    onClose,
    hideEbatFilters = false, hiddenFilters = [],
    categorySlug,
    tagSlug,
    tagType,
    brandSlug
}: MobileFilterOffcanvasProps) {
    const hidden = new Set(hiddenFilters);
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
                    {!brandSlug && !hidden.has('brand') && (
                        <Brand categorySlug={categorySlug} brands={options?.brands || []} />
                    )}
                    {!hidden.has('price') && <Price priceRange={options?.priceRange} />}
                    {isJant && <RimsFilter categorySlug={categorySlug} tagSlug={tagSlug} />}
                    {!isJant && (
                        <>
                            {!hidden.has('season') && <Season seasonOptions={options?.seasons || []} />}
                            {!hidden.has('properties') && <Properties propertyOptions={options?.properties || []} />}
                            <TireFilter hideEbatFilters={hideEbatFilters || hidden.has('tireSize')} categorySlug={categorySlug} tagSlug={tagSlug} />
                            <SpeedIndex hideLoadIndex={hidden.has('loadIndex')} hideSpeedIndex={hidden.has('speedIndex')} loadIndexOptions={options?.loadIndex || []} speedIndexOptions={options?.speedIndex || []} />
                            {!hidden.has('oem') && <Oem oemOptions={options?.oem || []} />}
                            {!hidden.has('productionYear') && <ProductionYear productionYears={options?.productionYears} />}
                        </>
                    )}
                </div>
            </div>
        </>
    );
}