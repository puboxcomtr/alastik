// apps/web/src/components/category/Sidebar/Content.tsx
"use client";

import { useState, useEffect } from "react";
import { Offcanvas, Button } from "react-bootstrap";
import { Grid } from "@mui/material";

import TireFilter from '@components/category/Filter/TireFilter';
import Brand from "@/src/components/category/Sidebar/Brand";
import Oem from "@/src/components/category/Sidebar/Oem";
import Price from "@/src/components/category/Sidebar/Price";
import Properties from "@/src/components/category/Sidebar/Properties";
import Fuel from "@/src/components/category/Sidebar/Fuel";
import { getTireFilterOptions, type TireFilterOptions } from "@/src/services/filterService";

interface SidebarProps {
    hideEbatFilters?: boolean;
    categorySlug?: string;
    tagSlug?: string;
}

export default function Sidebar({ hideEbatFilters = false, categorySlug, tagSlug }: SidebarProps) {
    const [options, setOptions] = useState<TireFilterOptions | null>(null);

    useEffect(() => {
        const loadOptions = async () => {
            console.log('Loading filter options:', { categorySlug, tagSlug });
            const data = await getTireFilterOptions(categorySlug, tagSlug);
            console.log('Filter options received:', data);
            if (data) {
                setOptions(data);
            }
        };
        loadOptions();
    }, [categorySlug, tagSlug]);

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
                        <TireFilter
                            hideEbatFilters={hideEbatFilters}
                            categorySlug={categorySlug}
                            tagSlug={tagSlug}
                        />
                        <Brand
                            categorySlug={categorySlug}
                            brands={options?.brands || []}
                        />
                        <Oem oemOptions={options?.oem || []} />
                        <Price />
                        <Properties />
                        <Fuel />
                    </Grid>
                </Grid>
            </div>
        </div>
    );
}