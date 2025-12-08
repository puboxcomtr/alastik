// apps/web/src/components/category/Sidebar/Properties.tsx
"use client";

import {
    Grid, Accordion, AccordionSummary, AccordionDetails,
    Checkbox, FormControlLabel, Typography, Box
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface PropertyOption {
    value: string;
    label?: string;
    count: number;
}

interface PropertiesProps {
    propertyOptions?: PropertyOption[];
}

export default function Properties({ propertyOptions = [] }: PropertiesProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // URL'den mevcut seçimleri al
    const currentProperties = searchParams.get('ozellik')?.split(',').filter(Boolean) || [];

    const handleToggle = (value: string) => {
        const params = new URLSearchParams(searchParams.toString());

        let newProperties: string[];
        if (currentProperties.includes(value)) {
            newProperties = currentProperties.filter(p => p !== value);
        } else {
            newProperties = [...currentProperties, value];
        }

        if (newProperties.length > 0) {
            params.set('ozellik', newProperties.join(','));
        } else {
            params.delete('ozellik');
        }

        params.delete('sayfa');

        const queryString = params.toString();
        router.push(queryString ? `${pathname}?${queryString}` : pathname);
    };

    // Seçenekler yoksa gösterme
    if (!propertyOptions || propertyOptions.length === 0) {
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
                        Özellikler
                    </Typography>
                </AccordionSummary>

                <AccordionDetails sx={{ padding: 0 }}>
                    <div
                        style={{
                            maxHeight: 210,
                            overflowY: "auto",
                            display: "flex",
                            flexDirection: "column",
                        }}
                    >
                        {propertyOptions.map((item, index) => (
                            <FormControlLabel
                                key={index}
                                control={
                                    <Checkbox
                                        checked={currentProperties.includes(item.value)}
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