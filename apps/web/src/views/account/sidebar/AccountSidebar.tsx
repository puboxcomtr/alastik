'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/src/hooks/Theme/useAuth';
import { useTranslations } from '@/src/hooks/Theme/useTranslations';
import { toast } from 'react-toastify';
import { ROUTES } from '@/src/config/routes';

export default function AccountSidebar() {
    const pathname = usePathname();
    const { t } = useTranslations();
    const { user, clearAuth } = useAuth();

    const handleLogout = () => {
        clearAuth();
        toast.success(t('logout_success'));
        window.location.href = ROUTES.HOME;
    };

    const isActive = (href: string) => {
        if (href === ROUTES.ACCOUNT) return pathname === href;
        return pathname.startsWith(href);
    };

    const linkClass = (href: string) =>
        `list-group-item list-group-item-action d-flex align-items-center animate-underline animate-target border-bottom${isActive(href) ? ' pe-none active' : ''}`;

    return (
        <div className="offcanvas-lg offcanvas-start pe-lg-0 pe-xl-4" id="accountSidebar">
            <div className="offcanvas-header d-lg-block py-3 p-lg-0">
                <div className="d-flex align-items-center">
                    <div
                        className="h5 d-flex justify-content-center align-items-center flex-shrink-0 text-primary bg-primary-subtle lh-1 rounded-circle mb-0"
                        style={{ width: '3rem', height: '3rem' }}
                    >
                        {user?.firstName?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="min-w-0 ps-3">
                        <h5 className="h6 mb-1">{user?.firstName || ''} {user?.lastName || ''}</h5>
                        <div className="text-body-secondary small text-truncate">{user?.email || ''}</div>
                    </div>
                </div>
                <button type="button" className="btn-close d-lg-none" data-bs-dismiss="offcanvas" data-bs-target="#accountSidebar" aria-label="Kapat"></button>
            </div>
            <div className="offcanvas-body d-block pt-2 pt-lg-4 pb-lg-0">
                <nav className="list-group list-group-borderless">
                    <Link className={linkClass(ROUTES.ACCOUNT)} href={ROUTES.ACCOUNT}>
                        <i className="ci-home fs-base opacity-75 me-2"></i>
                        {t('my_account')}
                    </Link>
                    <Link className={linkClass(ROUTES.ACCOUNT_ORDERS)} href={ROUTES.ACCOUNT_ORDERS}>
                        <i className="ci-shopping-bag fs-base opacity-75 me-2"></i>
                        {t('orders')}
                    </Link>
                    <Link className={linkClass(ROUTES.ACCOUNT_FAVORITES)} href={ROUTES.ACCOUNT_FAVORITES}>
                        <i className="ci-heart fs-base opacity-75 me-2"></i>
                        {t('favorites')}
                    </Link>
                    <Link className={linkClass(ROUTES.ACCOUNT_COMMENTS)} href={ROUTES.ACCOUNT_COMMENTS}>
                        <i className="ci-message-circle fs-base opacity-75 me-2"></i>
                        {t('my_reviews')}
                    </Link>
                </nav>
                <h6 className="pt-4 ps-2 ms-1">{t('my_account')}</h6>
                <nav className="list-group list-group-borderless">
                    <Link className={linkClass(ROUTES.ACCOUNT_INFORMATIONS)} href={ROUTES.ACCOUNT_INFORMATIONS}>
                        <i className="ci-user fs-base opacity-75 me-2"></i>
                        {t('personal_data')}
                    </Link>
                    <Link className={linkClass(ROUTES.ACCOUNT_ADDRESSES)} href={ROUTES.ACCOUNT_ADDRESSES}>
                        <i className="ci-map-pin fs-base opacity-75 me-2"></i>
                        {t('delivery_addresses')}
                    </Link>
                    <Link className={linkClass(ROUTES.ACCOUNT_VEHICLES)} href={ROUTES.ACCOUNT_VEHICLES}>
                        <i className="ci-car fs-base opacity-75 me-2"></i>
                        {t('my_vehicles')}
                    </Link>
                    <Link className={linkClass(ROUTES.ACCOUNT_NOTIFICATIONS)} href={ROUTES.ACCOUNT_NOTIFICATIONS}>
                        <i className="ci-bell fs-base opacity-75 me-2"></i>
                        {t('notifications')}
                    </Link>
                </nav>
                <h6 className="pt-4 ps-2 ms-1">{t('customer_service')}</h6>
                <nav className="list-group list-group-borderless">
                    <Link className={linkClass(ROUTES.SUPPORT_MAIN)} href={ROUTES.SUPPORT_MAIN}>
                        <i className="ci-life-buoy fs-base opacity-75 me-2"></i>
                        {t('support_center')}
                    </Link>
                    <Link className={linkClass(ROUTES.SUPPORT_TICKET)} href={ROUTES.SUPPORT_TICKET}>
                        <i className="ci-help-circle fs-base opacity-75 me-2"></i>
                        {t('create_ticket')}
                    </Link>
                </nav>
                <nav className="list-group list-group-borderless pt-3">
                    <button className="list-group-item list-group-item-action d-flex align-items-center" onClick={handleLogout}>
                        <i className="ci-log-out fs-base opacity-75 me-2"></i>
                        {t('logout')}
                    </button>
                </nav>
            </div>
        </div>
    );
}