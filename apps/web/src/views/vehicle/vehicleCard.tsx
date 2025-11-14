'use client';

import { useState } from 'react';
import type { Vehicle } from '@/src/types/vehicle';
import { useVehicles } from '@/src/hooks/WheelSize/useVehicles';
import Image from 'next/image';
import { useTranslations } from '@/src/hooks/Theme/useTranslations';

/* Config */
import { ROUTES } from '@/src/config/routes';

interface VehicleCardProps {
    vehicle: Vehicle;
    onEdit: () => void;
    onRefresh: () => void;
}

export default function VehicleCard({ vehicle, onEdit, onRefresh }: VehicleCardProps) {
    const { deleteVehicle, setPrimaryVehicle } = useVehicles();
    const [showActions, setShowActions] = useState(false);
    const { t } = useTranslations();

    const handleDelete = async () => {
        if (confirm('Bu aracı silmek istediğinize emin misiniz?')) {
            const result = await deleteVehicle(vehicle._id);
            if (result.success) {
                onRefresh();
            }
        }
    };

    const handleSetPrimary = async () => {
        const result = await setPrimaryVehicle(vehicle._id);
        if (result.success) {
            onRefresh();
        }
    };

    return (
        <div className={`card h-100 ${vehicle.isPrimary ? 'border-primary' : ''}`}>
            <div className="position-relative" style={{ height: '200px' }}>
                {vehicle.isPrimary && (
                    <div className="position-absolute top-0 end-0 m-2 z-3">
                        <span className="badge bg-danger">Varsayılan</span>
                    </div>
                )}
                <Image
                    src={vehicle.image.url || '/assets/img/default-car.png'}
                    alt={`${vehicle.wheelSizeData.makeName} ${vehicle.wheelSizeData.modelName}`}
                    fill
                    style={{ objectFit: 'cover' }}
                    className="card-img-top"
                />
            </div>

            <div className="card-body">
                <h6 className="card-title">
                    {vehicle.wheelSizeData.makeName} {vehicle.wheelSizeData.modelName} - {vehicle.wheelSizeData.year} {vehicle.userInputs.bodyType && `  ${vehicle.userInputs.bodyType}`} {vehicle.userInputs.enginePower && `${vehicle.userInputs.enginePower}`}
                </h6>
                <div className="d-flex justify-content-between">
                    <small className="fw-bold">Plaka:</small>
                    <small className="ms-2">{vehicle.userInputs.plateNumber || 'Bilgisi Girilmedi'}</small>
                </div>
                <div className="d-flex justify-content-between mb-3">
                    <small className="fw-bold">KM:</small>
                    <small className="ms-2">
                        {vehicle.userInputs.mileage
                            ? vehicle.userInputs.mileage.toLocaleString()
                            : 'Bilgisi Girilmedi'}
                    </small>
                </div>

                <div className="d-flex gap-2 mb-2">
                    <button
                        onClick={onEdit}
                        className="btn btn-md btn-outline-secondary"
                    >
                        <i className="ci-edit me-2"></i>
                        {t('edit')}
                    </button>

                    {!vehicle.isPrimary && (
                        <button
                            onClick={handleSetPrimary}
                            className="btn btn-md btn-outline-secondary"
                            title={t('default')}
                        >
                            <i className="ci-check-circle"></i>
                        </button>
                    )}

                    <button
                        onClick={handleDelete}
                        className="btn btn-md btn-outline-secondary"
                        title={t('remove')}
                    >
                        <i className="ri-delete-bin-line"></i>
                    </button>
                </div>
                <button
                    onClick={handleDelete}
                    className="btn btn-md btn-success w-100 d-block"
                    title={t('remove')}
                >
                    {t('looks_car_products')}
                </button>
            </div>
        </div>
    );
}