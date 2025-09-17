'use client';
import React from 'react';
import { useState, useCallback } from 'react';

// React - Bootstrap
import Nav from 'react-bootstrap/Nav';
import Dropdown from 'react-bootstrap/Dropdown';
import Link from 'next/link';
import Navbar from 'react-bootstrap/Navbar';
import Container from 'react-bootstrap/Container';
import Offcanvas from 'react-bootstrap/Offcanvas';

// Components
import MainMenu from '@components/layout/Header/Navbar/Partials/MainMenu'

export default function NavbarMain() {
    const [show, setShow] = useState(false);
    const handleClose = () => setShow(false);
    const handleOpen = () => setShow(true);
    return (
        <Container className="bg-black navbar navbar-expand-lg d-block p-0">
            <div className="row-fluid w-100">
                <Navbar expand="lg" className="p-2 w-100">
                    <Navbar.Toggle
                        aria-controls="stuckNav"
                        className="navbar-stuck-show me-3"
                        onClick={handleOpen}
                    />
                    {/* Desktop */}
                    <div className="collapse navbar-stuck-hide p-2 w-100" id="stuckNav">
                        {/* Mobile Menu */}
                        <Navbar.Offcanvas
                            id="navbarNav"
                            aria-labelledby="navbarNavLabel"
                            placement="start"
                            show={show}
                            onHide={handleClose}
                            className="offcanvas offcanvas-start"
                        >
                            <Offcanvas.Header closeButton className="offcanvas-header py-3">
                                <Offcanvas.Title id="navbarNavLabel" className="offcanvas-title">
                                    Menu
                                </Offcanvas.Title>
                            </Offcanvas.Header>
                            <Offcanvas.Body className="offcanvas-body align-items-center justify-content-between">
                                <MainMenu handleClose={handleClose} />
                            </Offcanvas.Body>
                            <div className="offcanvas-header border-top px-0 py-3 mt-3 d-md-none">
                                <div className="nav nav-justified w-100">
                                    <a className="nav-link border-end" href="account.html">
                                        <i className="ci-user fs-lg opacity-60 me-2"></i>
                                        Hesabım
                                    </a>
                                    <a className="nav-link" href="garage.html">
                                        <i className="ci-heart fs-lg opacity-60 me-2"></i>
                                        Garajım
                                    </a>
                                </div>
                            </div>
                        </Navbar.Offcanvas>
                    </div>
                </Navbar>
            </div>
        </Container>
    )

}