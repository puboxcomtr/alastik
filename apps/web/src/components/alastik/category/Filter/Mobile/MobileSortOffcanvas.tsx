"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { TextField, MenuItem, FormControl } from "@mui/material";
import { useTransition } from "react";

export default function MobileSortOffcanvas() {
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

    const handleSortChange = (value: string) => {
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

    const sortOptions = [
        { value: 'default', label: 'Çok Satanlar' },
        { value: 'price-asc', label: 'Fiyata Göre (Artan)' },
        { value: 'price-desc', label: 'Fiyata Göre (Azalan)' },
        { value: 'rating', label: 'Yüksek Puanlar' },
        { value: 'reviews', label: 'Çok Yorum Alanlar' }
    ];

    const currentValue = getCurrentFilter();

    return (
        <FormControl fullWidth>
            <TextField
                select
                fullWidth
                className="flex-fill w-100"
                label=""
                size="small"
                variant="outlined"
                value={currentValue}
                onChange={(e) => handleSortChange(e.target.value)}
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
                    borderRadius: 1,
                    border: "transparent",
                    borderColor: "#e0e5eb",
                }}
            >
                {sortOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                        {option.label}
                    </MenuItem>
                ))}
            </TextField>
        </FormControl>
    );
}