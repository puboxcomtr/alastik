"use client";

import { Grid, TextField, MenuItem, Tooltip, Typography, FormControl } from "@mui/material";
import { Offcanvas } from "react-bootstrap";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { getTireFilterOptions, type TireFilterOptions } from "@/src/services/filterService";
import { applyFilterWithCascade } from "@/src/utils/filterCascade";

interface TireFiltersProps {
    hideEbatFilters?: boolean;
    categorySlug?: string;
    tagSlug?: string;
}

export default function TireFilters({ hideEbatFilters = false, categorySlug, tagSlug }: TireFiltersProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [options, setOptions] = useState<TireFilterOptions | null>(null);

    const [width, setWidth] = useState(searchParams.get('genislik') || 'all');
    const [height, setHeight] = useState(searchParams.get('yanak') || 'all');
    const [rim, setRim] = useState(searchParams.get('jant') || 'all');
    const [vehicleType, setVehicleType] = useState(searchParams.get('arac') || 'all');

   const searchParamsString = searchParams.toString();

    useEffect(() => {
        const loadOptions = async () => {
            try {
                const activeFilters: Record<string, string | undefined> = {
                    genislik: searchParams.get('genislik') || undefined,
                    yanak: searchParams.get('yanak') || undefined,
                    jant: searchParams.get('jant') || undefined,
                    arac: searchParams.get('arac') || undefined,
                    marka: searchParams.get('marka') || undefined,
                    mevsim: searchParams.get('mevsim') || undefined,
                    oem: searchParams.get('oem') || undefined,
                    yukEndeksi: searchParams.get('yukEndeksi') || undefined,
                    hizEndeksi: searchParams.get('hizEndeksi') || undefined,
                    ozellik: searchParams.get('ozellik') || undefined,
                    uretim: searchParams.get('uretim') || undefined
                };
                const data = await getTireFilterOptions(categorySlug, tagSlug, undefined, activeFilters);
                if (data) {
                    setOptions(data);
                }
            } catch (error) {
                console.error('TireFilter hatası:', error);
            }
        };
        loadOptions();
    }, [categorySlug, tagSlug, searchParamsString]);

    useEffect(() => {
        setWidth(searchParams.get('genislik') || 'all');
        setHeight(searchParams.get('yanak') || 'all');
        setRim(searchParams.get('jant') || 'all');
        setVehicleType(searchParams.get('arac') || 'all');
    }, [searchParams]);

    // Backend ne döndürürse o göster (cascading sonucu)
    const enhancedWidths = options?.widths || [];
    const enhancedAspects = options?.aspects || [];
    const enhancedRims = options?.rims || [];
    const enhancedVehicleTypes = options?.vehicleTypes || [];

    const updateURL = async (key: string, value: string) => {
        const cleaned = await applyFilterWithCascade(
            new URLSearchParams(searchParams.toString()),
            key,
            value,
            { categorySlug, tagSlug }
        );
        const queryString = cleaned.toString();
        router.push(queryString ? `${pathname}?${queryString}` : pathname);
    };

    const handleWidthChange = (value: string) => {
        setWidth(value);
        updateURL('genislik', value);
    };

    const handleHeightChange = (value: string) => {
        setHeight(value);
        updateURL('yanak', value);
    };

    const handleRimChange = (value: string) => {
        setRim(value);
        updateURL('jant', value);
    };

    const handleVehicleTypeChange = (value: string) => {
        setVehicleType(value);
        updateURL('arac', value);
    };

    if (!options) {
        return (
            <Grid container sx={{ borderBottom: "1px solid #ddd", py: 2 }}>
                <Typography variant="body2" color="text.secondary">
                    Filtre seçenekleri yüklenemedi
                </Typography>
            </Grid>
        );
    }

    return (
        <Grid container sx={{ borderBottom: "1px solid #ddd" }}>
            {/* Araç Tipi */}
            {enhancedVehicleTypes.length > 0 && (
                <Grid size={12} sx={{ mb: 2, mt: 1 }}>
                    <Offcanvas.Title className="mb-2" as="h6">Araç Tipi</Offcanvas.Title>
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
                            {enhancedVehicleTypes.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}
                                    sx={{
                                        fontSize: '13px',
                                        borderBottom: '1px solid #eee',
                                        '&:last-child': { borderBottom: 'none' }
                                    }}>
                                    {opt.label}
                                </MenuItem>
                            ))}
                        </TextField>
                    </FormControl>
                </Grid>
            )}

            {/* Taban Genişliği */}
            {!hideEbatFilters && enhancedWidths.length > 0 && (
                <Grid size={12} sx={{ mb: 2, mt: 1 }}>
                    <Offcanvas.Title className="mb-2" as="h6">
                        Taban Genişliği
                        <Tooltip
                            title={
                                <Typography variant="body2" sx={{ maxWidth: 300 }}>
                                    Lastik satın alımınız için doğru lastik ebatını belirlemeniz önemlidir.
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
                            value={width}
                            onChange={(e) => handleWidthChange(e.target.value)}
                            SelectProps={{
                                MenuProps: { PaperProps: { style: { maxHeight: 200, overflowY: "auto" } } },
                                IconComponent: (props) => <i {...props} className="ri-arrow-down-s-line" style={{ color: "#555", fontSize: 20 }} />
                            }}
                            sx={{ backgroundColor: "#f5f5f5", borderRadius: 1 }}
                        >
                            <MenuItem value="all" sx={{ fontSize: '13px', borderBottom: '1px solid #eee' }}>
                                Tümü
                            </MenuItem>
                            {enhancedWidths.map((opt) => (
                                <MenuItem
                                    key={opt.value}
                                    value={opt.value}
                                    sx={{
                                        fontSize: '13px',
                                        borderBottom: '1px solid #eee',
                                        '&:last-child': { borderBottom: 'none' }
                                    }}
                                >
                                    {opt.label}
                                </MenuItem>
                            ))}
                        </TextField>
                    </FormControl>
                </Grid>
            )}

            {/* Yanak Yüksekliği */}
            {!hideEbatFilters && enhancedAspects.length > 0 && (
                <Grid size={12} sx={{ mb: 2, mt: 1 }}>
                    <Offcanvas.Title className="mb-2" as="h6">
                        Yanak Yüksekliği
                        <Tooltip
                            title={
                                <Typography variant="body2" sx={{ maxWidth: 300 }}>
                                    Lastik satın alımınız için doğru lastik ebatını belirlemeniz önemlidir.
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
                            value={height}
                            onChange={(e) => handleHeightChange(e.target.value)}
                            SelectProps={{
                                MenuProps: { PaperProps: { style: { maxHeight: 200, overflowY: "auto" } } },
                                IconComponent: (props) => <i {...props} className="ri-arrow-down-s-line" style={{ color: "#555", fontSize: 20 }} />
                            }}
                            sx={{ backgroundColor: "#f5f5f5", borderRadius: 1 }}
                        >
                            <MenuItem value="all" sx={{ fontSize: '13px', borderBottom: '1px solid #eee' }}>
                                Tümü
                            </MenuItem>
                            {enhancedAspects.map((opt) => (
                                <MenuItem
                                    key={opt.value}
                                    value={opt.value}
                                    sx={{
                                        fontSize: '13px',
                                        borderBottom: '1px solid #eee',
                                        '&:last-child': { borderBottom: 'none' }
                                    }}
                                >
                                    {opt.label}
                                </MenuItem>
                            ))}
                        </TextField>
                    </FormControl>
                </Grid>
            )}

            {/* Jant Çapı */}
            {!hideEbatFilters && enhancedRims.length > 0 && (
                <Grid size={12} sx={{ mb: 2, mt: 1 }}>
                    <Offcanvas.Title className="mb-2" as="h6">
                        Jant Çapı
                        <Tooltip
                            title={
                                <Typography variant="body2" sx={{ maxWidth: 300 }}>
                                    Lastik satın alımınız için doğru lastik ebatını belirlemeniz önemlidir.
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
                            value={rim}
                            onChange={(e) => handleRimChange(e.target.value)}
                            SelectProps={{
                                MenuProps: { PaperProps: { style: { maxHeight: 200, overflowY: "auto" } } },
                                IconComponent: (props) => <i {...props} className="ri-arrow-down-s-line" style={{ color: "#555", fontSize: 20 }} />
                            }}
                            sx={{ backgroundColor: "#f5f5f5", borderRadius: 1 }}
                        >
                            <MenuItem value="all" sx={{ fontSize: '13px', borderBottom: '1px solid #eee' }}>
                                Tümü
                            </MenuItem>
                            {enhancedRims.map((opt) => (
                                <MenuItem
                                    key={opt.value}
                                    value={opt.value}
                                    sx={{
                                        fontSize: '13px',
                                        borderBottom: '1px solid #eee',
                                        '&:last-child': { borderBottom: 'none' }
                                    }}
                                >
                                    {opt.label}
                                </MenuItem>
                            ))}
                        </TextField>
                    </FormControl>
                </Grid>
            )}

            {/* Filtreleri Temizle */}
            {(searchParams.get('genislik') || searchParams.get('yanak') || searchParams.get('jant') || searchParams.get('arac')) && (
                <Grid size={12} sx={{ mb: 2, mt: 1 }}>
                    <button
                        onClick={() => {
                            setWidth('all');
                            setHeight('all');
                            setRim('all');
                            setVehicleType('all');
                            router.push(pathname);
                        }}
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