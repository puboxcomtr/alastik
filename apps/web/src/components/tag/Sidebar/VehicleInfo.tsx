'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Typography, Divider } from '@mui/material';
import wheelSizeService from '@/src/services/wheelSizeService';
import { buildTagUrl, buildTireSizeTagFallback } from '@/src/config/routes';
import { useVehicles } from '@/src/hooks/WheelSize/useVehicles';
import { useAuth } from '@/src/hooks/Theme/useAuth';

interface VehicleData {
    make: string;
    makeName: string;
    model: string;
    modelName: string;
    year: number;
    modification: string;
    modificationName?: string;
    vehicleImage?: string;
    selectedSize?: string;
    timestamp?: number;
    source?: 'search' | 'garage'; // Nereden geldi
}

interface TireSizeOption {
    display: string;
    width: number;
    aspectRatio: number;
    diameter: number;
    seoUrl: string;
    isSelected: boolean;
}

interface VehicleInfoProps {
    currentSize: string;
}

export default function VehicleInfo({ currentSize }: VehicleInfoProps) {
    const [mounted, setMounted] = useState(false);
    const [vehicle, setVehicle] = useState<VehicleData | null>(null);
    const [tireSizes, setTireSizes] = useState<TireSizeOption[]>([]);
    const [loading, setLoading] = useState(false);

    const { isLoggedIn } = useAuth();
    const { vehicles, loading: vehiclesLoading } = useVehicles();

    // Client-side mount kontrolü
    useEffect(() => {
        setMounted(true);
    }, []);

    // Araç bilgisini belirle: 1. localStorage (arama), 2. Garaj (varsayılan)
    useEffect(() => {
        if (!mounted) return;
        try {
            const stored = localStorage.getItem('selectedVehicle');

            if (stored) {
                const data = JSON.parse(stored) as VehicleData;
                const isValid = data.timestamp && (Date.now() - data.timestamp) < 2 * 60 * 60 * 1000;

                if (isValid && data.make) {
                    setVehicle(data);
                    return;
                } else {
                    localStorage.removeItem('selectedVehicle');
                }
            }
        } catch (error) {
            console.error('[VehicleInfo] localStorage read error:', error);
        }
        if (isLoggedIn && !vehiclesLoading && vehicles.length > 0) {
            const primaryVehicle = vehicles.find(v => v.isPrimary);

            if (primaryVehicle) {
                console.log('[VehicleInfo] Garaj varsayılan araç:', primaryVehicle);
                setVehicle({
                    make: primaryVehicle.wheelSizeData?.make || '',
                    makeName: primaryVehicle.wheelSizeData?.makeName || '',
                    model: primaryVehicle.wheelSizeData?.model || '',
                    modelName: primaryVehicle.wheelSizeData?.modelName || '',
                    year: primaryVehicle.wheelSizeData?.year || 0,
                    modification: primaryVehicle.wheelSizeData?.modification || '',
                    modificationName: primaryVehicle.userInputs?.bodyType || '',
                    vehicleImage: primaryVehicle.image?.url || '',
                    source: 'garage'
                });
            }
        }
    }, [mounted, isLoggedIn, vehicles, vehiclesLoading]);

    useEffect(() => {
        if (!vehicle?.make || !vehicle?.model || !vehicle?.year || !vehicle?.modification) {
            return;
        }

        const loadTireSizes = async () => {
            setLoading(true);
            try {
                const vehicleData = await wheelSizeService.getVehicleDetails(
                    vehicle.make,
                    vehicle.model,
                    vehicle.year,
                    vehicle.modification
                );

                const grouped = wheelSizeService.parseGroupedTires(vehicleData);

                // Tüm ebatları birleştir ve unique yap
                const allTires = [...grouped.both, ...grouped.front, ...grouped.rear];
                const uniqueSizes = new Map<string, TireSizeOption>();

                allTires.forEach(tire => {
                    const key = `${tire.width}-${tire.aspectRatio}-${tire.diameter}`;
                    if (!uniqueSizes.has(key)) {
                        const seoUrl = buildTireSizeTagFallback(tire.width, tire.aspectRatio, tire.diameter);
                        const sizeKey = `${tire.width}-${tire.aspectRatio}-r${tire.diameter}`;
                        uniqueSizes.set(key, {
                            display: tire.display,
                            width: tire.width,
                            aspectRatio: tire.aspectRatio,
                            diameter: tire.diameter,
                            seoUrl,
                            isSelected: currentSize === sizeKey
                        });
                    }
                });

                setTireSizes(Array.from(uniqueSizes.values()));
            } catch (error) {
                console.error('[VehicleInfo] Load tire sizes error:', error);
            } finally {
                setLoading(false);
            }
        };

        loadTireSizes();
    }, [vehicle, currentSize]);

    const handleOpenModal = () => {
        window.dispatchEvent(new CustomEvent('openTireSearchModal'));
    };

    const handleClearVehicle = () => {
        localStorage.removeItem('selectedVehicle');
        setVehicle(null);
        setTireSizes([]);
    };

    // Client mount olmadan render etme
    if (!mounted) {
        return null;
    }

    // Araç bilgisi yoksa hiç gösterme
    if (!vehicle) {
        return null;
    }

    return (
        <div className="vehicle-info-sidebar mb-4">
            <div>
                {/* Araç Bilgisi */}
                <div className="d-flex justify-content-between align-items-center">
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'black' }}>
                        {vehicle.source === 'garage' ? 'Garajımdaki Aracım' : 'Aracınız'}
                    </Typography>
                    {vehicle.source === 'search' && (
                        <button
                            onClick={handleClearVehicle}
                            className="btn btn-sm btn-link text-muted p-0"
                            title="Araç seçimini kaldır"
                        >
                            <i className="ri-close-line"></i>
                        </button>
                    )}
                </div>
                <Divider sx={{ my: 1.5 }} />

                {/* Araç Görseli */}
                <div className="mb-3">
                    {vehicle.vehicleImage ? (
                        <img
                            src={vehicle.vehicleImage}
                            alt={`${vehicle.makeName} ${vehicle.modelName}`}
                            className="img-fluid"
                            style={{ maxHeight: '180px', objectFit: 'contain' }}
                        />
                    ) : (
                        <i className="ri-car-line" style={{ fontSize: '1.4rem', color: '#dee2e6' }}></i>
                    )}
                </div>
                <div>
                    <strong>{vehicle.makeName} {vehicle.modelName} {vehicle.year}</strong>
                    {vehicle.source === 'garage' && (
                        <span className="badge bg-success ms-2" style={{ fontSize: '10px' }}>Garajım</span>
                    )}
                    <button
                        onClick={handleOpenModal}
                        className="btn p-0 w-100 text-start justify-content-start"
                        style={{ fontSize: '12px', color: 'var(--cz-primary)' }}
                    >
                        Aracı Değiştir <i className="ri-arrow-right-s-line"></i>
                    </button>
                </div>
            </div>
            <Divider sx={{ my: 1.5 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'black', mb: 1 }}>
                Uyumlu Diğer Lastik Ebatları
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <div>
                {loading ? (
                    <div className="text-center py-3">
                        <div className="spinner-border spinner-border-sm text-primary" role="status">
                            <span className="visually-hidden">Yükleniyor...</span>
                        </div>
                    </div>
                ) : tireSizes.length > 0 ? (
                    <div className="tire-sizes-list">
                        {tireSizes.map((size, idx) => (
                            <div key={idx} className="form-check mb-2">
                                {size.isSelected ? (
                                    <div className="d-flex align-items-center">
                                        <input
                                            type="radio"
                                            className="form-check-input"
                                            checked={true}
                                            readOnly
                                        />
                                        <label
                                            className="form-check-label ms-2"
                                            style={{ fontWeight: 600, color: 'var(--cz-primary)' }}
                                        >
                                            {size.display}
                                        </label>
                                    </div>
                                ) : (
                                    <Link
                                        href={buildTagUrl(size.seoUrl)}
                                        className="d-flex align-items-center text-decoration-none text-dark"
                                    >
                                        <input
                                            type="radio"
                                            className="form-check-input"
                                            checked={false}
                                            readOnly
                                        />
                                        <span className="form-check-label ms-2">
                                            {size.display}
                                        </span>
                                    </Link>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-muted small mb-0">Ebat bilgisi yükleniyor...</p>
                )}
            </div>
        </div>
    );
}