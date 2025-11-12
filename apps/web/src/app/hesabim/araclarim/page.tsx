// apps/web/src/app/hesabim/araclarim/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/hooks/Theme/useAuth';
import { useVehicles } from '@/src/hooks/WheelSize/useVehicles';
import VehicleList from '@/src/views/vehicle/VehicleList';
import VehicleFormModal from '@/src/components/user/Vehicle/VehicleFormModal';

export default function AraclarimPage() {
    const router = useRouter();
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
        router.replace('/giris-yap');
        return null;
    }

    return (
        <div className="container py-5">
            <div className="row">
                <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h1 className="h3">Araçlarım</h1>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="btn btn-primary"
                        >
                            <i className="ri-add-line me-2"></i>
                            Araç Ekle
                        </button>
                    </div>

                    {loading ? (
                        <div className="text-center py-5">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Yükleniyor...</span>
                            </div>
                        </div>
                    ) : vehicles.length === 0 ? (
                        <div className="card">
                            <div className="card-body text-center py-5">
                                <i className="ri-car-line fs-1 text-muted mb-3"></i>
                                <h5>Henüz araç eklemediniz</h5>
                                <p className="text-muted">
                                    Aracınızı ekleyerek size uygun lastik ve jant önerilerini görebilirsiniz.
                                </p>
                                <button
                                    onClick={() => setShowAddModal(true)}
                                    className="btn btn-primary"
                                >
                                    İlk Aracımı Ekle
                                </button>
                            </div>
                        </div>
                    ) : (
                        <VehicleList vehicles={vehicles} onRefresh={refetch} />
                    )}
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