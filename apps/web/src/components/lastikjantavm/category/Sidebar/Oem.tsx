"use client";

import { Grid, TextField, MenuItem, Tooltip, Typography, FormControl } from "@mui/material";
import { Offcanvas } from "react-bootstrap";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { applyFilterWithCascade } from "@/src/utils/filterCascade";

interface OemOption {
    value: string;
    label?: string;
    count: number;
}
interface OemProps {
    oemOptions?: OemOption[];
    categorySlug?: string;
    tagSlug?: string;
}

export default function Oem({ oemOptions = [], categorySlug, tagSlug }: OemProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const currentOem = searchParams.get('oem') || 'all';

    const handleChange = async (value: string) => {
        const cleaned = await applyFilterWithCascade(
            new URLSearchParams(searchParams.toString()),
            'oem',
            value,
            { categorySlug, tagSlug }
        );
        const queryString = cleaned.toString();
        router.push(queryString ? `${pathname}?${queryString}` : pathname);
    };

    if (!oemOptions || oemOptions.length === 0) {
        return null;
    }

    return (
        <Grid container sx={{ borderBottom: "1px solid #ddd" }}>
            <Grid size={12} sx={{ mb: 2, mt: 1 }}>
                <Offcanvas.Title className="mb-2" as="h6">
                    Orjinal Ekipman
                    <Tooltip
                        title={
                            <Typography variant="body2" sx={{ maxWidth: 300 }}>
                                Orijinal Ekipman Üreticisi (OEM) lastikleri, otomobil üreticisi ile lastik endüstrisinin yakın iş birliği içinde geliştirilir. Bu lastiklerin yanak kısmında OEM işaretlemesi bulunur, örneğin Mercedes-Benz için "MO", BMW için "*" ve Audi için "AO" gibi.
                            </Typography>
                        }
                        arrow
                        placement="right"
                    >
                        <i className="ri-information-line" style={{ fontSize: 18, cursor: "pointer", color: "#555", marginLeft: 5 }} />
                    </Tooltip>
                </Offcanvas.Title>
                <FormControl fullWidth>
                    <TextField
                        select
                        fullWidth
                        size="small"
                        variant="outlined"
                        value={currentOem}
                        onChange={(e) => handleChange(e.target.value)}
                        SelectProps={{
                            MenuProps: { PaperProps: { style: { maxHeight: 200, overflowY: "auto" } } },
                            IconComponent: (props) => <i {...props} className="ri-arrow-down-s-line" style={{ color: "#555", fontSize: 20 }} />
                        }}
                        sx={{ backgroundColor: "#f5f5f5", borderRadius: 1 }}
                    >
                        <MenuItem value="all" sx={{ fontSize: '13px', borderBottom: '1px solid #eee' }}>
                            Tümü
                        </MenuItem>
                        {oemOptions.map((oem, index) => (
                            <MenuItem
                                key={index}
                                value={oem.value}
                                sx={{
                                    fontSize: '13px',
                                    borderBottom: '1px solid #eee',
                                    '&:last-child': { borderBottom: 'none' }
                                }}
                            >
                                {oem.label || oem.value}
                            </MenuItem>
                        ))}
                    </TextField>
                </FormControl>
            </Grid>
        </Grid>
    );
}