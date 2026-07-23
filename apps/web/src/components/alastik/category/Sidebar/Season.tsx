"use client";

import {
    Grid, Accordion, AccordionSummary, AccordionDetails,
    Checkbox, FormControlLabel, Typography, Box
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { applyFilterWithCascade } from "@/src/utils/filterCascade";

interface SeasonOption {
    value: string;
    label?: string;
    count: number;
}

interface SeasonProps {
    seasonOptions?: SeasonOption[];
    categorySlug?: string;
    tagSlug?: string;
}

export default function Season({ seasonOptions = [], categorySlug, tagSlug }: SeasonProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // URL'den mevcut seçimleri al
    const currentSeasons = searchParams.get('mevsim')?.split(',').filter(Boolean) || [];

    const handleToggle = async (value: string) => {
        let newSeasons: string[];
        if (currentSeasons.includes(value)) {
            newSeasons = currentSeasons.filter(s => s !== value);
        } else {
            newSeasons = [...currentSeasons, value];
        }

        const newValue = newSeasons.length > 0 ? newSeasons.join(',') : 'all';

        const cleaned = await applyFilterWithCascade(
            new URLSearchParams(searchParams.toString()),
            'mevsim',
            newValue,
            { categorySlug, tagSlug }
        );
        const queryString = cleaned.toString();
        router.push(queryString ? `${pathname}?${queryString}` : pathname);
    };

    // Seçenek yoksa veya tek seçenek varsa gösterme (filtrelemeye gerek yok)
    if (!seasonOptions || seasonOptions.length <= 1) {
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
                        Mevsim
                    </Typography>
                </AccordionSummary>

                <AccordionDetails sx={{ padding: 0 }}>
                    <div
                        style={{
                            maxHeight: 250,
                            overflowY: "auto",
                            display: "flex",
                            flexDirection: "column",
                        }}
                    >
                        {seasonOptions.map((item, index) => (
                            <FormControlLabel
                                key={index}
                                control={
                                    <Checkbox
                                        checked={currentSeasons.includes(item.value)}
                                        onChange={() => handleToggle(item.value)}
                                        size="small"
                                        sx={{ p: "5px 10px" }}
                                    />
                                }
                                label={
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                        <span style={{ fontSize: "0.9rem" }}>
                                            {item.label || item.value}
                                        </span>
                                    </Box>
                                }
                            />
                        ))}
                    </div>
                </AccordionDetails>
            </Accordion>
        </Grid>
    );
}