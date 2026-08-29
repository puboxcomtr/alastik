"use client";

import { useState } from "react";
/* Library */
import { Offcanvas, Button } from "react-bootstrap";
import { Col, Container, Row } from 'react-bootstrap';
/* MUI */
import { TextField, MenuItem, Tooltip, Typography, FormControl } from "@mui/material";

type CategoryTireSearchProps = {
    /** Arama sonucunun açılacağı ürün durumu (örn. 'ikinci-el'); boşsa sıfır ürünler */
    condition?: string;
};

export default function CategoryTireSearch({ condition }: CategoryTireSearchProps = {}) {
    return (
        <Container className="border-bottom mb-4 pb-3 px-0">
            <Row className="align-items-center">
                <Col xs={6} md={8}>
                    <Row className="align-items-center ">
                        <Col md={1} className="d-none d-md-block">
                            <i className="ri-chat-search-line fs-1 text-primary"></i>
                        </Col>
                        <Col xs={12} md={11}>
                            <Typography
                                className="fw-semibold"
                                sx={{
                                    fontSize: { xs: "13px", md: "15px" },
                                    marginLeft: { xs: "10px", md: "20px" }
                                }}
                            >
                                Aracınıza en uygun lastiği hemen bulun.
                            </Typography>
                        </Col>
                    </Row>
                </Col>
                <Col xs={6} md={4} className="d-flex justify-content-end">
                    <Button
                        variant="outline-primary"
                        color="primary"
                        className="btn-sm btn-md-xl btn-xl"
                        onClick={() => {
                            const event = new CustomEvent('openTireSearchModal', { detail: { condition } });
                            window.dispatchEvent(event);
                        }}
                    >
                        Uygun Lastik Bul
                    </Button>
                </Col>
            </Row>
        </Container>
    );
}