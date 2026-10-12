'use client';
import React from 'react';
import Link from 'next/link';
import Offcanvas from 'react-bootstrap/Offcanvas';
import { ROUTES } from '@/src/config/routes';
import { useTranslations } from '@/src/hooks/Theme/useTranslations';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import { useAuth } from '@/src/hooks/Theme/useAuth';
import MainMenu from '@components/lastikjantavm/Header/Navbar/Partials/MainMenu';

type Props = {
    show: boolean;
    onClose: () => void;
}

export default function MobileMenu({ show, onClose }: Props) {
    const { t } = useTranslations();
    const { isLoggedIn, user, clearAuth } = useAuth();

    const handleLogout = () => {
        clearAuth();
        onClose();
        window.location.href = ROUTES.HOME;
    };

    return (
        <Offcanvas
            id="navbarNav"
            aria-labelledby="navbarNavLabel"
            placement="start"
            show={show}
            onHide={onClose}
        >
            <Offcanvas.Header closeButton className='border-bottom'>
                <Offcanvas.Title id="navbarNavLabel">
                    Menu
                </Offcanvas.Title>
            </Offcanvas.Header>
            <Offcanvas.Body className="align-items-center justify-content-between pt-3">
                <MainMenu handleClose={onClose} />
            </Offcanvas.Body>
            <div className="border-top px-0 py-3 mt-3 d-md-none">
                {/* Kendi lastiğiyle montaj satın alma (alastik ile aynı akış) */}
                <Link href={ROUTES.MONTAGE_BUY} className="nav-link justify-content-center fw-semibold mb-2" onClick={onClose}>
                    <BuildOutlinedIcon className="opacity-60 me-2" sx={{ fontSize: 20 }} />
                    Montaj Satın Al
                </Link>
                {/* Montaj noktası (bayi) başvuru formu */}
                <Link href="/bayi-formu" className="nav-link justify-content-center fw-semibold mb-2" onClick={onClose}>
                    <StorefrontOutlinedIcon className="opacity-60 me-2" sx={{ fontSize: 20 }} />
                    Montaj Noktamız Ol
                </Link>
                <div className="nav nav-justified w-100">
                    {isLoggedIn ? (
                        <div className="nav-link border-end d-flex flex-column align-items-center" role="button">
                            <Link href={ROUTES.ACCOUNT} className="text-decoration-none text-body" onClick={onClose}>
                                <AccountCircleIcon className="opacity-60 me-1" sx={{ fontSize: 18 }} />
                                {user?.firstName} {user?.lastName}
                            </Link>
                            <button
                                type="button"
                                className="btn btn-link text-muted p-0 fs-xs text-decoration-none"
                                onClick={handleLogout}
                            >
                                Çıkış Yap
                            </button>
                        </div>
                    ) : (
                        <Link href={ROUTES.LOGIN} className="nav-link border-end" onClick={onClose}>
                            <AccountCircleIcon className="opacity-60 me-2" sx={{ fontSize: 20 }} />
                            {t('login_button')}
                        </Link>
                    )}

                    {isLoggedIn ? (
                        <Link href={ROUTES.ACCOUNT_VEHICLES} className="nav-link" onClick={onClose}>
                            <PlaceOutlinedIcon className="opacity-60 me-2" sx={{ fontSize: 20 }} />
                            {t('my_garage')}
                        </Link>
                    ) : (
                        <Link href={ROUTES.LOGIN} className="nav-link" onClick={onClose}>
                            <PlaceOutlinedIcon className="opacity-60 me-2" sx={{ fontSize: 20 }} />
                            {t('my_garage')}
                        </Link>
                    )}
                </div>
            </div>
        </Offcanvas>
    );
}