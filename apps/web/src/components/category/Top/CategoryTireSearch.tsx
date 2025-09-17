"use client";

import { useState } from "react";
/* Library */
import { Offcanvas, Button } from "react-bootstrap";
/* MUI */
import { Grid, TextField, MenuItem, Tooltip, Typography, FormControl } from "@mui/material";

export default function CategoryTireSearch() {
    return (
        <Grid container className="d-flex align-items-center border-bottom mb-4 p-4" style={{ boxShadow: "0 0 24px 0 rgba(0,0,0,.1)" }}>
            <Grid size={8}>
                <Grid container alignItems="center">
                    <Grid size={1}>
                        <i className="ri-chat-search-line fs-1 text-primary"></i>
                    </Grid>
                    <Grid size={11}>
                        <Typography className="fw-semibold" sx={{ fontSize: "15px", marginLeft: "20px" }}>
                            Ücretsiz ve online lastik danışmanlığı aracınıza özel çözümler sunar
                        </Typography>
                    </Grid>
                </Grid>
            </Grid>
            <Grid size={4} className="d-flex justify-content-end">
                <Button variant="outline-primary" color="primary"
                    data-bs-toggle="modal"
                    data-bs-target="#tireSearch">
                    Uygun Lastik Bul
                </Button>
            </Grid>
        </Grid>
    );
}
