'use client';

import { useState, useEffect, useMemo } from 'react';
import { Typography, Divider, Box, Tooltip } from '@mui/material';
import wheelSizeService, { GroupedTires, TireOption, VehicleDetailsResponse } from '@/src/services/wheelSizeService';
import type { TireSize } from '@/src/types/tire-search';

interface TireSizeSelectionProps {
    make: string;
    makeName: string;
    model: string;
    modelName: string;
    year: number;
    modification: string;
    modificationName: string;
    vehicleImage?: string;
    onSelect: (tireSize: TireSize) => void;
}

type PositionFilter = 'all' | 'front' | 'rear' | 'both';

interface VehicleInfo {
    name: string;
    bodyType?: string;
    engine?: {
        fuel: string;
        capacity: string;
        type: string;
        power: { hp: number; kW: number };
    };
}

export default function TireSizeSelection({
    make,
    makeName,
    model,
    modelName,
    year,
    modification,
    modificationName,
    vehicleImage,
    onSelect
}: TireSizeSelectionProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [groupedTires, setGroupedTires] = useState<GroupedTires>({ front: [], rear: [], both: [] });
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [vehicleInfo, setVehicleInfo] = useState<VehicleInfo | null>(null);
    const [positionFilter, setPositionFilter] = useState<PositionFilter>('all');
    const [vehiclePcd, setVehiclePcd] = useState<string>('');

    useEffect(() => {
        if (make && model && year && modification) {
            loadCompatibleSizes();
        }
    }, [make, model, year, modification]);

    const loadCompatibleSizes = async () => {
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
                        capacity: data.engine.capacity,
                        type: data.engine.type,
                        power: { hp: data.engine.power.hp, kW: data.engine.power.kW }
                    } : undefined
                });

                if (data.technical?.stud_holes && data.technical?.pcd) {
                    const pcd = `${data.technical.stud_holes}X${data.technical.pcd}`;
                    setVehiclePcd(pcd);
                }
            }

            const grouped = wheelSizeService.parseGroupedTires(vehicleData);
            setGroupedTires(grouped);

            const total = grouped.front.length + grouped.rear.length + grouped.both.length;
            if (total === 0) {
                setError('Bu araç için uyumlu lastik ebatı bulunamadı.');
            }
        } catch (err) {
            console.error('[TireSizeSelection] API Error:', err);
            setError('Lastik ebatları yüklenirken bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (tire: TireOption, position: 'front' | 'rear' | 'both') => {
        setSelectedId(tire.id);

        const tireSize: TireSize = {
            front: position === 'rear' ? '' : tire.display,
            rear: position === 'front' ? '' : tire.display,
            width: tire.width,
            aspectRatio: tire.aspectRatio,
            diameter: tire.diameter
        };

        onSelect(tireSize);
    };

    const getFuelLabel = (fuel: string): string => {
        const map: Record<string, string> = {
            'Petrol': 'Benzin', 'Diesel': 'Dizel', 'Hybrid': 'Hibrit',
            'Electric': 'Elektrik', 'Natural gas': 'LPG'
        };
        return map[fuel] || fuel;
    };

    // Filtrelenmiş sayılar
    const counts = useMemo(() => ({
        all: groupedTires.front.length + groupedTires.rear.length + groupedTires.both.length,
        front: groupedTires.front.length,
        rear: groupedTires.rear.length,
        both: groupedTires.both.length
    }), [groupedTires]);

    // Staggered var mı?
    const hasStaggered = groupedTires.front.length > 0 || groupedTires.rear.length > 0;

    const renderTireGroup = (title: string, tires: TireOption[], position: 'front' | 'rear' | 'both', badgeColor: string) => {
        if (tires.length === 0) return null;

        return (
            <div className="mb-4">
                <h4 className="mb-1" style={{ fontSize: '16px', fontWeight: 600 }}>{title}</h4>
                <Divider sx={{ mb: 2 }} />

                {/* Masaüstü: Tablo */}
                <div className="table-responsive d-none d-md-block">
                    <table className="table table-hover align-middle" style={{ fontSize: '14px' }}>
                        <thead>
                            <tr className="text-muted" style={{ fontSize: '12px' }}>
                                <th>Ebat</th>
                                <th>Yük/Hız</th>
                                <th>Uyumlu Jant</th>
                                <th>Hava Basıncı (PSI)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tires.map(tire => (
                                <tr
                                    key={tire.id}
                                    onClick={() => handleSelect(tire, position)}
                                    className={selectedId === tire.id ? 'table-active' : ''}
                                    style={{
                                        cursor: 'pointer',
                                        borderLeft: selectedId === tire.id ? '3px solid var(--cz-primary)' : '3px solid transparent'
                                    }}
                                >
                                    <td><strong>{tire.display}</strong></td>
                                    <td>
                                        {tire.loadIndex && tire.speedIndex
                                            ? `${tire.loadIndex}${tire.speedIndex}`
                                            : '-'
                                        }
                                    </td>
                                    <td>
                                        {vehiclePcd ? (
                                            <Tooltip title="Ürünleri İncele">

                                                <a href={`/kategori/jant?jantCap=${tire.diameter}&bijon=${vehiclePcd}`}
                                                    className="text-primary text-decoration-none"
                                                    style={{ fontSize: '14px' }}
                                                >
                                                    {tire.diameter}" / {vehiclePcd}
                                                </a>
                                            </Tooltip>
                                        ) : '-'}
                                    </td>
                                    <td>
                                        {tire.pressure ? (
                                            <span style={{ fontSize: '13px' }}>
                                                {tire.pressure.psi} PSI
                                            </span>
                                        ) : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobil: Kart Listesi */}
                <div className="d-block d-md-none">
                    {tires.map(tire => {
                        const isSelected = selectedId === tire.id;
                        return (
                            <div
                                key={tire.id}
                                onClick={() => handleSelect(tire, position)}
                                className="mb-2 p-3 border rounded"
                                style={{
                                    cursor: 'pointer',
                                    borderColor: isSelected ? 'var(--cz-primary)' : '#dee2e6',
                                    borderWidth: isSelected ? '2px' : '1px',
                                    backgroundColor: isSelected ? '#fff5f5' : '#fff'
                                }}
                            >
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <strong style={{ fontSize: '16px' }}>{tire.display}</strong>
                                    {tire.loadIndex && tire.speedIndex && (
                                        <span className="badge bg-dark">{tire.loadIndex}{tire.speedIndex}</span>
                                    )}
                                </div>
                                <div className="d-flex flex-wrap gap-3" style={{ fontSize: '13px' }}>
                                    {vehiclePcd && (
                                        <div>
                                            <span className="text-muted">Jant: </span>

                                            <a href={`/kategori/jant?jantCap=${tire.diameter}&bijon=${vehiclePcd}`}
                                                onClick={(e) => e.stopPropagation()}
                                                className="text-primary text-decoration-none fw-semibold"
                                            >
                                                {tire.diameter}" / {vehiclePcd}
                                            </a>
                                        </div>
                                    )}
                                    {tire.pressure && (
                                        <div>
                                            <span className="text-muted">Basınç: </span>
                                            <strong>{tire.pressure.psi} PSI</strong>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
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

    if (error) {
        return (
            <div className="text-center py-5">
                <i className="ri-error-warning-line fs-1 text-danger"></i>
                <p className="text-danger mt-2">{error}</p>
                <button className="btn btn-outline-primary btn-sm mt-2" onClick={loadCompatibleSizes}>
                    <i className="ri-refresh-line me-1"></i>Tekrar Dene
                </button>
            </div>
        );
    }

    return (
        <div className="tire-size-selection">
            <div className="row">
                {/* Sol Panel - Araç Bilgisi + Filtreler */}
                <div className="d-none d-md-block col-md-3">
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
                                style={{ maxHeight: '100px', objectFit: 'contain' }}
                            />
                        ) : (
                            <i className="ri-car-line" style={{ fontSize: '3rem', color: '#dee2e6' }}></i>
                        )}
                    </div>

                    {/* Araç Detayları */}
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

                    {/* Pozisyon Filtresi */}
                    <Box sx={{ mt: 2 }} />
                    <Divider />
                    <Typography variant="h6" sx={{ py: 1.5, color: 'black' }}>
                        Pozisyon
                    </Typography>
                    <Divider />

                    <div className="py-2">
                        <div className="form-check mb-2">
                            <input
                                type="radio"
                                className="form-check-input"
                                id="pos-all"
                                name="position"
                                checked={positionFilter === 'all'}
                                onChange={() => setPositionFilter('all')}
                            />
                            <label className="form-check-label" htmlFor="pos-all">
                                Tümü
                            </label>
                        </div>

                        {counts.both > 0 && (
                            <div className="form-check mb-2">
                                <input
                                    type="radio"
                                    className="form-check-input"
                                    id="pos-both"
                                    name="position"
                                    checked={positionFilter === 'both'}
                                    onChange={() => setPositionFilter('both')}
                                />
                                <label className="form-check-label" htmlFor="pos-both">
                                    Ön/Arka (Ortak)
                                </label>
                            </div>
                        )}

                        {counts.front > 0 && (
                            <div className="form-check mb-2">
                                <input
                                    type="radio"
                                    className="form-check-input"
                                    id="pos-front"
                                    name="position"
                                    checked={positionFilter === 'front'}
                                    onChange={() => setPositionFilter('front')}
                                />
                                <label className="form-check-label" htmlFor="pos-front">
                                    Sadece Ön
                                </label>
                            </div>
                        )}

                        {counts.rear > 0 && (
                            <div className="form-check mb-2">
                                <input
                                    type="radio"
                                    className="form-check-input"
                                    id="pos-rear"
                                    name="position"
                                    checked={positionFilter === 'rear'}
                                    onChange={() => setPositionFilter('rear')}
                                />
                                <label className="form-check-label" htmlFor="pos-rear">
                                    Sadece Arka
                                </label>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sağ Panel - Lastik Grupları */}
                <div className="col-md-9">
                    <div className="tire-groups">
                        {/* Ön/Arka Aynı Ebatlar */}
                        {(positionFilter === 'all' || positionFilter === 'both') &&
                            renderTireGroup('Ön ve Arka Lastik Ebatları', groupedTires.both, 'both', 'bg-success')}

                        {/* Sadece Ön Ebatlar */}
                        {(positionFilter === 'all' || positionFilter === 'front') &&
                            renderTireGroup('Ön Lastik Ebatları', groupedTires.front, 'front', 'bg-primary')}

                        {/* Sadece Arka Ebatlar */}
                        {(positionFilter === 'all' || positionFilter === 'rear') &&
                            renderTireGroup('Arka Lastik Ebatları', groupedTires.rear, 'rear', 'bg-warning text-dark')}
                    </div>
                </div>
            </div>
        </div>
    );
}