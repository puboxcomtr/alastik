"use client";

import {
    Grid, Accordion, AccordionSummary, AccordionDetails,
    Checkbox, FormControlLabel, Typography, Box
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { applyFilterWithCascade } from "@/src/utils/filterCascade";

interface PropertyOption {
    value: string;
    label?: string;
    count: number;
}

interface PropertiesProps {
    propertyOptions?: PropertyOption[];
    categorySlug?: string;
    tagSlug?: string;
}

export default function Properties({ propertyOptions = [], categorySlug, tagSlug }: PropertiesProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const currentProperties = searchParams.get('ozellik')?.split(',').filter(Boolean) || [];

    const handleToggle = async (value: string) => {
        let newProperties: string[];
        if (currentProperties.includes(value)) {
            newProperties = currentProperties.filter(p => p !== value);
        } else {
            newProperties = [...currentProperties, value];
        }

        const newValue = newProperties.length > 0 ? newProperties.join(',') : 'all';

        const cleaned = await applyFilterWithCascade(
            new URLSearchParams(searchParams.toString()),
            'ozellik',
            newValue,
            { categorySlug, tagSlug }
        );
        const queryString = cleaned.toString();
        router.push(queryString ? `${pathname}?${queryString}` : pathname);
    };
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