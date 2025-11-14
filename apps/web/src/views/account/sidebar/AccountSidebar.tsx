'use client';

import { useAuth } from '@/src/hooks/Theme/useAuth';
import { useTranslations } from '@/src/hooks/Theme/useTranslations';
import { toast } from 'react-toastify';
import { ROUTES } from '@/src/config/routes';

export default function AccountSidebar() {
    const { t } = useTranslations();
    const { user, clearAuth } = useAuth();

    const handleLogout = () => {
        clearAuth();
        toast.success(t('logout_success'));
        window.location.href = ROUTES.HOME;
    };

    return (
        <aside className='col-md-3'>
            <div className='offcanvas-lg offcanvas-start pe-lg-0 pe-xl-4' id='accountSidebar'>
                <div className='offcanvas-header d-lg-block py-3 p-lg-0'>
                    <div className="d-flex align-items-center">
                        <div className="h5 d-flex justify-content-center align-items-center flex-shrink-0 text-primary bg-primary-subtle lh-1 rounded-circle mb-0" style={{ width: '3rem', height: '3rem' }}>
                            {user?.firstName?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="min-w-0 ps-3">
                            <h5 className="h6 mb-1">{user?.firstName || ''} {user?.lastName || ''}</h5>
                            <div className="nav flex-nowrap text-nowrap min-w-0">
                                <a className="nav-link animate-underline text-body p-0" href="#bonusesModal" data-bs-toggle="modal">
                                    <span className="animate-target me-1">0 TL Cüzdan Bakiyesi</span>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
                <div className='offcanvas-body d-block pt-2 pt-lg-4 pb-lg-0'>
                    <nav className='list-group list-group-borderless'>
                        <a className="list-group-item list-group-item-action d-flex align-items-center animate-underline animate-target border-bottom" href={ROUTES.ACCOUNT}>
                            <i className="ci-home fs-base opacity-75 me-2"></i>
                            {t('my_account')}
                        </a>
                        <a className="list-group-item list-group-item-action d-flex align-items-center animate-underline animate-target border-bottom" href={ROUTES.ACCOUNT_ORDERS}>
                            <i className="ci-shopping-bag fs-base opacity-75 me-2"></i>
                            {t('orders')}
                            <span className="badge bg-primary rounded-pill ms-auto">1</span>
                        </a>
                        <a className="list-group-item list-group-item-action d-flex align-items-center animate-underline animate-target border-bottom" href={ROUTES.ACCOUNT_COMMENTS}>
                            <i className="ci-message-circle fs-base opacity-75 me-2"></i>
                            {t('my_reviews')}
                            <span className="badge bg-success rounded-pill ms-auto">0</span>
                        </a>
                    </nav>
                    <h6 className="pt-4 ps-2 ms-1">{t('my_account')}</h6>
                    <nav className='list-group list-group-borderless'>
                        <a className="list-group-item list-group-item-action d-flex align-items-center animate-underline animate-target border-bottom" href={ROUTES.ACCOUNT_INFORMATIONS}>
                            <i className="ci-user fs-base opacity-75 me-2"></i>
                            {t('personal_data')}
                        </a>
                        <a className="list-group-item list-group-item-action d-flex align-items-center animate-underline animate-target border-bottom" href={ROUTES.ACCOUNT_ADDRESSES}>
                            <i className="ci-map-pin fs-base opacity-75 me-2"></i>
                            {t('delivery_addresses')}
                        </a>
                        <a className="list-group-item list-group-item-action d-flex align-items-center animate-underline animate-target border-bottom" href={ROUTES.ACCOUNT_NOTIFICATIONS}>
                            <i className="ci-clipboard fs-base opacity-75 me-2"></i>
                            {t('notifications')}
                        </a>
                    </nav>
                    <h6 className="pt-4 ps-2 ms-1">{t('customer_service')}</h6>
                    <nav className='list-group list-group-borderless'>
                        <a className="list-group-item list-group-item-action d-flex align-items-center animate-underline animate-target border-bottom" href={ROUTES.SUPPORT_MAIN}>
                            <i className="ci-life-buoy fs-base opacity-75 me-2"></i>
                            {t('support_center')}
                        </a>
                        <a className="list-group-item list-group-item-action d-flex align-items-center animate-underline animate-target border-bottom" href={ROUTES.SUPPORT_TICKET}>
                            <i className="ci-help-circle fs-base opacity-75 me-2"></i>
                            {t('create_ticket')}
                        </a>
                    </nav>
                    <nav className='list-group list-group-borderless'>
                        <button className="list-group-item list-group-item-action d-flex align-items-center animate-underline animate-target border-bottom" onClick={handleLogout}>
                            <i className="ci-log-out fs-base opacity-75 me-2"></i>
                            {t('logout')}
                        </button>
                    </nav>
                </div>
            </div>
        </aside>
    );
}