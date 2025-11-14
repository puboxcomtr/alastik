'use client';

/* React Core */
import { useState } from 'react';

/* Next.js */
import { useRouter } from 'next/navigation';

/* Hooks */
import { useAuth } from '@/src/hooks/Theme/useAuth';
import { useVehicles } from '@/src/hooks/WheelSize/useVehicles';
import { useTranslations } from '@/src/hooks/Theme/useTranslations';

/* Config */
import { ROUTES } from '@/src/config/routes';

/* Components */
import AccountSidebar from '@/src/views/account/sidebar/AccountSidebar';
import VehicleList from '@/src/views/vehicle/VehicleList';
import VehicleFormModal from '@/src/components/user/vehicle/VehicleFormModal';

export default function MyVehiclesView() {
    const router = useRouter();
    const { t } = useTranslations();
    const { isLoggedIn, loading: authLoading } = useAuth();
    const { vehicles, loading, refetch } = useVehicles();
    const [showAddModal, setShowAddModal] = useState(false);

    // Login kontrolü
    if (authLoading) {
        return (
            <div className="container py-5">
                <div className="text-center">Yükleniyor...</div>
            </div>
        );
    }

    if (!isLoggedIn) {
        router.replace(ROUTES.LOGIN);
        return null;
    }

    return (
        <div className="container py-5">
            <div className="row row-fluid">
                <AccountSidebar />
                <div className="col-md-9">
                    <div className="d-flex justify-content-between align-items-center">
                        <h5 className="mb-4 h5">{t('my_vehicles')}</h5>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="btn btn-primary"
                        >
                            <i className="ri-add-line me-2"></i>
                            {t('add_vehicle')}
                        </button>
                    </div>
                    <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 g-3 g-md-4 g-lg-3 g-xl-4">
                        {loading ? (
                            <div className="text-center py-5">
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">{t('loading')}</span>
                                </div>
                            </div>
                        ) : vehicles.length === 0 ? (
                            <div className="card">
                                <div className="card-body text-center py-5">
                                    <i className="ri-car-line fs-1 text-muted mb-3"></i>
                                    <h5>{t('no_vehicles_title')}</h5>
                                    <p className="text-muted">
                                        {t('no_vehicles_description')}
                                    </p>
                                    <button
                                        onClick={() => setShowAddModal(true)}
                                        className="btn btn-primary"
                                    >
                                        {t('add_first_vehicle')}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <VehicleList vehicles={vehicles} onRefresh={refetch} />
                        )}
                    </div>
                </div>
                <div className="col-md-9">


                </div>
            </div>

            {showAddModal && (
                <VehicleFormModal
                    isOpen={showAddModal}
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => {
                        setShowAddModal(false);
                        refetch();
                    }}
                />
            )}
        </div>
    );
}