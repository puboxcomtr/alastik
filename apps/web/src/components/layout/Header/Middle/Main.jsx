'use client';
import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

// Bootstrap Library
import { Container, Row, Col } from 'react-bootstrap'

// Partials
import SearchBox from '@components/layout/Header/Middle/Partials/SearchBox';
import ActionButtons from '@components/layout/Header/Middle/Partials/ActionButton';


export default function Main({
    searchTerm,
    setSearchTerm,
    handleSearch,
    isLoggedIn,
    user,
    handleAuthClick,
    setIsLoggedIn,
    setUser,
    setCartOpen,
    cartItemCount,
    authService,
    toast,
}) {
    return (
        <Container className="navbar navbar-expand-lg d-block p-0">
            <Row className='row-fluid align-items-center px-2 py-lg-3'>
                <Col lg="3">
                    <Link prefetch={false} href="/" className="navbar-brand fs-2 py-0 m-0 me-auto me-sm-n5">
                        <img
                            className="shop-header__logo hide-mobile"
                            src="/assets/img/logo/website_logo.png"
                            alt="siteadı.com - Logo"
                            style={{ width: '150px' }}
                            width={207}
                            height={55}
                        />
                    </Link>
                </Col>
                <Col lg="6">
                    <SearchBox
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        onSubmit={handleSearch}
                    />
                </Col>
                <Col lg="3" className="d-flex justify-content-end">
                    <ActionButtons
                        isLoggedIn={isLoggedIn}
                        user={user}
                        handleAuthClick={handleAuthClick}
                        setCartOpen={setCartOpen}
                        cartItemCount={cartItemCount}
                        authService={authService}
                        setIsLoggedIn={setIsLoggedIn}
                        setUser={setUser}
                        toast={toast}
                    />
                </Col>
            </Row>
        </Container>
    );
}
