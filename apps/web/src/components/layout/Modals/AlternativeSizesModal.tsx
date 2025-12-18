// apps/web/src/components/layout/Modals/AlternativeSizesModal.tsx
"use client";
import React, { useState, useEffect } from "react";
import { Dialog, DialogTitle, DialogContent, IconButton, Typography, Link } from '@mui/material';
import { fetchAlternativeSizes, getProductUrl } from '@/src/hooks/Products/productHelpers';
import { Product } from '@/src/types/products';

interface AlternativeSizesModalProps {
    open: boolean;
    onClose: () => void;
    product: Product;
    productName: string;
}

export default function AlternativeSizesModal({ open, onClose, product, productName }: AlternativeSizesModalProps) {
    const [alternatives, setAlternatives] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            setLoading(true);
            fetchAlternativeSizes(product, productName).then(data => {
                setAlternatives(data);
                setLoading(false);
            });
        }
    }, [open, product, productName]);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                Bu Desene Ait Diğer Ebatlar
                <IconButton
                    onClick={onClose}
                    sx={{ position: 'absolute', right: 8, top: 8 }}
                >
                    <i className="ri-close-line"></i>
                </IconButton>
            </DialogTitle>
            <DialogContent>
                {loading ? (
                    <Typography>Yükleniyor...</Typography>
                ) : alternatives.length > 0 ? (
                    <ul className="list-unstyled">
                        {alternatives.map((p) => (
                            <li key={p._key} className="py-2 border-bottom">
                                <Link href={getProductUrl(p)} className="text-decoration-none">
                                    {p.customData?.seoTitle || p.diaData?.aciklama}
                                </Link>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <Typography>Bu desene ait başka ebat bulunamadı.</Typography>
                )}
            </DialogContent>
        </Dialog>
    );
}