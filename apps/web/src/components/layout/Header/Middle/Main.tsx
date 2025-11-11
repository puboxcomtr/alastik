'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

// DB Connect
import { useThemeSettings } from '@hooks/Theme/useThemeSettings'

// Bootstrap Library
import { Container, Row, Col } from 'react-bootstrap'

// Partials
import SearchBox from '@components/layout/Header/Middle/Partials/SearchBox';
import ActionButtons from '@components/layout/Header/Middle/Partials/ActionButton';

interface MiddleProps {
    logo: string;
    siteName: string;
}
export default function Main({ logo, siteName }: MiddleProps) {
    const { settings, getImageUrl } = useThemeSettings()

    return (
        <Container className="navbar navbar-expand-lg d-block p-0">
            <Row className='row-fluid align-items-center px-2 py-lg-3'>
                <Col lg="3">
                    <Link prefetch={false} href="/" className="navbar-brand fs-2 py-0 m-0 me-auto me-sm-n5">
                        {settings?.logo && (
                            <img
                                className="shop-header__logo hide-mobile"
                                src={getImageUrl(settings.logo)}
                                alt={`${siteName} - Logo`}
                                width={207}
                                height={55}
                            />
                        )}
                    </Link>
                </Col>
                <Col lg="6">
                    <SearchBox
                    />
                </Col>
                <Col lg="3" className="d-flex justify-content-end">
                    <ActionButtons />
                </Col>
            </Row>
        </Container>
    );
}