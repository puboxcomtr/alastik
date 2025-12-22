"use client";
import React, { useState, useEffect } from "react";

/* ========================================
   MUI Components
   ======================================== */
// UI Components
import { Grid, Typography, Rating, Link, Divider, Tooltip } from '@mui/material';

/* ========================================
   Custom Hooks & Helpers
   ======================================== */
import {
    getProductDetailFeatures,
    getProductSeason,
    getCategory,
    isLastik,
    getProductUrl,
    fetchAlternativeSizes
} from '@/src/hooks/Products/productHelpers';

/* ========================================
   Layout Components
   ======================================== */
import AlternativeSizesModal from '@/src/components/layout/Modals/AlternativeSizesModal';

/* @import Page */
interface MiddleProps {
    product: Product;
    productName: string;
}

export default function Middle({ product, productName }: MiddleProps) {
    const features = getProductDetailFeatures(product);
    const [rating, setRating] = useState<number>(4.50);
    const [reviewCount, setReviewCount] = useState<number>(2);
    const [ebatDialogOpen, setEbatDialogOpen] = useState(false);
    const [showAlternativeLink, setShowAlternativeLink] = useState(false);
    const season = getProductSeason(product);
    const categoryName = getCategory(product);
    useEffect(() => {
        const checkAlternatives = async () => {
            const ozelkod5 = product.diaData?.ozelkod5kodu;
            if (!ozelkod5) {
                setShowAlternativeLink(false);
                return;
            }

            const alternatives = await fetchAlternativeSizes(product);
            setShowAlternativeLink(alternatives.length > 3);
        };

        checkAlternatives();
    }, [product]);
    const handleEbatClick = () => setEbatDialogOpen(true);
    return (
        <>
            <Grid container>
                <Grid size={12}>
                    <Grid container>
                        <Grid size={12}>
                            <Typography
                                className="fw-semibold d-block lh-sm"
                                variant="h6"
                                component="h1"
                                gutterBottom
                            >
                                {productName}
                            </Typography>
                        </Grid>
                        <Grid size={12}>
                            <div className="d-flex align-items-end gap-4 mb-4">
                                {/* Rating Component */}
                                <div className="d-flex gap-1">
                                    <Rating
                                        name="product-rating"
                                        value={rating}
                                        precision={0.5}
                                        readOnly
                                        size="small"
                                    />
                                    <Typography
                                        variant="body2"
                                        className="fs-xs text-muted"
                                        component="span"
                                    >
                                        {rating.toFixed(2)} ({reviewCount})
                                    </Typography>
                                </div>
                                {/* Test Sonuçları */}
                                <div className='d-flex gap-1'>
                                    <Link
                                        href="#reviews"
                                        className='fw-semibold text-decoration-none fs-sm d-flex gap-1'
                                        color='primary'>
                                        <span>{reviewCount} Lastik Test Sonucu</span>
                                        <i className="ri-arrow-down-wide-line text-primary fw-bold"></i>
                                    </Link>
                                </div>
                            </div>
                        </Grid>
                        <Grid size={12}>
                            <div className="d-flex align-items-end gap-4">
                                <Typography
                                    className="fw-semibold d-block lh-sm"
                                    variant="body1"
                                    gutterBottom
                                >
                                    Ürün Özellikleri
                                </Typography>
                            </div>
                        </Grid>
                        <Grid size={12}>
                            <Divider sx={{ my: 2 }} />
                        </Grid>
                        <Grid size={10}>
                            <ul className="p-0 m-0">
                                {features.map((feature, index) => (
                                    <li key={index} className="d-flex">
                                        <p className="fw-semibold mb-1 w-50">
                                            {feature.tooltip ? (
                                                <Tooltip title={feature.tooltip} arrow placement="top">
                                                    <span>
                                                        {feature.label}
                                                        <i className="ri-information-line ms-1 text-muted" style={{ fontSize: '14px' }}></i>
                                                    </span>
                                                </Tooltip>
                                            ) : (
                                                feature.label
                                            )}
                                        </p>
                                        <p className="mb-1">
                                            {feature.label === 'Ebat' && showAlternativeLink ? (  
                                                <Link
                                                    component="button"
                                                    onClick={handleEbatClick}
                                                    className="text-decoration-none fw-semibold cursor-pointer"
                                                    sx={{ cursor: 'pointer' }}
                                                >
                                                    {feature.value}
                                                    <i className="ri-pencil-line ms-1"></i>
                                                </Link>
                                            ) : (
                                                feature.value
                                            )}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
            <AlternativeSizesModal
                open={ebatDialogOpen}
                onClose={() => setEbatDialogOpen(false)}
                product={product}
            />
        </>
    );
}