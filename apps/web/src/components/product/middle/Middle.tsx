"use client";
import React, { useState, useEffect } from "react";

/* MUI */
import { Grid, Typography, Rating, Link } from '@mui/material';

/* @import Page */
interface MiddleProps {
    product: Product;
    productName: string;
}

export default function Middle({ product, productName }: MiddleProps) {
    return (
        <>
            <Grid container>
                <Grid size={12}>
                    <Grid container>
                        <Grid size={12}>
                            <Typography
                                className="fw-semibold d-block"
                                variant="h6"
                                component="h1"
                                gutterBottom
                            >
                                {productName}
                            </Typography>
                        </Grid>
                        <Grid size={12}>
                            <div className="d-flex gap-4">
                                <div className='d-flex gap-1'>
                                    <Link
                                        href="#!"
                                        className='fw-semibold text-decoration-none fs-sm d-flex gap-1'
                                        color='primary'>
                                        <span>2 Lastik Test Sonucu</span>
                                        <i className="ri-arrow-down-wide-line text-primary fw-bold"></i>
                                    </Link>

                                </div>
                            </div>
                        </Grid>
                    </Grid>
                </Grid>
                <Grid size={12}>
                    Feature
                </Grid>
            </Grid>
        </>
    );
}