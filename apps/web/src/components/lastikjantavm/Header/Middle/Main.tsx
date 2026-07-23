'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

// DB Connect
import { useThemeSettings } from '@hooks/Theme/useThemeSettings'

// Bootstrap Library
import { Container, Row, Col } from 'react-bootstrap'

// Partials
import SearchBox from '@components/lastikjantavm/Header/Middle/Partials/SearchBox';
import ActionButtons from '@components/lastikjantavm/Header/Middle/Partials/ActionButton';

// Routes
import { ROUTES } from '@/src/config/routes';

interface MiddleProps {
    logo: string;
    siteName: string;
    onMenuOpen?: () => void;
}
export default function Main({ logo, siteName, onMenuOpen }: MiddleProps) {
    const { settings, getImageUrl } = useThemeSettings()
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

    return (
        <Container className="navbar navbar-expand-lg d-block p-0">
            <Row className='row-fluid align-items-center py-2 py-lg-3'>
                <Col xs="8" lg="3" className={mobileSearchOpen ? 'd-none d-lg-block' : ''}>
                    <Link prefetch={false} href={ROUTES.HOME} className="navbar-brand fs-2 py-0 m-0 me-auto me-sm-n5">
                        {settings?.logo && (
                            <img
                                className="header__logo"
                                src={getImageUrl(settings.logo)}
                                alt={`${siteName} - Logo`}
                                width={207}
                                height={55}
                            />
                        )}
                    </Link>
                </Col>
                <Col lg="6" className="d-none d-lg-flex">
                    <SearchBox />
                </Col>
                {mobileSearchOpen && (
                    <Col xs="12" className="d-lg-none">
                        <SearchBox
                            forceShow
                            autoFocus
                            onClose={() => setMobileSearchOpen(false)}
                        />
                    </Col>
                )}
                <Col xs="4" lg="3" className={`${mobileSearchOpen ? 'd-none d-lg-flex' : 'd-flex'} justify-content-end`}>
                    <ActionButtons
                        onMenuOpen={onMenuOpen}
                        onSearchToggle={() => setMobileSearchOpen(prev => !prev)}
                    />
                </Col>
            </Row>
        </Container>
    );
}