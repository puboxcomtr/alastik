// apps/web/src/components/category/Sidebar/Season.tsx
"use client";

import {
    Grid, Accordion, AccordionSummary, AccordionDetails,
    Checkbox, FormControlLabel, Typography, Box
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface SeasonOption {
    value: string;
    label?: string;
    count: number;
}

interface SeasonProps {
    seasonOptions?: SeasonOption[];
}

export default function Season({ seasonOptions = [] }: SeasonProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // URL'den mevcut seçimleri al
    const currentSeasons = searchParams.get('mevsim')?.split(',').filter(Boolean) || [];

    const handleToggle = (value: string) => {
        const params = new URLSearchParams(searchParams.toString());

        let newSeasons: string[];
        if (currentSeasons.includes(value)) {
            // Zaten seçili, kaldır
            newSeasons = currentSeasons.filter(s => s !== value);
        } else {
            // Seçili değil, ekle
            newSeasons = [...currentSeasons, value];
        }

        if (newSeasons.length > 0) {
            params.set('mevsim', newSeasons.join(','));
        } else {
            params.delete('mevsim');
        }

        // Sayfa parametresini sıfırla
        params.delete('sayfa');

        const queryString = params.toString();
        router.push(queryString ? `${pathname}?${queryString}` : pathname);
    };

    // Seçenekler yoksa gösterme
    if (!seasonOptions || seasonOptions.length === 0) {
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