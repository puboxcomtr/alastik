"use client";

import Link from "next/link";

/* Library */
import { Offcanvas, Button } from "react-bootstrap";

/* MUI */
import { Grid, TextField, MenuItem } from "@mui/material";

/* @Import Page */
import Category from "@/src/components/category/Sidebar/Category";
import TireFilter from '@components/category/Filter/TireFilter'
import Brand from "@/src/components/category/Sidebar/Brand";
import Oem from "@/src/components/category/Sidebar/Oem";
import Price from "@/src/components/category/Sidebar/Price";
import Properties from "@/src/components/category/Sidebar/Properties";
import Fuel from "@/src/components/category/Sidebar/Fuel";

interface SidebarProps {
    categorySlug?: string;
    currentFilters?: { [key: string]: string };
}
export default function Sidebar() {
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
                    <Grid size={12} className="pb-4 mb-4 border-bottom">
                        <Category />
                    </Grid>
                    <Grid>
                        <TireFilter />
                        <Brand />
                        <Oem />
                        <Price />
                        <Properties />
                        <Fuel />
                    </Grid>
                </Grid>
            </div>
        </div>
    );
}
