"use client";

import { Grid, TextField, MenuItem, Typography, FormControl } from "@mui/material";
import { Offcanvas } from "react-bootstrap";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { getTireFilterOptions, type TireFilterOptions, type FilterOption } from "@/src/services/filterService";
import { applyFilterWithCascade } from "@/src/utils/filterCascade";

interface RimsFilterProps {
    categorySlug?: string;
    tagSlug?: string;
}

interface RimFilterField {
    key: string;
    paramName: string;
    label: string;
    optionsKey: keyof TireFilterOptions;
}

const RIM_FILTER_FIELDS: RimFilterField[] = [
    { key: 'jantGenisligi', paramName: 'jantGenisligi', label: 'Jant Genişliği', optionsKey: 'jantGenislikleri' },
    { key: 'jantCap', paramName: 'jantCap', label: 'Jant Çapı', optionsKey: 'jantCaplari' },
    { key: 'bijonSayisi', paramName: 'bijonSayisi', label: 'Bijon Sayısı', optionsKey: 'bijonSayilari' },
    { key: 'bijon', paramName: 'bijon', label: 'Bijon Aralığı (PCD)', optionsKey: 'bijonAraliklari' },
    { key: 'gobekCapi', paramName: 'gobekCapi', label: 'Göbek Çapı', optionsKey: 'gobekCaplari' },
    { key: 'et', paramName: 'et', label: 'ET (Offset)', optionsKey: 'etler' },
    { key: 'renk', paramName: 'renk', label: 'Renk', optionsKey: 'renkler' }
];

export default function RimsFilter({ categorySlug, tagSlug }: RimsFilterProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [options, setOptions] = useState<TireFilterOptions | null>(null);
    const [values, setValues] = useState<Record<string, string>>(() => {
        const initial: Record<string, string> = {};
        RIM_FILTER_FIELDS.forEach(f => {
            initial[f.key] = searchParams.get(f.paramName) || 'all';
        });
        return initial;
    });

    const searchParamsString = searchParams.toString();

    useEffect(() => {
        const loadOptions = async () => {
            try {
                const activeFilters: Record<string, string | undefined> = {
                    jantGenisligi: searchParams.get('jantGenisligi') || undefined,
                    jantCap: searchParams.get('jantCap') || undefined,
                    bijonSayisi: searchParams.get('bijonSayisi') || undefined,
                    bijon: searchParams.get('bijon') || undefined,
                    gobekCapi: searchParams.get('gobekCapi') || undefined,
                    et: searchParams.get('et') || undefined,
                    renk: searchParams.get('renk') || undefined,
                    marka: searchParams.get('marka') || undefined
                };
                const data = await getTireFilterOptions(categorySlug, tagSlug, undefined, activeFilters);
                if (data) setOptions(data);
            } catch (error) {
                console.error('RimsFilter hatası:', error);
            }
        };
        loadOptions();
    }, [categorySlug, tagSlug, searchParamsString]);

    useEffect(() => {
        const next: Record<string, string> = {};
        RIM_FILTER_FIELDS.forEach(f => {
            next[f.key] = searchParams.get(f.paramName) || 'all';
        });
        setValues(next);
    }, [searchParams]);

    const updateURL = async (paramName: string, value: string) => {
        const cleaned = await applyFilterWithCascade(
            new URLSearchParams(searchParams.toString()),
            paramName,
            value,
            { categorySlug, tagSlug }
        );
        const queryString = cleaned.toString();
        router.push(queryString ? `${pathname}?${queryString}` : pathname);
    };

    const handleChange = (field: RimFilterField, value: string) => {
        setValues(prev => ({ ...prev, [field.key]: value }));
        updateURL(field.paramName, value);
    };

    const clearFilters = () => {
        const reset: Record<string, string> = {};
        RIM_FILTER_FIELDS.forEach(f => { reset[f.key] = 'all'; });
        setValues(reset);
        router.push(pathname);
    };

    const getEnhancedOptions = (field: RimFilterField): FilterOption[] => {
        return (options?.[field.optionsKey] as FilterOption[] | undefined) || [];
    };

    if (!options) {
        return (
            <Grid container sx={{ borderBottom: "1px solid #ddd", py: 2 }}>
                <Typography variant="body2" color="text.secondary">
                    Filtre seçenekleri yükleniyor...
                </Typography>
            </Grid>
        );
    }

    const hasActiveFilters = RIM_FILTER_FIELDS.some(f => searchParams.get(f.paramName));

    return (
        <Grid container sx={{ borderBottom: "1px solid #ddd" }}>
            {RIM_FILTER_FIELDS.map(field => {
                const enhancedOptions = getEnhancedOptions(field);
                if (enhancedOptions.length === 0) return null;

                return (
                    <Grid size={12} key={field.key} sx={{ mb: 2, mt: 1 }}>
                        <Offcanvas.Title className="mb-2" as="h6">{field.label}</Offcanvas.Title>
                        <FormControl fullWidth>
                            <TextField
                                select
                                fullWidth
                                size="small"
                                variant="outlined"
                                value={values[field.key]}
                                onChange={(e) => handleChange(field, e.target.value)}
                                SelectProps={{
                                    MenuProps: { PaperProps: { style: { maxHeight: 200, overflowY: "auto" } } },
                                    IconComponent: (props) => <i {...props} className="ri-arrow-down-s-line" style={{ color: "#555", fontSize: 20 }} />
                                }}
                                sx={{ backgroundColor: "#f5f5f5", borderRadius: 1 }}
                            >
                                <MenuItem value="all" sx={{ fontSize: '13px', borderBottom: '1px solid #eee' }}>
                                    Tümü
                                </MenuItem>
                                {enhancedOptions.map((opt) => (
                                    <MenuItem
                                        key={opt.value}
                                        value={opt.value}
                                        sx={{ fontSize: '13px', borderBottom: '1px solid #eee', '&:last-child': { borderBottom: 'none' } }}
                                    >
                                        {opt.label || opt.value}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </FormControl>
                    </Grid>
                );
            })}

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