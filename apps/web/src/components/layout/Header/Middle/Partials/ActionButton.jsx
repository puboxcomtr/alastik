'use client';

import * as React from 'react';
import Link from 'next/link';

// MUI
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';

// Icons
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';

export default function ActionButtons({
    isLoggedIn,
    user,
    handleAuthClick,
    setCartOpen,
    cartItemCount,
    authService,
    setIsLoggedIn,
    setUser,
    toast,
}) {
    const [menuAnchor, setMenuAnchor] = React.useState(null);
    const open = Boolean(menuAnchor);
    const handleOpenMenu = (e) => setMenuAnchor(e.currentTarget);
    const handleCloseMenu = () => setMenuAnchor(null);

    const onLogout = () => {
        handleCloseMenu();
        authService.logout();
        setIsLoggedIn(false);
        setUser(null);
        toast.auth.logoutSuccess();
        if (typeof window !== 'undefined') window.location.reload();
    };

    return (
        <div id="action_button" className="d-flex align-items-center gap-0 gap-lg-5">
            <button
                type="button"
                className="navbar-toggler d-none navbar-stuck-show me-3"
                data-bs-toggle="collapse"
                data-bs-target="#stuckNav"
                aria-controls="stuckNav"
                aria-expanded="false"
                aria-label="Toggle navigation in navbar stuck state"
            >
                <span className="navbar-toggler-icon"></span>
            </button>
            <button
                type="button"
                className="btn btn-icon btn-lg fs-xl btn-outline-secondary border-0 rounded-circle animate-shake d-lg-none"
                data-bs-toggle="offcanvas"
                data-bs-target="#searchBox"
                aria-controls="searchBox"
                aria-label="Toggle search bar"
            >
                <SearchIcon className="animate-target" />
            </button>
            {/* Giriş Kontrolü */}
            {isLoggedIn ? (
                <>
                    <Tooltip title="Hesabım">
                        <button
                            type="button"
                            onClick={handleOpenMenu}
                            className="btn btn-icon btn-lg fs-lg btn-outline-secondary border-0 rounded-circle animate-shake d-none d-md-inline-flex flex-column gap-1"
                            aria-haspopup="true"
                            aria-expanded={open ? 'true' : undefined}
                            aria-label="Kullanıcı menüsü"
                        >
                            <AccountCircleIcon className="animate-target" />
                            <span className="text-muted fs-xs fw-normal">{user?.email || 'Hesabım'}</span>
                        </button>
                        <Menu
                            anchorEl={menuAnchor}
                            open={open}
                            onClose={handleCloseMenu}
                            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                            slotProps={{ paper: { sx: { minWidth: 220 } } }}
                        >
                            <MenuItem component={Link} href="/account" onClick={handleCloseMenu}>Hesabım</MenuItem>
                            <MenuItem component={Link} href="/account/orders" onClick={handleCloseMenu}>Siparişlerim</MenuItem>
                            <MenuItem component={Link} href="/account/favorites" onClick={handleCloseMenu}>Favorilerim</MenuItem>
                            <MenuItem component={Link} href="/account/addresses" onClick={handleCloseMenu}>Adreslerim</MenuItem>
                            <MenuItem component={Link} href="/garage" onClick={handleCloseMenu}>Garajım</MenuItem>
                            <Divider />
                            <MenuItem onClick={onLogout}>Çıkış Yap</MenuItem>
                        </Menu>
                    </Tooltip>
                </>
            ) : (
                <Tooltip title="Giriş Yap">
                    <button
                        onClick={() => handleAuthClick('login')}
                        className="btn btn-icon btn-lg fs-lg btn-outline-secondary border-0 rounded-circle animate-shake d-none d-md-inline-flex flex-column gap-1"
                        type="button"
                    >
                        <i className="ri-user-line animate-target"></i>
                        <span className="text-muted fs-xs fw-normal">Giriş Yap</span>
                    </button>
                </Tooltip>
            )}
            {/* Giriş Kontrolü End */}
            {/* Giriş Kontrolü Garaj */}
            <Tooltip title={isLoggedIn ? "Kayıtlı Araçlarım" : "Garajım (Giriş Yap)"}>
                <Link
                    href={isLoggedIn ? "/garage" : "#"}
                    onClick={(e) => {
                        if (!isLoggedIn) {
                            e.preventDefault();
                            handleAuthClick('login');
                        }
                    }}
                    className="btn btn-icon btn-lg fs-lg btn-outline-secondary border-0 rounded-circle animate-pulse d-none d-md-inline-flex flex-column gap-1"
                >
                    <PlaceOutlinedIcon className="animate-target" />
                    <span className="text-muted fs-xs fw-normal">Garajım</span>
                </Link>
            </Tooltip>
            {/* Giriş Kontrolü Garaj End */}
            {/* Sepet */}
            <Tooltip title="Sepetim">
                <Badge
                    badgeContent={cartItemCount <= 0 ? 0 : cartItemCount}
                    showZero
                    color="primary"
                    sx={{
                        '& .MuiBadge-badge': {
                            right: 6,
                            top: 6,
                        }
                    }}
                >
                    <button
                        type="button"
                        className="btn btn-icon btn-lg fs-xl btn-outline-secondary position-relative border-0 rounded-circle animate-scale flex flex-column gap-1"
                        onClick={() => setCartOpen(true)}
                        aria-label="Shopping cart"
                    >
                        {/* {cartItemCount > 0 && (
                        <span
                            className="position-absolute top-0 start-100 badge fs-xs text-bg-primary rounded-pill ms-n4 z-2"
                            style={{
                                paddingTop: '.25em',
                                paddingBottom: '.25em',
                                paddingLeft: '.42em',
                                paddingRight: '.42em',
                            }}
                        >
                            {cartItemCount}
                        </span>
                    )}
                    <i className="ri-shopping-cart-2-line animate-target"></i>
                    <span className="d-none d-lg-block text-muted fs-xs fw-normal">Sepetim</span> */}
                        <i className="ri-shopping-cart-2-line animate-target"></i>
                        <span className="d-none d-lg-block text-muted fs-xs fw-normal">Sepetim</span>
                    </button>
                </Badge>
            </Tooltip>
            {/* Sepet End */}

            <button
                type="button"
                className="navbar-toggler"
                data-bs-toggle="offcanvas"
                data-bs-target="#navbarNav"
                aria-controls="navbarNav"
                aria-label="Toggle navigation"
            >
                <span className="navbar-toggler-icon"></span>
            </button>
        </div>
    );
}
