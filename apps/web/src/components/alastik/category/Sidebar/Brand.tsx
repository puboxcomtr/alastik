"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { formatBrandName, normalizeForSearch } from '@/src/hooks/Products/brandHelpers';
import { applyFilterWithCascade } from "@/src/utils/filterCascade";
import {
    Grid,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Checkbox,
    FormControlLabel,
    TextField,
    Typography,
    CircularProgress,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

interface BrandOption {
    value: string;
    label?: string;
    count: number;
}

interface BrandProps {
    categorySlug?: string;
    brands?: BrandOption[];
}

export default function Brand({ categorySlug, brands = [] }: BrandProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [search, setSearch] = useState("");
    const selectedBrands = searchParams.get('marka')?.split(',').filter(Boolean) || [];

    const handleToggle = async (brandValue: string) => {
        let newSelected: string[];
        if (selectedBrands.includes(brandValue)) {
            newSelected = selectedBrands.filter(b => b !== brandValue);
        } else {
            newSelected = [...selectedBrands, brandValue];
        }

        const newValue = newSelected.length > 0 ? newSelected.join(',') : 'all';

        const cleaned = await applyFilterWithCascade(
            new URLSearchParams(searchParams.toString()),
            'marka',
            newValue,
            { categorySlug }
        );
        const queryString = cleaned.toString();
        router.push(queryString ? `${pathname}?${queryString}` : pathname);
    };

    const clearBrands = async () => {
        const cleaned = await applyFilterWithCascade(
            new URLSearchParams(searchParams.toString()),
            'marka',
            'all',
            { categorySlug }
        );
        const queryString = cleaned.toString();
        router.push(queryString ? `${pathname}?${queryString}` : pathname);
    };

    const filteredBrands = brands.filter((brand) =>
        normalizeForSearch(brand.label).includes(normalizeForSearch(search))
    );

    if (!brands || brands.length === 0) {
        return null;
    }

    return (
        <Grid sx={{ borderBottom: "1px solid #ddd", paddingBottom: "20px" }}>
            <Accordion
                defaultExpanded
                sx={{
                    boxShadow: "none",
                    border: "none",
                    "&:before": { display: "none" },
                }}
            >
                <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{ borderBottom: "none", p: 0 }}
                >
                    <Typography variant="subtitle1" fontWeight="bold">
                        Marka
                        {selectedBrands.length > 0 && (
                            <span style={{
                                marginLeft: 8,
                                fontSize: '12px',
                                color: 'var(--cz-primary)',
                                fontWeight: 'normal'
                            }}>
                                ({selectedBrands.length} seçili)
                            </span>
                        )}
                    </Typography>
                </AccordionSummary>

                <AccordionDetails sx={{ padding: 0 }}>
                    <TextField
                        variant="outlined"
                        fullWidth
                        size="small"
                        placeholder="Marka ara..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        sx={{ mb: 2 }}
                    />

                    <div style={{ maxHeight: 210, overflowY: "auto", display: "flex", flexDirection: "column" }}>
                        {filteredBrands.map((brand) => (
                            <FormControlLabel
                                key={brand.value}
                                control={
                                    <Checkbox
                                        checked={selectedBrands.includes(brand.value)}
                                        onChange={() => handleToggle(brand.value)}
                                        size="small"
                                        sx={{ p: "5px 10px" }}
                                    />
                                }
                                label={
                                    <>
                                        <span style={{ color: "#000" }}>{formatBrandName(brand.label)}</span>
                                    </>
                                }
                                sx={{
                                    "& .MuiFormControlLabel-label": {
                                        fontSize: "0.955rem",
                                        width: "100%"
                                    },
                                }}
                            />
                        ))}
                    </div>

                    {selectedBrands.length > 0 && (
                        <button
                            onClick={clearBrands}
                            style={{
                                marginTop: '10px',
                                padding: '6px 12px',
                                backgroundColor: 'transparent',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                width: '100%'
                            }}
                        >
                            Marka Filtresini Temizle
                        </button>
                    )}
                </AccordionDetails>
            </Accordion>
        </Grid>
    );
}