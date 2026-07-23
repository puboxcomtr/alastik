"use client";

import { useState } from "react";

/* Library */
import Link from "next/link";
import { Button, CloseButton } from "react-bootstrap";
/* MUI */
import { Grid, Typography } from "@mui/material";

export default function CategoryTireSearch() {
    const [visible, setVisible] = useState(true);
    if (!visible) return null;
    return (
        <Grid
            container
            className="d-flex align-items-center border-bottom mb-4 p-4 position-relative"
            style={{
                boxShadow: "0 0 24px 0 rgba(0,0,0,.1),",
                backgroundColor: "#e3e3e3",
                marginTop: "15px",
                borderRadius: "5px"
            }}>
            <CloseButton
                onClick={() => setVisible(false)}
                className="position-absolute top-0 end-0 m-2"
            />
            <Grid size={12}>
                <Grid container alignItems="center">
                    <Grid size={5} className="d-flex align-items-center gap-2">
                        <i className="ri-chat-search-line fs-3"></i>
                        <Typography
                            className="fw-bold fs-7"
                            style={{ fontSize: "14px" }}
                        >
                            Adrese teslim veya hizmet noktasında ürünü aracınıza taktırın.
                        </Typography>
                    </Grid>
                    <Grid size={7}
                        sx={{
                            backgroundImage: "url('/lastikjantavm/assets/img/arrow-storeinfo.png')",
                            backgroundRepeat: "no-repeat",
                            backgroundPosition: "left center",
                            paddingLeft: "60px"
                        }}>
                        <Typography className="fw-normal" sx={{ fontSize: "14px", marginLeft: "20px", marginBottom: "5px" }}>
                            Siparişinizi verin, ürünleriniz adresinize kolayca teslim edilsin
                        </Typography>
                        <Typography className="fw-normal" sx={{ fontSize: "14px", marginLeft: "20px", marginBottom: "5px" }}>
                            Online sipariş edin, en yakın montaj noktasında kolayca takalım.
                            <Link
                                href="#!"
                                className="fw-bold text-decoration-none"
                                style={{
                                    color: "#e4cc15",
                                    fontSize: "14px",
                                    paddingLeft: "10px"
                                }}
                            >Montaj Noktası Seçiniz
                                <i className="ri-arrow-right-s-line"></i>
                            </Link>
                        </Typography>


                    </Grid>
                </Grid>
            </Grid>
        </Grid>
    );
}
