'use client';

import { useState, useEffect } from 'react';
import { Typography, Divider, Box } from '@mui/material';
import wheelSizeService from '@/src/services/wheelSizeService';
import type { ChainSize } from '@/src/types/tire-search';

interface ChainSizeSelectionProps {
    make: string;
    makeName: string;
    model: string;
    modelName: string;
    year: number;
    modification: string;
    modificationName: string;
    vehicleImage?: string;
    onSelect: (chainSize: ChainSize) => void;
}

interface ChainOption {
    id: string;
    width: number;
    aspectRatio: number;
    diameter: number;
    display: string;
}

interface VehicleInfo {
    name: string;
    bodyType?: string;
    engine?: {
        fuel: string;
        power: { hp: number; kW: number };
    };
}

export default function ChainSizeSelection({
    make,
    makeName,
    model,
    modelName,
    year,
    modification,
    modificationName,
    vehicleImage,
    onSelect
}: ChainSizeSelectionProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [chains, setChains] = useState<ChainOption[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [vehicleInfo, setVehicleInfo] = useState<VehicleInfo | null>(null);

    useEffect(() => {
        if (make && model && year && modification) {
            loadCompatibleChains();
        }
    }, [make, model, year, modification]);

    const loadCompatibleChains = async () => {
        setLoading(true);
        setError(null);

        try {
            const vehicleData = await wheelSizeService.getVehicleDetails(make, model, year, modification);

            if (vehicleData.length > 0) {
                const data = vehicleData[0];
                setVehicleInfo({
                    name: data.name,
                    bodyType: data.generation?.bodies?.[0]?.name,
                    engine: data.engine ? {
                        fuel: data.engine.fuel,
                        power: { hp: data.engine.power.hp, kW: data.engine.power.kW }
                    } : undefined
                });
            }

            const grouped = wheelSizeService.parseGroupedTires(vehicleData);
            const chainOptions: ChainOption[] = [];

            // Tüm lastik ebatlarından kar paleti ebatı çıkar
            [...grouped.both, ...grouped.front, ...grouped.rear].forEach(tire => {
                const id = `${tire.width}-${tire.aspectRatio}-${tire.diameter}`;
                if (!chainOptions.find(c => c.id === id)) {
                    chainOptions.push({
                        id,
                        width: tire.width,
                        aspectRatio: tire.aspectRatio,
                        diameter: tire.diameter,
                        display: `${tire.width}/${tire.aspectRatio} R${tire.diameter}`
                    });
                }
            });

            setChains(chainOptions);

            if (chainOptions.length === 0) {
                setError('Bu araç için uyumlu kar paleti ebatı bulunamadı.');
            }
        } catch (err) {
            console.error('[ChainSizeSelection] API Error:', err);
            setError('Kar paleti ebatları yüklenirken bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (chain: ChainOption) => {
        setSelectedId(chain.id);
        onSelect({
            width: chain.width,
            aspectRatio: chain.aspectRatio,
            diameter: chain.diameter,
            display: chain.display
        });
    };

    const getFuelLabel = (fuel: string): string => {
        const map: Record<string, string> = {
            'Petrol': 'Benzin', 'Diesel': 'Dizel', 'Hybrid': 'Hibrit',
            'Electric': 'Elektrik', 'Natural gas': 'LPG'
        };
        return map[fuel] || fuel;
    };

    if (loading) {
        return (
            <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Yükleniyor...</span>
                </div>
                <p className="mt-3 text-muted">Uyumlu kar paleti ebatları yükleniyor...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-5">
                <i className="ri-error-warning-line fs-1 text-danger"></i>
                <p className="text-danger mt-2">{error}</p>
                <button className="btn btn-outline-primary btn-sm mt-2" onClick={loadCompatibleChains}>
                    <i className="ri-refresh-line me-1"></i>Tekrar Dene
                </button>
            </div>
        );
    }

    return (
        <div className="chain-size-selection">
            <div className="row">
                {/* Sol Panel - Araç Bilgisi */}
                <div className="col-md-3">
                    <Typography variant="h6" sx={{ py: 1.5, color: 'black' }}>
                        Araç Bilgisi
                    </Typography>
                    <Divider />

                    <div className="text-center py-3">
                        {vehicleImage ? (
                            <img
                                src={vehicleImage}
                                alt={`${makeName} ${modelName}`}
                                className="img-fluid"
                                style={{ maxHeight: '100px', objectFit: 'contain' }}
                            />
                        ) : (
                            <i className="ri-car-line" style={{ fontSize: '3rem', color: '#dee2e6' }}></i>
                        )}
                    </div>

                    <div className="small">
                        <div className="d-flex justify-content-between py-1">
                            <span className="text-muted">Araç:</span>
                            <strong>{makeName} {modelName}</strong>
                        </div>
                        {vehicleInfo?.bodyType && (
                            <div className="d-flex justify-content-between py-1">
                                <span className="text-muted">Kasa:</span>
                                <strong>{vehicleInfo.bodyType}</strong>
                            </div>
                        )}
                        <div className="d-flex justify-content-between py-1">
                            <span className="text-muted">Yıl:</span>
                            <strong>{year}</strong>
                        </div>
                        <div className="d-flex justify-content-between py-1">
                            <span className="text-muted">Motor:</span>
                            <strong>{vehicleInfo?.name || modificationName}</strong>
                        </div>
                        {vehicleInfo?.engine?.power && (
                            <div className="d-flex justify-content-between py-1">
                                <span className="text-muted">Güç:</span>
                                <strong>{vehicleInfo.engine.power.hp} hp</strong>
                            </div>
                        )}
                        {vehicleInfo?.engine?.fuel && (
                            <div className="d-flex justify-content-between py-1">
                                <span className="text-muted">Yakıt:</span>
                                <strong>{getFuelLabel(vehicleInfo.engine.fuel)}</strong>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sağ Panel - Kar Paleti Ebatları */}
                <div className="col-md-9">
                    <Typography variant="h6" sx={{ py: 1.5, color: 'black' }}>
                        Uyumlu Kar Paleti Ebatları
                    </Typography>
                    <Divider sx={{ mb: 2 }} />

                    <div className="table-responsive">
                        <table className="table table-hover align-middle" style={{ fontSize: '14px' }}>
                            <thead>
                                <tr className="text-muted" style={{ fontSize: '12px' }}>
                                    <th>Ebat</th>
                                    <th>Genişlik</th>
                                    <th>Yanak</th>
                                    <th>Jant Çapı</th>
                                </tr>
                            </thead>
                            <tbody>
                                {chains.map(chain => (
                                    <tr
                                        key={chain.id}
                                        onClick={() => handleSelect(chain)}
                                        className={selectedId === chain.id ? 'table-active' : ''}
                                        style={{
                                            cursor: 'pointer',
                                            borderLeft: selectedId === chain.id ? '3px solid var(--cz-primary)' : '3px solid transparent'
                                        }}
                                    >
                                        <td><strong>{chain.display}</strong></td>
                                        <td>{chain.width}</td>
                                        <td>{chain.aspectRatio}</td>
                                        <td>R{chain.diameter}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}