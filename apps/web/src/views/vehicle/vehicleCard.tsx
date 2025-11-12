// apps/web/src/components/user/Vehicle/VehicleCard.tsx
'use client';

import { useState } from 'react';
import type { Vehicle } from '@/src/types/vehicle';
import { useVehicles } from '@/src/hooks/WheelSize/useVehicles';
import Image from 'next/image';

interface VehicleCardProps {
    vehicle: Vehicle;
    onEdit: () => void;
    onRefresh: () => void;
}

export default function VehicleCard({ vehicle, onEdit, onRefresh }: VehicleCardProps) {
    const { deleteVehicle, setPrimaryVehicle } = useVehicles();
    const [showActions, setShowActions] = useState(false);

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
        <div className={`card ${vehicle.isPrimary ? 'border-primary' : ''}`}>
            {vehicle.isPrimary && (
                <div className="position-absolute top-0 end-0 m-2">
                    <span className="badge bg-primary">Varsayılan</span>
                </div>
            )}

            <div className="position-relative" style={{ height: '200px' }}>
                <Image
                    src={vehicle.image.url || '/assets/img/default-car.png'}
                    alt={`${vehicle.wheelSizeData.makeName} ${vehicle.wheelSizeData.modelName}`}
                    fill
                    style={{ objectFit: 'cover' }}
                    className="card-img-top"
                />
            </div>

            <div className="card-body">
                <h5 className="card-title">
                    {vehicle.wheelSizeData.makeName} {vehicle.wheelSizeData.modelName}
                </h5>
                <p className="card-text text-muted small mb-3">
                    {vehicle.wheelSizeData.year}
                    {vehicle.userInputs.bodyType && ` • ${vehicle.userInputs.bodyType}`}
                    {vehicle.userInputs.enginePower && ` • ${vehicle.userInputs.enginePower}`}
                </p>

                {vehicle.userInputs.plateNumber && (
                    <div className="mb-2">
                        <small className="text-muted">Plaka:</small>
                        <strong className="ms-2">{vehicle.userInputs.plateNumber}</strong>
                    </div>
                )}

                {vehicle.userInputs.mileage && (
                    <div className="mb-3">
                        <small className="text-muted">KM:</small>
                        <strong className="ms-2">{vehicle.userInputs.mileage.toLocaleString()}</strong>
                    </div>
                )}

                <div className="d-flex gap-2">
                    <button
                        onClick={onEdit}
                        className="btn btn-sm btn-outline-primary flex-grow-1"
                    >
                        <i className="ri-edit-line me-1"></i>
                        Düzenle
                    </button>

                    {!vehicle.isPrimary && (
                        <button
                            onClick={handleSetPrimary}
                            className="btn btn-sm btn-outline-secondary"
                            title="Varsayılan yap"
                        >
                            <i className="ri-star-line"></i>
                        </button>
                    )}

                    <button
                        onClick={handleDelete}
                        className="btn btn-sm btn-outline-danger"
                        title="Sil"
                    >
                        <i className="ri-delete-bin-line"></i>
                    </button>
                </div>
            </div>
        </div>
    );
}