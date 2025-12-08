'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Vehicle } from '@/src/types/vehicle';
import { useVehicles } from '@/src/hooks/WheelSize/useVehicles';
import Image from 'next/image';
import { useTranslations } from '@/src/hooks/Theme/useTranslations';
import { toast } from 'react-toastify';
import wheelSizeService from '@/src/services/wheelSizeService';
import { buildTagUrl, buildTireSizeTagFallback } from '@/src/config/routes';

interface VehicleCardProps {
    vehicle: Vehicle;
    onEdit: () => void;
    onRefresh: () => void;
}

export default function VehicleCard({ vehicle, onEdit, onRefresh }: VehicleCardProps) {
    const router = useRouter();
    const { deleteVehicle, setPrimaryVehicle } = useVehicles();
    const [isNavigating, setIsNavigating] = useState(false);
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

    const handleShowProducts = async () => {
        setIsNavigating(true);

        try {
            const { wheelSizeData } = vehicle;

            // Araç için lastik ebatlarını çek
            const vehicleData = await wheelSizeService.getVehicleDetails(
                wheelSizeData.make,
                wheelSizeData.model,
                wheelSizeData.year,
                wheelSizeData.modification
            );

            const grouped = wheelSizeService.parseGroupedTires(vehicleData);
            const allTires = [...grouped.both, ...grouped.front, ...grouped.rear];

            if (allTires.length === 0) {
                toast.error('Bu araç için uyumlu lastik ebatı bulunamadı.');
                setIsNavigating(false);
                return;
            }

            // İlk ebatı al
            const firstTire = allTires[0];
            const seoUrl = buildTireSizeTagFallback(firstTire.width, firstTire.aspectRatio, firstTire.diameter);

            // localStorage'a garaj aracı olarak kaydet
            const vehicleStorage = {
                make: wheelSizeData.make,
                makeName: wheelSizeData.makeName,
                model: wheelSizeData.model,
                modelName: wheelSizeData.modelName,
                year: wheelSizeData.year,
                modification: wheelSizeData.modification,
                modificationName: vehicle.userInputs?.bodyType || '',
                vehicleImage: vehicle.image?.url || '',
                selectedSize: `${firstTire.width}-${firstTire.aspectRatio}-r${firstTire.diameter}`,
                timestamp: Date.now(),
                source: 'garage'
            };

            localStorage.setItem('selectedVehicle', JSON.stringify(vehicleStorage));

            // Etiket sayfasına yönlendir
            router.push(buildTagUrl(seoUrl));

        } catch (error) {
            console.error('[VehicleCard] Show products error:', error);
            toast.error('Bir hata oluştu. Lütfen tekrar deneyin.');
            setIsNavigating(false);
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
                    src={vehicle.image?.url || '/assets/img/default-car.png'}
                    alt={`${vehicle.wheelSizeData.makeName} ${vehicle.wheelSizeData.modelName}`}
                    fill
                    style={{ objectFit: 'cover' }}
                    className="card-img-top"
                />
            </div>

            <div className="card-body">
                <h6 className="card-title">
                    {vehicle.wheelSizeData.makeName} {vehicle.wheelSizeData.modelName} - {vehicle.wheelSizeData.year}
                    {vehicle.userInputs?.bodyType && ` ${vehicle.userInputs.bodyType}`}
                    {vehicle.userInputs?.enginePower && ` ${vehicle.userInputs.enginePower}`}
                </h6>
                <div className="d-flex justify-content-between">
                    <small className="fw-bold">Plaka:</small>
                    <small className="ms-2">{vehicle.userInputs?.plateNumber || 'Bilgisi Girilmedi'}</small>
                </div>
                <div className="d-flex justify-content-between mb-3">
                    <small className="fw-bold">KM:</small>
                    <small className="ms-2">
                        {vehicle.userInputs?.mileage
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
                    onClick={handleShowProducts}
                    className="btn btn-md btn-success w-100 d-block"
                    disabled={isNavigating}
                >
                    {isNavigating ? (
                        <>
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            Yükleniyor...
                        </>
                    ) : (
                        t('looks_car_products')
                    )}
                </button>
            </div>
        </div>
    );
}