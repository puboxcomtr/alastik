'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { toast } from 'react-toastify';
import { ROUTES } from '@/src/config/routes';

interface AccountSidebarProps {
    profile?: {
        firstName?: string;
        lastName?: string;
        phone?: string;
    };
    email?: string;
    username?: string;
    stats?: {
        segment?: string;
        orders?: number;
        spent?: number;
    };
}

export default function AccountSidebar({ profile, email, username, stats }: AccountSidebarProps) {
    const pathname = usePathname();

    const displayName = profile?.firstName || profile?.lastName
        ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim()
        : (username || email || 'Kullanıcı');

    const handleLogout = () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            document.cookie = 'authToken=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/';
            window.location.href = ROUTES.LOGIN;
        }
    };

    const isActive = (href: string) => {
        if (href === ROUTES.ACCOUNT) return pathname === href;
        return pathname.startsWith(href);
    };

    const linkClass = (href: string) =>
        `list-group-item list-group-item-action d-flex align-items-center animate-target border-bottom${isActive(href) ? ' pe-none active' : ''}`;

    return (
        <div className="offcanvas-lg offcanvas-start pe-lg-0 pe-xl-4" id="accountSidebar">
            <div className="offcanvas-header d-lg-block py-3 p-lg-0">
                <div className="d-flex align-items-center">
                    <div
                        className="h5 d-flex justify-content-center align-items-center flex-shrink-0 text-primary bg-primary-subtle lh-1 rounded-circle mb-0"
                        style={{ width: '3rem', height: '3rem' }}
                    >
                        {(profile?.firstName || email || 'K').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 ps-3">
                        <h5 className="h6 mb-1">{displayName}</h5>
                        <div className="text-body-secondary small text-truncate">{email || ''}</div>
                        {stats?.segment && (
                            <span className="badge bg-success-subtle text-success border mt-1">{stats.segment}</span>
                        )}
                    </div>
                </div>
                <button type="button" className="btn-close d-lg-none" data-bs-dismiss="offcanvas" data-bs-target="#accountSidebar" aria-label="Kapat"></button>
            </div>
            <div className="offcanvas-body d-block pt-2 pt-lg-4 pb-lg-0">
                <nav className="list-group list-group-borderless">
                    <Link className={linkClass(ROUTES.ACCOUNT)} href={ROUTES.ACCOUNT}>
                        <i className="ci-home fs-base opacity-75 me-2"></i>Hesabım
                    </Link>
                    <Link className={linkClass(ROUTES.ACCOUNT_ORDERS)} href={ROUTES.ACCOUNT_ORDERS}>
                        <i className="ci-shopping-bag fs-base opacity-75 me-2"></i>Siparişlerim
                        {(stats?.orders ?? 0) > 0 && <span className="badge bg-primary rounded-pill ms-auto">{stats?.orders}</span>}
                    </Link>
                    <Link className={linkClass(ROUTES.ACCOUNT_FAVORITES)} href={ROUTES.ACCOUNT_FAVORITES}>
                        <i className="ci-heart fs-base opacity-75 me-2"></i>Favorilerim
                    </Link>
                    <Link className={linkClass(ROUTES.ACCOUNT_COMMENTS)} href={ROUTES.ACCOUNT_COMMENTS}>
                        <i className="ci-message-circle fs-base opacity-75 me-2"></i>Yorumlarım
                    </Link>
                </nav>
                <h6 className="pt-4 ps-2 ms-1">Hesap Yönetimi</h6>
                <nav className="list-group list-group-borderless">
                    <Link className={linkClass(ROUTES.ACCOUNT_INFORMATIONS)} href={ROUTES.ACCOUNT_INFORMATIONS}>
                        <i className="ci-user fs-base opacity-75 me-2"></i>Kişisel Bilgilerim
                    </Link>
                    <Link className={linkClass(ROUTES.ACCOUNT_ADDRESSES)} href={ROUTES.ACCOUNT_ADDRESSES}>
                        <i className="ci-map-pin fs-base opacity-75 me-2"></i>Adreslerim
                    </Link>
                    <Link className={linkClass(ROUTES.ACCOUNT_VEHICLES)} href={ROUTES.ACCOUNT_VEHICLES}>
                        <i className="ci-car fs-base opacity-75 me-2"></i>Araçlarım
                    </Link>
                    <Link className={linkClass(ROUTES.ACCOUNT_NOTIFICATIONS)} href={ROUTES.ACCOUNT_NOTIFICATIONS}>
                        <i className="ci-bell fs-base opacity-75 me-2"></i>Bildirimlerim
                    </Link>
                </nav>
                <h6 className="pt-4 ps-2 ms-1">Yardım</h6>
                <nav className="list-group list-group-borderless">
                    <Link className={linkClass(ROUTES.SUPPORT_TICKET)} href={ROUTES.SUPPORT_TICKET}>
                        <i className="ci-help-circle fs-base opacity-75 me-2"></i>Talep Oluştur
                    </Link>
                </nav>
                <nav className="list-group list-group-borderless pt-3">
                    <button className="list-group-item list-group-item-action d-flex align-items-center" onClick={handleLogout}>
                        <i className="ci-log-out fs-base opacity-75 me-2"></i>Çıkış Yap
                    </button>
                </nav>
            </div>
        </div>
    );
}