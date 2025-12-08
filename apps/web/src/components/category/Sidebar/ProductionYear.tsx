"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
    Grid,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Checkbox,
    FormControlLabel,
    TextField,
    Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

interface YearOption {
    value: string;
    label?: string;
    count: number;
}

interface ProductionYearProps {
    productionYears?: YearOption[];
}

export default function ProductionYear({ productionYears = [] }: ProductionYearProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [search, setSearch] = useState("");
    const selectedYears = searchParams.get('uretim')?.split(',').filter(Boolean) || [];

    const handleToggle = (yearValue: string) => {
        const params = new URLSearchParams(searchParams.toString());

        let newSelected: string[];
        if (selectedYears.includes(yearValue)) {
            newSelected = selectedYears.filter(y => y !== yearValue);
        } else {
            newSelected = [...selectedYears, yearValue];
        }

        if (newSelected.length > 0) {
            params.set('uretim', newSelected.join(','));
        } else {
            params.delete('uretim');
        }

        params.delete('sayfa');
        const queryString = params.toString();
        const newURL = queryString ? `${pathname}?${queryString}` : pathname;
        router.push(newURL);
    };

    const clearYears = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('uretim');
        params.delete('sayfa');
        const queryString = params.toString();
        const newURL = queryString ? `${pathname}?${queryString}` : pathname;
        router.push(newURL);
    };

    // Arama filtresi
    const filteredYears = productionYears.filter((year) =>
        (year.label || year.value).includes(search)
    );

    if (!productionYears || productionYears.length === 0) {
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
                        Üretim Tarihi
                        {selectedYears.length > 0 && (
                            <span style={{
                                marginLeft: 8,
                                fontSize: '12px',
                                color: 'var(--cz-primary)',
                                fontWeight: 'normal'
                            }}>
                                ({selectedYears.length} seçili)
                            </span>
                        )}
                    </Typography>
                </AccordionSummary>

                <AccordionDetails sx={{ padding: 0 }}>
                    {productionYears.length > 5 && (
                        <TextField
                            variant="outlined"
                            fullWidth
                            size="small"
                            placeholder="Yıl ara..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            sx={{ mb: 2 }}
                        />
                    )}

                    <div style={{ maxHeight: 210, overflowY: "auto", display: "flex", flexDirection: "column" }}>
                        {filteredYears.map((year) => (
                            <FormControlLabel
                                key={year.value}
                                control={
                                    <Checkbox
                                        checked={selectedYears.includes(year.value)}
                                        onChange={() => handleToggle(year.value)}
                                        size="small"
                                        sx={{ p: "5px 10px" }}
                                    />
                                }
                                label={
                                    <span style={{ color: "#000" }}>
                                        {year.label || year.value}
                                    </span>
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
                </AccordionDetails>
            </Accordion>
        </Grid>
    );
}