// apps/web/src/components/layout/Modals/steps/TireSizeSelection.tsx
'use client';

import { useState, useEffect } from 'react';
import type { TireSize } from '@/src/types/tire-search';

interface TireSizeSelectionProps {
    make: string;
    model: string;
    year: number;
    modification: string;
    vehicleImage?: string;
    onSelect: (tireSize: TireSize) => void;
}

interface CompatibleTire {
    width: number;
    aspectRatio: number;
    diameter: number;
    display: string;
    isFront: boolean;
    isRear: boolean;
}

export default function TireSizeSelection({
    make,
    model,
    year,
    modification,
    vehicleImage,
    onSelect
}: TireSizeSelectionProps) {
    const [loading, setLoading] = useState(true);
    const [compatibleTires, setCompatibleTires] = useState<CompatibleTire[]>([]);
    const [selectedFront, setSelectedFront] = useState<string>('');
    const [selectedRear, setSelectedRear] = useState<string>('');

    useEffect(() => {
        if (make && model && year && modification) {
            loadCompatibleSizes();
        }
    }, [make, model, year, modification]);

    const loadCompatibleSizes = async () => {
        setLoading(true);
        try {
            // TODO: API'den uyumlu ebatları çek
            // const response = await api.wheelSize.getVehicleDetails(make, model, year, modification);

            // Mock data
            const mockTires: CompatibleTire[] = [
                { width: 205, aspectRatio: 55, diameter: 16, display: '205/55 R16', isFront: true, isRear: true },
                { width: 215, aspectRatio: 55, diameter: 16, display: '215/55 R16', isFront: true, isRear: true },
                { width: 225, aspectRatio: 50, diameter: 17, display: '225/50 R17', isFront: true, isRear: true },
            ];

            setCompatibleTires(mockTires);
        } catch (error) {
            console.error('Tire sizes fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTireSelect = (tire: CompatibleTire) => {
        setSelectedFront(tire.display);
        setSelectedRear(tire.display);

        const tireSize: TireSize = {
            front: tire.display,
            rear: tire.display,
            width: tire.width,
            aspectRatio: tire.aspectRatio,
            diameter: tire.diameter
        };

        onSelect(tireSize);
    };

    if (loading) {
        return (
            <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Yükleniyor...</span>
                </div>
                <p className="mt-3 text-muted">Uyumlu lastik ebatları yükleniyor...</p>
            </div>
        );
    }

    return (
        <div className="tire-size-selection">
            <div className="text-center mb-4">
                <p className="text-muted mb-3">
                    <strong className="text-capitalize">{make} {model} ({year})</strong>
                </p>
                <small className="text-muted">
                    <i className="ri-settings-3-line me-1"></i>
                    {modification}
                </small>
            </div>

            {compatibleTires.length > 0 ? (
                <div className="row g-3">
                    {compatibleTires.map((tire) => (
                        <div key={tire.display} className="col-md-4">
                            <div
                                className={`tire-card card h-100 text-center ${selectedFront === tire.display ? 'border-primary' : ''}`}
                                onClick={() => handleTireSelect(tire)}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="card-body">
                                    <div className="tire-icon mb-2">
                                        <i className="ri-dashboard-line fs-1 text-primary"></i>
                                    </div>
                                    <h5 className="mb-2">{tire.display}</h5>
                                    <div className="tire-specs small text-muted">
                                        <div>Genişlik: {tire.width} mm</div>
                                        <div>Oran: {tire.aspectRatio}%</div>
                                        <div>Jant: {tire.diameter}"</div>
                                    </div>
                                    {selectedFront === tire.display && (
                                        <div className="mt-2">
                                            <i className="ri-check-circle-fill text-primary fs-4"></i>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-5">
                    <i className="ri-dashboard-line fs-1 text-muted"></i>
                    <p className="text-muted mt-2">Uyumlu lastik ebatı bulunamadı</p>
                </div>
            )}

            {selectedFront && (
                <div className="alert alert-success mt-3" role="alert">
                    <i className="ri-check-line me-2"></i>
                    <strong>{selectedFront}</strong> ebatı seçildi
                </div>
            )}

            <style jsx>{`
                .tire-card {
                    transition: all 0.2s ease;
                    border: 2px solid #dee2e6;
                }
                .tire-card:hover {
                    border-color: #dc3545;
                    transform: translateY(-2px);
                }
                .tire-card.border-primary {
                    border-color: #dc3545 !important;
                    background-color: #fff5f5;
                }
            `}</style>
        </div>
    );
}