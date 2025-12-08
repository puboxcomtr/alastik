"use client";
import React, { useState, useEffect } from "react";

/* MUI */
import { Grid, Typography, Rating, Link } from '@mui/material';

export default function Middle() {
    const [value, setValue] = useState<number | null>(4);
    return (
        <>
            <Grid container>
                <Grid size={12}>
                    <Typography
                        className="fw-semibold d-block"
                        variant="h5"
                        component="h1"
                        gutterBottom
                        noWrap
                    >
                        Vredestein T-Trac 2 175/65 R14 82T
                    </Typography>
                </Grid>
                <Grid size={12}>
                    <div className="d-flex gap-4">
                        <div>
                            <Rating
                                name="product-rating"
                                value={value}
                                precision={0.5}
                                size="small"
                                onChange={(event, newValue) => {
                                    setValue(newValue);
                                }}
                            />
                            <span className="text-body-tertiary fs-xs">({value})</span>
                        </div>
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
        </>
    );
}