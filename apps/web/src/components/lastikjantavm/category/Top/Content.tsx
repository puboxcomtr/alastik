"use client";
import { useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Offcanvas, Button } from "react-bootstrap";
import { Grid, TextField, MenuItem, Typography, FormControl, Tooltip } from "@mui/material";
import { useViewMode } from "@/src/context/ViewModeContext";

interface CategoryTopProps {
    productCount?: number;
    categoryName?: string;
}

export default function CategoryTop({
    productCount = 0,
    categoryName = "Ürünler"
}: CategoryTopProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const currentSortBy = searchParams.get('sortBy') || '';
    const currentSortOrder = searchParams.get('sortOrder') || '';

    const getCurrentFilter = () => {
        if (currentSortBy === 'price' && currentSortOrder === 'asc') return 'price-asc';
        if (currentSortBy === 'price' && currentSortOrder === 'desc') return 'price-desc';
        if (currentSortBy === 'rating') return 'rating';
        if (currentSortBy === 'reviews') return 'reviews';
        if (currentSortBy === 'sales') return 'sales';
        return 'default';
    };
    const { viewMode, setViewMode } = useViewMode();
    const handleFilterChange = (value: string) => {
        const params = new URLSearchParams(searchParams.toString());

        params.delete('page');

        if (value === 'price-asc') {
            params.set('sortBy', 'price');
            params.set('sortOrder', 'asc');
        } else if (value === 'price-desc') {
            params.set('sortBy', 'price');
            params.set('sortOrder', 'desc');
        } else if (value === 'rating') {
            params.set('sortBy', 'rating');
            params.delete('sortOrder');
        } else if (value === 'reviews') {
            params.set('sortBy', 'reviews');
            params.delete('sortOrder');
        } else if (value === 'sales') {
            params.set('sortBy', 'sales');
            params.delete('sortOrder');
        } else {
            params.delete('sortBy');
            params.delete('sortOrder');
        }

        const newURL = `${pathname}?${params.toString()}`;

        startTransition(() => {
            router.replace(newURL, { scroll: false });
            router.refresh();
        });
    };

    return (
        <div>
            <div className="offcanvas-lg offcanvas-start" id="filterSidebar">
                <div className="offcanvas-header py-3">
                    <Offcanvas.Title as="h3">Filtrele</Offcanvas.Title>
                    <Button
                        variant=""
                        className="btn-close"
                        data-bs-dismiss="offcanvas"
                        data-bs-target="#filterSidebar"
                        aria-label="Close"
                    />
                </div>
                <Grid container className="border-bottom pb-4 mb-4">
                    
                    <Grid size={6} className="d-flex align-items-center">
                        <Typography component="h1" variant="h6" className="fw-bold mb-0">
                            {categoryName}
                        </Typography>
                    </Grid>
                    <Grid size={6} className="d-flex justify-content-end">
                        <Grid size={6} sx={{ mr: '20px' }}>
                            <FormControl fullWidth>
                                <TextField
                                    select
                                    fullWidth
                                    label=""
                                    size="small"
                                    variant="outlined"
                                    value={getCurrentFilter()}
                                    onChange={(e) => handleFilterChange(e.target.value)}
                                    disabled={isPending}
                                    InputLabelProps={{ style: { color: "#000" } }}
                                    SelectProps={{
                                        MenuProps: {
                                            PaperProps: {
                                                style: {
                                                    maxHeight: 200,
                                                    overflowY: "auto",
                                                },
                                            },
                                        },
                                        IconComponent: (props) => (
                                            <i
                                                {...props}
                                                className="ri-arrow-down-s-line"
                                                style={{ color: "#555", fontSize: 20 }}
                                            />
                                        ),
                                    }}
                                    sx={{
                                        backgroundColor: "#f5f5f5",
                                        borderRadius: 1,
                                        border: "transparent",
                                    }}
                                >
                                    <MenuItem value="default">Çok Satanlar</MenuItem>
                                    <MenuItem value="price-asc">Fiyata Göre (Artan)</MenuItem>
                                    <MenuItem value="price-desc">Fiyata Göre (Azalan)</MenuItem>
                                    <MenuItem value="rating">Yüksek Puanlar</MenuItem>
                                    <MenuItem value="reviews">Çok Yorum Alanlar</MenuItem>
                                </TextField>
                            </FormControl>
                        </Grid>
                        <Grid size="auto" className="d-flex align-items-center gap-2 ms-2">
                            <Tooltip title="Çoklu Ürün Görünümü">
                                <button
                                    type="button"
                                    className={`btn btn-sm btn-icon ${viewMode === 'grid' ? 'btn-dark' : 'btn-outline-secondary'}`}
                                    onClick={() => setViewMode('grid')}
                                >
                                    <i className="ri-layout-grid-line"></i>
                                </button>
                            </Tooltip>

                            <Tooltip title="Tekli Ürün Görünümü">
                                <button
                                    type="button"
                                    className={`btn btn-sm btn-icon ${viewMode === 'list' ? 'btn-dark' : 'btn-outline-secondary'}`}
                                    onClick={() => setViewMode('list')}
                                    aria-label="Liste görünümü"
                                >
                                    <i className="ri-list-check"></i>
                                </button>
                            </Tooltip>
                        </Grid>
                    </Grid>
                </Grid>
            </div>
        </div>
    );
}