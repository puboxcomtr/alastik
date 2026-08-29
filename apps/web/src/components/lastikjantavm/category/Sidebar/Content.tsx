"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Offcanvas, Button } from "react-bootstrap";
import { Grid } from "@mui/material";

// Lastik Filtreleri
import TireFilter from '@components/lastikjantavm/category/Filter/TireFilter';
import Brand from "@components/lastikjantavm/category/Sidebar/Brand";
import Oem from "@components/lastikjantavm/category/Sidebar/Oem";
import Price from "@components/lastikjantavm/category/Sidebar/Price";
import Properties from "@components/lastikjantavm/category/Sidebar/Properties";
import Season from "@components/lastikjantavm/category/Sidebar/Season";
import SpeedIndex from "@components/lastikjantavm/category/Sidebar/SpeedIndex";
import ProductionYear from "@components/lastikjantavm/category/Sidebar/ProductionYear";

// Jant Filtreleri
import RimsFilter from '@components/lastikjantavm/category/Filter/RimsFilter';

import { getTireFilterOptions, type TireFilterOptions } from "@/src/services/filterService";

interface SidebarProps {
    hideEbatFilters?: boolean;
    categorySlug?: string;
    tagSlug?: string;
    tagType?: string;
    brandSlug?: string;
    searchQuery?: string;
    // Kategori ayarından gelen gizli filtre anahtarları (siteContent.hiddenFilters)
    hiddenFilters?: string[];
}

export default function Sidebar({ hideEbatFilters = false, categorySlug, tagSlug, tagType, brandSlug, searchQuery, hiddenFilters = [] }: SidebarProps) {
    const hidden = new Set(hiddenFilters);
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
                        {!brandSlug && !hidden.has('brand') && (
                            <Brand
                                categorySlug={categorySlug}
                                brands={options?.brands || []}
                            />
                        )}
                        {!hidden.has('price') && <Price priceRange={options?.priceRange} />}

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
                                {!hidden.has('season') && <Season seasonOptions={options?.seasons || []} categorySlug={categorySlug} tagSlug={tagSlug} />}
                                {!hidden.has('properties') && <Properties propertyOptions={options?.properties || []} categorySlug={categorySlug} tagSlug={tagSlug} />}
                                <TireFilter
                                    hideEbatFilters={hideEbatFilters || hidden.has('tireSize')}
                                    categorySlug={categorySlug}
                                    tagSlug={tagSlug}
                                />
                                <SpeedIndex
                                    hideLoadIndex={hidden.has('loadIndex')}
                                    hideSpeedIndex={hidden.has('speedIndex')}
                                    loadIndexOptions={options?.loadIndex || []}
                                    speedIndexOptions={options?.speedIndex || []}
                                    categorySlug={categorySlug}
                                    tagSlug={tagSlug}
                                />
                                {!hidden.has('oem') && <Oem oemOptions={options?.oem || []} categorySlug={categorySlug} tagSlug={tagSlug} />}
                                {!hidden.has('productionYear') && <ProductionYear productionYears={options?.productionYears} categorySlug={categorySlug} tagSlug={tagSlug} />}
                            </>
                        )}
                    </Grid>
                </Grid>
            </div>
        </div>
    );
}