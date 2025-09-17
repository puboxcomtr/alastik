"use client";

import { useState } from "react";
/* Library */
import { Offcanvas, Button } from "react-bootstrap";
/* MUI */
import { Grid, TextField, MenuItem, Tooltip, Typography, FormControl } from "@mui/material";

export default function CategoryTop() {
    /* Input Conts */
    const [order, setOrder] = useState("all");
    const [filter, setFilter] = useState("default");
    return (
        <div>
            <div className="offcanvas-lg offcanvas-start pe-lg-4" id="filterSidebar">
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
                    <Grid size={6}>
                        <Typography className='fw-bold' sx={{ fontSize: "14px" }}>
                            42996  eşleşen ürün bulundu
                        </Typography>
                    </Grid>
                    <Grid size={6} className="d-flex justify-content-end">
                        <Grid size={6}>
                            <FormControl fullWidth>
                                <TextField
                                    select
                                    fullWidth
                                    label=""
                                    size="small"
                                    defaultValue="all"
                                    variant="outlined"
                                    value={order}
                                    onChange={(e) => setOrder(e.target.value)}
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
                                    <MenuItem value="all">Tümünü Göster</MenuItem>
                                    <MenuItem value="1">Stokta Var</MenuItem>
                                    <MenuItem value="2">Stokta Yok</MenuItem>
                                </TextField>
                            </FormControl>
                        </Grid>
                        <Grid size={6} sx={{ml: '20px'}}>
                            <FormControl fullWidth>
                                <TextField
                                    select
                                    fullWidth
                                    label=""
                                    size="small"
                                    defaultValue="all"
                                    variant="outlined"
                                    value={filter}
                                    onChange={(e) => setFilter(e.target.value)}
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
                                    <MenuItem value="1">Fiyata Göre (Artan)</MenuItem>
                                    <MenuItem value="2">Fiyata Göre (Azalan)</MenuItem>
                                    <MenuItem value="3">Yüksek Puanlar</MenuItem>
                                    <MenuItem value="4">Çok Yorum Alanlar</MenuItem>
                                </TextField>
                            </FormControl>
                        </Grid>
                    </Grid>
                </Grid>
            </div>
        </div>
    );
}
