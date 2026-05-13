"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Offcanvas, Button } from "react-bootstrap";
import { Grid } from "@mui/material";

// Lastik Filtreleri
import TireFilter from '@components/category/Filter/TireFilter';
import Brand from "@/src/components/category/Sidebar/Brand";
import Oem from "@/src/components/category/Sidebar/Oem";
import Price from "@/src/components/category/Sidebar/Price";
import Properties from "@/src/components/category/Sidebar/Properties";
import Season from "@/src/components/category/Sidebar/Season";
import SpeedIndex from "@/src/components/category/Sidebar/SpeedIndex";
import ProductionYear from "@/src/components/category/Sidebar/ProductionYear";

// Jant Filtreleri
import RimsFilter from '@components/category/Filter/RimsFilter';

import { getTireFilterOptions, type TireFilterOptions } from "@/src/services/filterService";

interface SidebarProps {
    hideEbatFilters?: boolean;
    categorySlug?: string;
    tagSlug?: string;
    tagType?: string;
    brandSlug?: string;
    searchQuery?: string;
}

export default function Sidebar({ hideEbatFilters = false, categorySlug, tagSlug, tagType, brandSlug, searchQuery }: SidebarProps) {
    const searchParams = useSearchParams();
    const [options, setOptions] = useState<TireFilterOptions | null>(null);
    const [productType, setProductType] = useState<string>('LASTİK');

    // searchParams değişikliklerini izlemek için dependency
    const searchParamsString = searchParams.toString();

    useEffect(() => {
        if (tagType) {
            const type = tagType === 'rim_pcd' ? 'JANT' : 'LASTİK';
            setProductType(type);
        }
        const loadOptions = async () => {
            // Aktif filtreleri searchParams'tan al
            const activeFilters: Record<string, string | undefined> = {
                genislik: searchParams.get('genislik') || undefined,
                yanak: searchParams.get('yanak') || undefined,
                jant: searchParams.get('jant') || undefined,
                arac: searchParams.get('arac') || undefined,
                marka: searchParams.get('marka') || undefined,
                mevsim: searchParams.get('mevsim') || undefined,
                oem: searchParams.get('oem') || undefined,
                yukEndeksi: searchParams.get('yukEndeksi') || undefined,
                hizEndeksi: searchParams.get('hizEndeksi') || undefined,
                ozellik: searchParams.get('ozellik') || undefined,
                uretim: searchParams.get('uretim') || undefined
            };

            const data = await getTireFilterOptions(categorySlug, tagSlug, brandSlug, activeFilters, searchQuery);
            if (data) {
                setOptions(data);
                if (!tagType) {
                    setProductType(data.productType || 'LASTİK');
                }
            }
        };
        loadOptions();
    }, [categorySlug, tagSlug, tagType, brandSlug, searchParamsString, searchQuery]);

    const isJant = productType === 'JANT';

    return (
        <div>
            <div className="offcanvas-lg offcanvas-start pe-lg-4" id="filterSidebar">
                <div className="offcanvas-header py-3">
                    <Offcanvas.Title as="h3">Filtrele</Offcanvas.Title>
                    <Button
                        variant=""
                        className="btn-close"
                        data-bs-dismiss="offcanvas"
                        data-bs-target="#filterSidebar"
                        aria-label="Close"
                    />
                </div>
                <Grid container className="offcanvas-body flex-column py-lg-0">
                    <Grid>
                        {/* Ortak Filtreler */}
                        {!brandSlug && (
                            <Brand
                                categorySlug={categorySlug}
                                brands={options?.brands || []}
                            />
                        )}
                        <Price priceRange={options?.priceRange} />

                        {/* Jant Filtreleri */}
                        {isJant && (
                            <RimsFilter
                                categorySlug={categorySlug}
                                tagSlug={tagSlug}
                            />
                        )}

                        {/* Lastik Filtreleri */}
                        {!isJant && (
                            <>
                                <Season seasonOptions={options?.seasons || []} categorySlug={categorySlug} tagSlug={tagSlug} />
                                <Properties propertyOptions={options?.properties || []} categorySlug={categorySlug} tagSlug={tagSlug} />
                                <TireFilter
                                    hideEbatFilters={hideEbatFilters}
                                    categorySlug={categorySlug}
                                    tagSlug={tagSlug}
                                />
                                <SpeedIndex
                                    loadIndexOptions={options?.loadIndex || []}
                                    speedIndexOptions={options?.speedIndex || []}
                                    categorySlug={categorySlug}
                                    tagSlug={tagSlug}
                                />
                                <Oem oemOptions={options?.oem || []} categorySlug={categorySlug} tagSlug={tagSlug} />
                                <ProductionYear productionYears={options?.productionYears} categorySlug={categorySlug} tagSlug={tagSlug} />
                            </>
                        )}
                    </Grid>
                </Grid>
            </div>
        </div>
    );
}