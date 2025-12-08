'use client';

import { useState } from 'react';
import { Typography, Divider } from '@mui/material';
import { useVehicles } from '@/src/hooks/WheelSize/useVehicles';
import { toast } from 'react-toastify';

interface VehicleDetailsStepProps {
    makeName: string;
    modelName: string;
    year: number;
    modificationName: string;
    vehicleImage?: string;
    onSave: (details: { plateNumber: string; mileage?: number; isPrimary: boolean }) => void;
    loading?: boolean;
}

export default function VehicleDetailsStep({
    makeName,
    modelName,
    year,
    modificationName,
    vehicleImage,
    onSave,
    loading = false
}: VehicleDetailsStepProps) {
    const { vehicles } = useVehicles();
    const [plateNumber, setPlateNumber] = useState('');
    const [mileage, setMileage] = useState('');
    const [isPrimary, setIsPrimary] = useState(false);

    // Mevcut varsayılan araç var mı?
    const existingPrimary = vehicles.find(v => v.isPrimary);

    const handlePrimaryChange = (checked: boolean) => {
        if (checked && existingPrimary) {
            toast.warning(
                `Zaten varsayılan bir aracınız var: ${existingPrimary.wheelSizeData?.makeName} ${existingPrimary.wheelSizeData?.modelName}. Önce onu değiştirmeniz gerekiyor.`,
                { autoClose: 5000 }
            );
            return;
        }
        setIsPrimary(checked);
    };

    const handleSubmit = () => {
        onSave({
            plateNumber,
            mileage: mileage ? parseInt(mileage) : undefined,
            isPrimary
        });
    };

    return (
        <div className="vehicle-details-step">
            <div className="row">
                {/* Sol: Araç Bilgisi */}
                <div className="col-md-4">
                    <Typography variant="h6" sx={{ py: 1.5, color: 'black' }}>
                        Araç Bilgisi
                    </Typography>
                    <Divider />

                    {/* Araç Görseli */}
                    <div className="text-center py-3">
                        {vehicleImage ? (
                            <img
                                src={vehicleImage}
                                alt={`${makeName} ${modelName}`}
                                className="img-fluid"
                                style={{ maxHeight: '120px', objectFit: 'contain' }}
                            />
                        ) : (
                            <i className="ri-car-line" style={{ fontSize: '4rem', color: '#dee2e6' }}></i>
                        )}
                    </div>

                    {/* Araç Detayları */}
                    <div className="small">
                        <div className="d-flex justify-content-between py-1">
                            <span className="text-muted">Araç:</span>
                            <strong>{makeName} {modelName}</strong>
                        </div>
                        <div className="d-flex justify-content-between py-1">
                            <span className="text-muted">Yıl:</span>
                            <strong>{year}</strong>
                        </div>
                        <div className="d-flex justify-content-between py-1">
                            <span className="text-muted">Motor:</span>
                            <strong>{modificationName}</strong>
                        </div>
                    </div>
                </div>

                {/* Sağ: Form */}
                <div className="col-md-8">
                    <Typography variant="h6" sx={{ py: 1.5, color: 'black' }}>
                        Ek Bilgiler
                    </Typography>
                    <Divider sx={{ mb: 3 }} />

                    <div className="mb-3">
                        <label className="form-label fw-semibold">Plaka (Opsiyonel)</label>
                        <input
                            type="text"
                            className="form-control"
                            value={plateNumber}
                            onChange={(e) => setPlateNumber(e.target.value)}
                            placeholder="34 ABC 123"
                            style={{
                                borderRadius: '0.375rem',
                                border: '1px solid #ced4da',
                                padding: '0.75rem'
                            }}
                        />
                    </div>

                    <div className="mb-3">
                        <label className="form-label fw-semibold">Kilometre (Opsiyonel)</label>
                        <input
                            type="number"
                            className="form-control"
                            value={mileage}
                            onChange={(e) => setMileage(e.target.value)}
                            placeholder="50000"
                            style={{
                                borderRadius: '0.375rem',
                                border: '1px solid #ced4da',
                                padding: '0.75rem'
                            }}
                        />
                    </div>

                    <div className="form-check mb-4">
                        <input
                            type="checkbox"
                            className="form-check-input"
                            id="isPrimary"
                            checked={isPrimary}
                            onChange={(e) => handlePrimaryChange(e.target.checked)}
                            disabled={!!existingPrimary}
                        />
                        <label className="form-check-label" htmlFor="isPrimary">
                            Varsayılan aracım olarak ayarla
                            {existingPrimary && (
                                <small className="text-muted d-block">
                                    Mevcut varsayılan: {existingPrimary.wheelSizeData?.makeName} {existingPrimary.wheelSizeData?.modelName}
                                </small>
                            )}
                        </label>
                    </div>

                    <button
                        onClick={handleSubmit}
                        className="btn btn-success w-100"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2"></span>
                                Kaydediliyor...
                            </>
                        ) : (
                            <>
                                <i className="ri-save-line me-2"></i>
                                Aracı Kaydet
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}