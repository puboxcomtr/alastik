"use client";

import { useState, useEffect } from "react";
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
}

export default function Sidebar({ hideEbatFilters = false, categorySlug, tagSlug }: SidebarProps) {
    const [options, setOptions] = useState<TireFilterOptions | null>(null);
    const [productType, setProductType] = useState<string>('LASTİK');

    useEffect(() => {
        const loadOptions = async () => {
            console.log('Loading filter options:', { categorySlug, tagSlug });
            const data = await getTireFilterOptions(categorySlug, tagSlug);
            console.log('Filter options received:', data);
            if (data) {
                setOptions(data);
                setProductType(data.productType || 'LASTİK');
            }
        };
        loadOptions();
    }, [categorySlug, tagSlug]);

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
                        <Brand
                            categorySlug={categorySlug}
                            brands={options?.brands || []}
                        />
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
                                <Season seasonOptions={options?.seasons || []} />
                                <Properties propertyOptions={options?.properties || []} />
                                <TireFilter
                                    hideEbatFilters={hideEbatFilters}
                                    categorySlug={categorySlug}
                                    tagSlug={tagSlug}
                                />
                                <SpeedIndex
                                    loadIndexOptions={options?.loadIndex || []}
                                    speedIndexOptions={options?.speedIndex || []}
                                />
                                <Oem oemOptions={options?.oem || []} />
                                <ProductionYear productionYears={options?.productionYears} />
                            </>
                        )}
                    </Grid>
                </Grid>
            </div>
        </div>
    );
}