// apps/web/src/components/layout/Modals/AlternativeSizesModal.tsx
"use client";
import React, { useState, useEffect } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Typography, Button, Radio, Box } from '@mui/material';
import {
    fetchAlternativeSizes,
    getProductUrl,
    getLastikEbatDisplay,
    getBrandModel,
    getProductPrice,
    getProductPrice2,
    getProductFeature
} from '@/src/hooks/Products/productHelpers';

import { Product } from '@/src/types/products';

interface AlternativeSizesModalProps {
    open: boolean;
    onClose: () => void;
    product: Product;
}

export default function AlternativeSizesModal({ open, onClose, product }: AlternativeSizesModalProps) {
    const [alternatives, setAlternatives] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<string>('');

    useEffect(() => {
        if (open) {
            setLoading(true);
            fetchAlternativeSizes(product).then(data => {
                setAlternatives(data);
                if (data.length > 0) {
                    setSelectedProduct(data[0]._key);
                }
                setLoading(false);
            });
        }
    }, [open, product]);

    const handleProductSelect = (key: string) => {
        setSelectedProduct(key);
    };

    const handleGoToProduct = () => {
        const selected = alternatives.find(p => p._key === selectedProduct);
        if (selected) {
            window.location.href = getProductUrl(selected);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            sx={{
                '& .MuiDialog-container': {
                    alignItems: 'center'
                }
            }}>
            <DialogTitle sx={{ pb: 1 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">{getBrandModel(product)} Modeline Ait Diğer Ebatlar</Typography>
                    <IconButton
                        onClick={onClose}
                        sx={{ position: 'absolute', right: 8, top: 8 }}
                    >
                        <i className="ri-close-line"></i>
                    </IconButton>
                </Box>
            </DialogTitle>
            <DialogContent
                dividers
                sx={{
                    maxHeight: '650px',
                    overflowY: 'auto'
                }}>
                {loading ? (
                    <Typography>Yükleniyor...</Typography>
                ) : alternatives.length > 0 ? (

                    <div className="table-responsive">
                        <table className="table align-middle" style={{ fontSize: '14px' }}>
                            <thead>
                                <tr className="text-muted" style={{ fontSize: '12px', borderBottom: '2px solid #dee2e6' }}>
                                    <th style={{ width: '40px' }}></th>
                                    <th style={{ width: '150px' }}>Ebat</th>
                                    <th>Ürün Adı</th>
                                    <th style={{ width: '180px' }}>Teslimat</th>
                                    <th style={{ width: '120px', textAlign: 'right' }}>Fiyat</th>
                                </tr>
                            </thead>
                            <tbody>
                                {alternatives.map((p) => {
                                    const ebat = getLastikEbatDisplay(p);
                                    const markaModel = getBrandModel(p);
                                    const fiyat4 = getProductPrice(p);
                                    const fiyat2 = getProductPrice2(p);
                                    const isSelected = selectedProduct === p._key;
                                    const delivery = p.customData?.delivery || 'next_week';

                                    // Özellikler (XL, OEM, vb.)
                                    const features: string[] = [];
                                    if (getProductFeature(p, 'XL') === 'Evet') features.push('XL');
                                    if (getProductFeature(p, 'OEM') !== '-' && getProductFeature(p, 'OEM') !== 'Yok') {
                                        features.push(getProductFeature(p, 'OEM'));
                                    }
                                    const mevsim = getProductFeature(p, 'Mevsim');
                                    if (mevsim !== '-') features.push(mevsim === 'Kış' ? 'EV-c' : '');

                                    return (
                                        <tr
                                            key={p._key}
                                            className={isSelected ? 'site-border-left-primary' : ''}
                                            style={{
                                                cursor: 'pointer',
                                                backgroundColor: isSelected ? '#f8f9fa' : 'transparent',
                                                borderLeft: isSelected ? undefined : '3px solid transparent'
                                            }}
                                            onClick={() => handleProductSelect(p._key)}
                                        >
                                            <td>
                                                <Radio
                                                    checked={isSelected}
                                                    value={p._key}
                                                    size="small"
                                                    onChange={() => handleProductSelect(p._key)}
                                                />
                                            </td>
                                            <td style={{ fontWeight: 600 }}>
                                                {ebat}
                                            </td>
                                            <td>
                                                <Box>
                                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                        {markaModel}
                                                    </Typography>
                                                    {features.length > 0 && (
                                                        <Box display="flex" gap={0.5} mt={0.5}>
                                                            {features.filter(Boolean).map((f, i) => (
                                                                <Typography
                                                                    key={i}
                                                                    component="span"
                                                                    sx={{
                                                                        fontSize: '11px',
                                                                        color: 'primary.main',
                                                                        fontWeight: 600
                                                                    }}
                                                                >
                                                                    {f}
                                                                </Typography>
                                                            ))}
                                                        </Box>
                                                    )}
                                                </Box>
                                            </td>
                                            <td>
                                                <Box display="flex" alignItems="center" gap={1}>
                                                    <Box
                                                        sx={{
                                                            width: 8,
                                                            height: 8,
                                                            borderRadius: '50%',
                                                            bgcolor: 'success.main'
                                                        }}
                                                    />
                                                    <Typography variant="body2" sx={{ fontSize: '13px', color: 'success.main' }}>
                                                        {delivery === 'same_day' ? 'Aynı Gün Kargo' :
                                                            delivery === 'next_day' ? '1-2 Gün' :
                                                                '6-7 Gün'}
                                                    </Typography>
                                                </Box>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <Box>
                                                    {fiyat2 && fiyat2 > fiyat4 && (
                                                        <Typography
                                                            component="div"
                                                            sx={{
                                                                textDecoration: 'line-through',
                                                                color: 'text.black',
                                                                fontSize: '12px'
                                                            }}
                                                        >
                                                            {fiyat2.toLocaleString('tr-TR')}₺
                                                        </Typography>
                                                    )}
                                                    <Typography
                                                        component="div"
                                                        sx={{
                                                            fontWeight: 700,
                                                            color: '#000',
                                                            fontSize: '16px'
                                                        }}
                                                    >
                                                        {fiyat4.toLocaleString('tr-TR')} ₺
                                                    </Typography>
                                                </Box>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <Typography>Bu desene ait başka ebat bulunamadı.</Typography>
                )}
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'space-between', p: 2, borderTop: '1px solid #dee2e6' }}>
                <Button
                    onClick={onClose}
                    sx={{
                        color: 'error.main',
                        textTransform: 'none',
                        fontWeight: 600
                    }}
                    startIcon={<i className="ri-close-circle-line"></i>}
                >
                    İptal Et
                </Button>
                <Button
                    onClick={handleGoToProduct}
                    variant="contained"
                    disabled={!selectedProduct}
                    sx={{
                        textTransform: 'none',
                        fontWeight: 600,
                        bgcolor: 'error.main',
                        '&:hover': { bgcolor: '#5a6268' }
                    }}
                >
                    Ürünü İncele
                </Button>
            </DialogActions>
        </Dialog>
    );
}