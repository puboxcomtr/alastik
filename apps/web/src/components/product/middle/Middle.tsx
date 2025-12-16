"use client";
import React, { useState, useEffect } from "react";

/* MUI */
import { Tooltip } from '@mui/material';
import { Grid, Typography, Rating, Link, Divider } from '@mui/material';
import { getProductDetailFeatures, getProductType, getProductSeason, getCategory } from '@/src/hooks/Products/productHelpers';


/* @import Page */
interface MiddleProps {
    product: Product;
    productName: string;
}

export default function Middle({ product, productName }: MiddleProps) {
    const features = getProductDetailFeatures(product);
    const [rating, setRating] = useState<number>(4.50);
    const [reviewCount, setReviewCount] = useState<number>(2);
    const season = getProductSeason(product);
    const categoryName = getCategory(product);
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
                                <li className="d-flex">
                                    <p className="fw-semibold mb-1 w-50">
                                        <Tooltip title="Lastiğin kullanım mevsimi" arrow placement="top">
                                            <span>Kategori</span>
                                        </Tooltip>
                                    </p >
                                    <p className="mb-1">
                                        <span className='d-flex align-items-center gap-1'>
                                            {season && (
                                                <img
                                                    src={season.icon}
                                                    alt={season.text}
                                                    width={15}
                                                    height={15}
                                                />
                                            )}
                                            <span>
                                                {categoryName}
                                            </span>
                                        </span>
                                    </p>
                                </li>
                                {features.map((feature, index) => (
                                    <li key={index} className="d-flex">
                                        <p className="fw-semibold mb-1 w-50">{feature.label}</p>
                                        <p className="mb-1">{feature.value}</p>
                                    </li>
                                ))}
                            </ul>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
        </>
    );
}