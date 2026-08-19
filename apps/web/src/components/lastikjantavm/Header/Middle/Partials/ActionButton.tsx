'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';

// MUI
import Tooltip from '@mui/material/Tooltip';
import Badge from '@mui/material/Badge';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';

// Icons
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import SearchIcon from '@mui/icons-material/Search';

// Hooks
import { useTranslations } from '@/src/hooks/Theme/useTranslations';
import { useAuth } from '@/src/hooks/Theme/useAuth';
import { useCart } from '@/src/context/CartContext';

// Routes
import { ROUTES } from '@/src/config/routes';

interface ActionButtonsProps {
    onMenuOpen?: () => void;
    onSearchToggle?: () => void;
}

export default function ActionButtons({ onMenuOpen, onSearchToggle }: ActionButtonsProps) {
    const { totals } = useCart();
    const cartItemCount = totals.itemCount;

    const router = useRouter();
    const { t } = useTranslations();
    const { isLoggedIn, user, clearAuth } = useAuth();
    const [menuAnchor, setMenuAnchor] = React.useState<null | HTMLElement>(null);
    const open = Boolean(menuAnchor);

    const handleLogout = () => {
        clearAuth();
        toast.success('Çıkış yapıldı');
        window.location.href = ROUTES.HOME;
    };

    const handleOpenMenu = (e: React.MouseEvent<HTMLElement>) => setMenuAnchor(e.currentTarget);
    const handleCloseMenu = () => setMenuAnchor(null);

    const handleLoginClick = () => {
        router.push(ROUTES.LOGIN);
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
                onClick={onSearchToggle}
                aria-label="Toggle search bar"
            >
                <SearchIcon className="animate-target" />
            </button>

            {isLoggedIn ? (
                <Tooltip title={t('my_account')}>
                    <button
                        type="button"
                        onClick={handleOpenMenu}
                        className="btn btn-icon btn-lg fs-lg btn-outline-secondary border-0 rounded-circle animate-shake d-none d-md-inline-flex flex-column gap-1"
                        aria-haspopup="true"
                        aria-expanded={open ? 'true' : undefined}
                        aria-label="Kullanıcı menüsü"
                    >
                        <AccountCircleIcon className="animate-target" />
                        <span className="text-muted fs-xs fw-normal">
                            {user?.firstName || t('my_account')}
                        </span>
                    </button>
                </Tooltip>
            ) : (
                <Tooltip title={t('login_button')}>
                    <button
                        onClick={handleLoginClick}
                        className="btn btn-icon btn-lg fs-lg btn-outline-secondary border-0 rounded-circle animate-shake d-none d-md-inline-flex flex-column gap-1"
                        type="button"
                    >
                        <i className="ri-user-line animate-target"></i>
                        <span className="text-muted fs-xs fw-normal">{t('login_button')}</span>
                    </button>
                </Tooltip>
            )}

            <Tooltip title="Bayi Girişi">
                <Link
                    href="https://b2b.lastikjantavm.com"
                    target="_blank"
                    rel="noopener"
                    className="btn btn-icon btn-lg fs-lg btn-outline-secondary border-0 rounded-circle animate-shake d-none d-md-inline-flex flex-column gap-1"
                >
                    <i className="ri-store-2-line animate-target"></i>
                    <span className="text-muted fs-xs fw-normal">Bayi Girişi</span>
                </Link>
            </Tooltip>

            {isLoggedIn && (
                <Menu
                    anchorEl={menuAnchor}
                    open={open}
                    onClose={handleCloseMenu}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    slotProps={{ paper: { sx: { minWidth: 220 } } }}
                >
                    <MenuItem component={Link} href={ROUTES.ACCOUNT} onClick={handleCloseMenu}>
                        {t('my_account')}
                    </MenuItem>
                    <MenuItem component={Link} href={ROUTES.ACCOUNT_ORDERS} onClick={handleCloseMenu}>
                        {t('my_orders')}
                    </MenuItem>
                    <MenuItem component={Link} href={ROUTES.ACCOUNT_FAVORITES} onClick={handleCloseMenu}>
                        {t('my_favorites')}
                    </MenuItem>
                    <Divider />
                    <MenuItem onClick={handleLogout}>
                        {t('logout')}
                    </MenuItem>
                </Menu>
            )}

            <Tooltip title={isLoggedIn ? t('my_garage') : t('login_to_garage')}>
                <Link
                    href={isLoggedIn ? ROUTES.ACCOUNT_VEHICLES : ROUTES.LOGIN}
                    className="btn btn-icon btn-lg fs-lg btn-outline-secondary border-0 rounded-circle animate-pulse d-none d-md-inline-flex flex-column gap-1"
                >
                    <PlaceOutlinedIcon className="animate-target" />
                    <span className="text-muted fs-xs fw-normal">{t('garage')}</span>
                </Link>
            </Tooltip>

            <Tooltip title={t('cart')}>
                <Badge
                    badgeContent={cartItemCount}
                    showZero
                    slotProps={{ badge: { className: 'cart__counter' } }}
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
                        onClick={() => router.push(ROUTES.CART)}
                        aria-label="Shopping cart"
                    >
                        <i className="ri-shopping-cart-2-line animate-target"></i>
                        <span className="d-none d-lg-block text-muted fs-xs fw-normal">{t('cart')}</span>
                    </button>
                </Badge>
            </Tooltip>

            <button
                type="button"
                className="navbar-toggler"
                onClick={onMenuOpen}
                aria-controls="navbarNav"
                aria-label="Toggle navigation"
            >
                <span className="navbar-toggler-icon"></span>
            </button>
        </div>
    );
}