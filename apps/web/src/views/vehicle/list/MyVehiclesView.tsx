'use client';

import { useState } from 'react';
import { useTranslations } from '@/src/hooks/Theme/useTranslations';

import { ROUTES } from '@/src/config/routes';

import VehicleList from '@/src/views/vehicle/VehicleList';
import TireSearchModal from '@/src/components/layout/Modals/TireSearch';

interface MyVehiclesViewProps {
    vehicles: any[];
    loading: boolean;
    refetch: () => void;
}

export default function MyVehiclesView({ vehicles, loading, refetch }: MyVehiclesViewProps) {
    const { t } = useTranslations();
    const [showAddModal, setShowAddModal] = useState(false);

    return (
        <>
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
                <>
                    <VehicleList vehicles={vehicles} onRefresh={refetch} />
                    <div className='nav mt-3'>
                        <button
                            className="btn btn-linknav-link animate-underline fs-base px-0"
                            onClick={() => setShowAddModal(true)}
                        >
                            <i className='ci-plus fs-lg ms-n1 me-2'></i>
                            Yeni Araç Ekle
                        </button>
                    </div>
                </>
            )}
            <TireSearchModal
                open={showAddModal}
                onClose={() => setShowAddModal(false)}
                mode="addVehicle"
                onVehicleSaved={() => {
                    setShowAddModal(false);
                    refetch();
                }}
            />
        </>
    );
}