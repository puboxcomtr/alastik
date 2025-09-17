"use client";
import React, { useState, useEffect } from "react";

/* MUI */
import { Grid } from '@mui/material';
/* @import Page */
import Title from '@/src/components/product/middle/Title'


export default function Middle() {
    return (
        <>
            <Grid container>
                <Grid size={12}>
                    <Title />
                </Grid>
                <Grid size={12}>
                    Feature
                </Grid>
            </Grid>
        </>
    );
}