"use client";

import { Grid, TextField, MenuItem, Tooltip, Typography, FormControl } from "@mui/material";
import { Offcanvas } from "react-bootstrap";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { applyFilterWithCascade } from "@/src/utils/filterCascade";

interface IndexOption {
    value: string;
    label?: string;
    count?: number;
}

interface SpeedIndexProps {
    loadIndexOptions?: IndexOption[];
    speedIndexOptions?: IndexOption[];
    categorySlug?: string;
    tagSlug?: string;
}

export default function SpeedIndex({ loadIndexOptions = [], speedIndexOptions = [], categorySlug, tagSlug }: SpeedIndexProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const currentLoadIndex = searchParams.get('yukEndeksi') || 'all';
    const currentSpeedIndex = searchParams.get('hizEndeksi') || 'all';

    const handleChange = async (param: string, value: string) => {
        const cleaned = await applyFilterWithCascade(
            new URLSearchParams(searchParams.toString()),
            param,
            value,
            { categorySlug, tagSlug }
        );
        const queryString = cleaned.toString();
        router.push(queryString ? `${pathname}?${queryString}` : pathname);
    };

    return (
        <Grid container sx={{ borderBottom: "1px solid #ddd" }}>
            {/* Yük Endeksi */}
            {loadIndexOptions.length > 0 && (
                <Grid size={12} sx={{ mb: 2, mt: 1 }}>
                    <Offcanvas.Title className="mb-2" as="h6">
                        Yük Endeksi
                        <Tooltip
                            title={
                                <Typography variant="body2" sx={{ maxWidth: 300 }}>
                                    Lastiğin taşıyabileceği maksimum yükü belirtir.
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
                            value={currentLoadIndex}
                            onChange={(e) => handleChange('yukEndeksi', e.target.value)}
                            SelectProps={{
                                MenuProps: { PaperProps: { style: { maxHeight: 200, overflowY: "auto" } } },
                                IconComponent: (props) => <i {...props} className="ri-arrow-down-s-line" style={{ color: "#555", fontSize: 20 }} />
                            }}
                            sx={{ backgroundColor: "#f5f5f5", borderRadius: 1 }}
                        >
                            <MenuItem value="all" sx={{ fontSize: '13px', borderBottom: '1px solid #eee' }}>
                                Tümü
                            </MenuItem>
                            {loadIndexOptions.map((opt, index) => (
                                <MenuItem
                                    key={index}
                                    value={opt.value}
                                    sx={{
                                        fontSize: '13px',
                                        borderBottom: '1px solid #eee',
                                        '&:last-child': { borderBottom: 'none' }
                                    }}
                                >
                                    {opt.label || opt.value}
                                </MenuItem>
                            ))}
                        </TextField>
                    </FormControl>
                </Grid>
            )}

            {/* Hız Endeksi */}
            {speedIndexOptions.length > 0 && (
                <Grid size={12} sx={{ mb: 2, mt: 1 }}>
                    <Offcanvas.Title className="mb-2" as="h6">
                        Hız Endeksi
                        <Tooltip
                            title={
                                <Typography variant="body2" sx={{ maxWidth: 300 }}>
                                    Lastiğin güvenli şekilde ulaşabileceği maksimum hızı gösterir.
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
                            value={currentSpeedIndex}
                            onChange={(e) => handleChange('hizEndeksi', e.target.value)}
                            SelectProps={{
                                MenuProps: { PaperProps: { style: { maxHeight: 200, overflowY: "auto" } } },
                                IconComponent: (props) => <i {...props} className="ri-arrow-down-s-line" style={{ color: "#555", fontSize: 20 }} />
                            }}
                            sx={{ backgroundColor: "#f5f5f5", borderRadius: 1 }}
                        >
                            <MenuItem value="all" sx={{ fontSize: '13px', borderBottom: '1px solid #eee' }}>
                                Tümü
                            </MenuItem>
                            {speedIndexOptions.map((opt, index) => (
                                <MenuItem
                                    key={index}
                                    value={opt.value}
                                    sx={{
                                        fontSize: '13px',
                                        borderBottom: '1px solid #eee',
                                        '&:last-child': { borderBottom: 'none' }
                                    }}
                                >
                                    {opt.label || opt.value}
                                </MenuItem>
                            ))}
                        </TextField>
                    </FormControl>
                </Grid>
            )}
        </Grid>
    );
}