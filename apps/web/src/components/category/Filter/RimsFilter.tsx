"use client";

import { Grid, TextField, MenuItem, Typography, FormControl, CircularProgress } from "@mui/material";
import { Offcanvas } from "react-bootstrap";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { getTireFilterOptions, type TireFilterOptions } from "@/src/services/filterService";

interface RimsFilterProps {
    categorySlug?: string;
    tagSlug?: string;
}

export default function RimsFilter({ categorySlug, tagSlug }: RimsFilterProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [loading, setLoading] = useState(true);
    const [options, setOptions] = useState<TireFilterOptions | null>(null);

    const [jantCap, setJantCap] = useState(searchParams.get('jantCap') || 'all');
    const [bijon, setBijon] = useState(searchParams.get('bijon') || 'all');
    const [vehicleType, setVehicleType] = useState(searchParams.get('arac') || 'all');

    useEffect(() => {
        const loadOptions = async () => {
            try {
                setLoading(true);
                const data = await getTireFilterOptions(categorySlug, tagSlug);
                if (data) {
                    setOptions(data);
                }
            } catch (error) {
                console.error('RimsFilter error:', error);
            } finally {
                setLoading(false);
            }
        };
        loadOptions();
    }, [categorySlug, tagSlug]);

    useEffect(() => {
        setJantCap(searchParams.get('jantCap') || 'all');
        setBijon(searchParams.get('bijon') || 'all');
        setVehicleType(searchParams.get('arac') || 'all');
    }, [searchParams]);

    const updateURL = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value === 'all') {
            params.delete(key);
        } else {
            params.set(key, value);
        }
        params.delete('page');
        const queryString = params.toString();
        const newURL = queryString ? `${pathname}?${queryString}` : pathname;
        router.push(newURL);
    };

    const handleJantCapChange = (value: string) => {
        setJantCap(value);
        updateURL('jantCap', value);
    };

    const handleBijonChange = (value: string) => {
        setBijon(value);
        updateURL('bijon', value);
    };

    const handleVehicleTypeChange = (value: string) => {
        setVehicleType(value);
        updateURL('arac', value);
    };

    const clearFilters = () => {
        setJantCap('all');
        setBijon('all');
        setVehicleType('all');
        router.push(pathname);
    };

    if (loading) {
        return (
            <Grid container sx={{ borderBottom: "1px solid #ddd", py: 3, justifyContent: 'center' }}>
                <CircularProgress size={24} />
            </Grid>
        );
    }

    if (!options) {
        return (
            <Grid container sx={{ borderBottom: "1px solid #ddd", py: 2 }}>
                <Typography variant="body2" color="text.secondary">
                    Filtre seçenekleri yüklenemedi
                </Typography>
            </Grid>
        );
    }

    const hasActiveFilters = searchParams.get('jantCap') || searchParams.get('bijon') || searchParams.get('arac');

    return (
        <Grid container sx={{ borderBottom: "1px solid #ddd" }}>
            {/* Araç Tipi */}
            {options.vehicleTypes && options.vehicleTypes.length > 0 && (
                <Grid size={12} sx={{ mb: 2, mt: 1 }}>
                    <Offcanvas.Title className="mb-2" as="h6">Jant Tipi</Offcanvas.Title>
                    <FormControl fullWidth>
                        <TextField
                            select
                            fullWidth
                            size="small"
                            variant="outlined"
                            value={vehicleType}
                            onChange={(e) => handleVehicleTypeChange(e.target.value)}
                            SelectProps={{
                                MenuProps: { PaperProps: { style: { maxHeight: 200, overflowY: "auto" } } },
                                IconComponent: (props) => <i {...props} className="ri-arrow-down-s-line" style={{ color: "#555", fontSize: 20 }} />
                            }}
                            sx={{ backgroundColor: "#f5f5f5", borderRadius: 1 }}
                        >
                            <MenuItem value="all" sx={{ fontSize: '13px', borderBottom: '1px solid #eee' }}>
                                Tümü
                            </MenuItem>
                            {options.vehicleTypes.map((opt) => (
                                <MenuItem
                                    key={opt.value}
                                    value={opt.value}
                                    sx={{ fontSize: '13px', borderBottom: '1px solid #eee', '&:last-child': { borderBottom: 'none' } }}
                                >
                                    {opt.label}
                                </MenuItem>
                            ))}
                        </TextField>
                    </FormControl>
                </Grid>
            )}

            {/* Jant Çapı */}
            {options.jantCaplar && options.jantCaplar.length > 0 && (
                <Grid size={12} sx={{ mb: 2, mt: 1 }}>
                    <Offcanvas.Title className="mb-2" as="h6">Jant Çapı</Offcanvas.Title>
                    <FormControl fullWidth>
                        <TextField
                            select
                            fullWidth
                            size="small"
                            variant="outlined"
                            value={jantCap}
                            onChange={(e) => handleJantCapChange(e.target.value)}
                            SelectProps={{
                                MenuProps: { PaperProps: { style: { maxHeight: 200, overflowY: "auto" } } },
                                IconComponent: (props) => <i {...props} className="ri-arrow-down-s-line" style={{ color: "#555", fontSize: 20 }} />
                            }}
                            sx={{ backgroundColor: "#f5f5f5", borderRadius: 1 }}
                        >
                            <MenuItem value="all" sx={{ fontSize: '13px', borderBottom: '1px solid #eee' }}>
                                Tümü
                            </MenuItem>
                            {options.jantCaplar.map((opt) => (
                                <MenuItem
                                    key={opt.value}
                                    value={opt.value}
                                    sx={{ fontSize: '13px', borderBottom: '1px solid #eee', '&:last-child': { borderBottom: 'none' } }}
                                >
                                    {opt.label}
                                </MenuItem>
                            ))}
                        </TextField>
                    </FormControl>
                </Grid>
            )}

            {/* Bijon Aralığı */}
            {options.bijonlar && options.bijonlar.length > 0 && (
                <Grid size={12} sx={{ mb: 2, mt: 1 }}>
                    <Offcanvas.Title className="mb-2" as="h6">Bijon Aralığı (PCD)</Offcanvas.Title>
                    <FormControl fullWidth>
                        <TextField
                            select
                            fullWidth
                            size="small"
                            variant="outlined"
                            value={bijon}
                            onChange={(e) => handleBijonChange(e.target.value)}
                            SelectProps={{
                                MenuProps: { PaperProps: { style: { maxHeight: 200, overflowY: "auto" } } },
                                IconComponent: (props) => <i {...props} className="ri-arrow-down-s-line" style={{ color: "#555", fontSize: 20 }} />
                            }}
                            sx={{ backgroundColor: "#f5f5f5", borderRadius: 1 }}
                        >
                            <MenuItem value="all" sx={{ fontSize: '13px', borderBottom: '1px solid #eee' }}>
                                Tümü
                            </MenuItem>
                            {options.bijonlar.map((opt) => (
                                <MenuItem
                                    key={opt.value}
                                    value={opt.value}
                                    sx={{ fontSize: '13px', borderBottom: '1px solid #eee', '&:last-child': { borderBottom: 'none' } }}
                                >
                                    {opt.label}
                                </MenuItem>
                            ))}
                        </TextField>
                    </FormControl>
                </Grid>
            )}
            {/* Filtreleri Temizle */}
            {hasActiveFilters && (
                <Grid size={12} sx={{ mb: 2, mt: 1 }}>
                    <button
                        onClick={clearFilters}
                        style={{
                            width: '100%',
                            padding: '8px 16px',
                            backgroundColor: 'transparent',
                            border: '1px solid var(--cz-primary)',
                            borderRadius: '4px',
                            color: 'var(--cz-primary)',
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                        }}
                    >
                        <i className="ri-filter-off-line" style={{ fontSize: '16px' }} />
                        Filtreleri Temizle
                    </button>
                </Grid>
            )}
        </Grid>
    );
}