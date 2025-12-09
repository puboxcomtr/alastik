'use client';

import { useState, useEffect, useMemo } from 'react';
import { Typography, Divider, Box } from '@mui/material';
import wheelSizeService from '@/src/services/wheelSizeService';
import type { RimSize } from '@/src/types/tire-search';

interface RimSizeSelectionProps {
    make: string;
    makeName: string;
    model: string;
    modelName: string;
    year: number;
    modification: string;
    modificationName: string;
    vehicleImage?: string;
    onSelect: (rimSize: RimSize) => void;
}

interface RimOption {
    id: string;
    diameter: number;
    width: number;
    pcd: string;
    pcdRaw: { bolts: number; diameter: number };
    offset: number;
    centerBore: number;
    isStock: boolean;
    display: string;
}

interface GroupedRims {
    front: RimOption[];
    rear: RimOption[];
    both: RimOption[];
}

interface VehicleInfo {
    name: string;
    bodyType?: string;
    engine?: {
        fuel: string;
        capacity: string;
        power: { hp: number; kW: number };
    };
}

type PositionFilter = 'all' | 'front' | 'rear' | 'both';

export default function RimSizeSelection({
    make,
    makeName,
    model,
    modelName,
    year,
    modification,
    modificationName,
    vehicleImage,
    onSelect
}: RimSizeSelectionProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [groupedRims, setGroupedRims] = useState<GroupedRims>({ front: [], rear: [], both: [] });
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [vehicleInfo, setVehicleInfo] = useState<VehicleInfo | null>(null);
    const [positionFilter, setPositionFilter] = useState<PositionFilter>('all');

    useEffect(() => {
        if (make && model && year && modification) {
            loadCompatibleRims();
        }
    }, [make, model, year, modification]);

    const loadCompatibleRims = async () => {
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
                        power: { hp: data.engine.power.hp, kW: data.engine.power.kW }
                    } : undefined
                });
            }

            const grouped = parseGroupedRims(vehicleData);
            setGroupedRims(grouped);

            const total = grouped.front.length + grouped.rear.length + grouped.both.length;
            if (total === 0) {
                setError('Bu araç için uyumlu jant ebatı bulunamadı.');
            }
        } catch (err) {
            console.error('[RimSizeSelection] API Error:', err);
            setError('Jant ebatları yüklenirken bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    // WheelSize API'dan gelen veriyi parse et
    const parseGroupedRims = (vehicleData: any[]): GroupedRims => {
        const front: RimOption[] = [];
        const rear: RimOption[] = [];
        const both: RimOption[] = [];
        const seenIds = new Set<string>();

        vehicleData.forEach(vehicle => {
            if (!vehicle.wheels) return;

            vehicle.wheels.forEach((wheel: any, idx: number) => {
                const frontRim = wheel.front?.rim;
                const rearRim = wheel.rear?.rim;
                const isStock = wheel.is_stock || false;

                // PCD bilgisini al
                const pcdData = frontRim?.bolt_pattern || rearRim?.bolt_pattern;
                const pcdString = pcdData ? `${pcdData.bolts}X${pcdData.diameter}` : '';

                // Ön ve arka aynı mı kontrol et
                const frontKey = frontRim ? `${frontRim.diameter}-${frontRim.width}-${pcdString}-${frontRim.offset}` : '';
                const rearKey = rearRim ? `${rearRim.diameter}-${rearRim.width}-${pcdString}-${rearRim.offset}` : '';

                if (frontKey && rearKey && frontKey === rearKey) {
                    // Ön/Arka aynı
                    const id = `both-${frontKey}-${idx}`;
                    if (!seenIds.has(id)) {
                        seenIds.add(id);
                        both.push({
                            id,
                            diameter: frontRim.diameter,
                            width: frontRim.width,
                            pcd: pcdString,
                            pcdRaw: pcdData || { bolts: 0, diameter: 0 },
                            offset: frontRim.offset,
                            centerBore: frontRim.center_bore || 0,
                            isStock,
                            display: `${frontRim.width}x${frontRim.diameter} ET${frontRim.offset}`
                        });
                    }
                } else {
                    // Farklı ön/arka (staggered)
                    if (frontRim) {
                        const id = `front-${frontKey}-${idx}`;
                        if (!seenIds.has(id)) {
                            seenIds.add(id);
                            front.push({
                                id,
                                diameter: frontRim.diameter,
                                width: frontRim.width,
                                pcd: pcdString,
                                pcdRaw: pcdData || { bolts: 0, diameter: 0 },
                                offset: frontRim.offset,
                                centerBore: frontRim.center_bore || 0,
                                isStock,
                                display: `${frontRim.width}x${frontRim.diameter} ET${frontRim.offset}`
                            });
                        }
                    }
                    if (rearRim) {
                        const rearPcd = rearRim.bolt_pattern || pcdData;
                        const rearPcdString = rearPcd ? `${rearPcd.bolts}X${rearPcd.diameter}` : pcdString;
                        const id = `rear-${rearKey}-${idx}`;
                        if (!seenIds.has(id)) {
                            seenIds.add(id);
                            rear.push({
                                id,
                                diameter: rearRim.diameter,
                                width: rearRim.width,
                                pcd: rearPcdString,
                                pcdRaw: rearPcd || { bolts: 0, diameter: 0 },
                                offset: rearRim.offset,
                                centerBore: rearRim.center_bore || 0,
                                isStock,
                                display: `${rearRim.width}x${rearRim.diameter} ET${rearRim.offset}`
                            });
                        }
                    }
                }
            });
        });

        // Sırala (stock önce, sonra diameter'a göre)
        const sortFn = (a: RimOption, b: RimOption) => {
            if (a.isStock !== b.isStock) return a.isStock ? -1 : 1;
            return a.diameter - b.diameter;
        };

        return {
            front: front.sort(sortFn),
            rear: rear.sort(sortFn),
            both: both.sort(sortFn)
        };
    };

    const handleSelect = (rim: RimOption) => {
        setSelectedId(rim.id);

        const rimSize: RimSize = {
            diameter: rim.diameter,
            width: rim.width,
            pcd: rim.pcd,
            offset: rim.offset,
            centerBore: rim.centerBore,
            display: rim.display
        };

        onSelect(rimSize);
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
        all: groupedRims.front.length + groupedRims.rear.length + groupedRims.both.length,
        front: groupedRims.front.length,
        rear: groupedRims.rear.length,
        both: groupedRims.both.length
    }), [groupedRims]);

    const renderRimGroup = (title: string, rims: RimOption[]) => {
        if (rims.length === 0) return null;

        return (
            <div className="mb-4">
                <h4 className="mb-1" style={{ fontSize: '16px', fontWeight: 600 }}>{title}</h4>
                <Divider sx={{ mb: 2 }} />

                <div className="table-responsive">
                    <table className="table table-hover align-middle" style={{ fontSize: '14px' }}>
                        <thead>
                            <tr className="text-muted" style={{ fontSize: '12px' }}>
                                <th>Ebat</th>
                                <th>PCD (Bijon)</th>
                                <th>Offset</th>
                                <th>Göbek</th>
                                <th className="text-end">Durum</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rims.map(rim => (
                                <tr
                                    key={rim.id}
                                    onClick={() => handleSelect(rim)}
                                    className={selectedId === rim.id ? 'table-active' : ''}
                                    style={{
                                        cursor: 'pointer',
                                        borderLeft: selectedId === rim.id ? '3px solid var(--cz-primary)' : '3px solid transparent'
                                    }}
                                >
                                    <td><strong>{rim.display}</strong></td>
                                    <td>{rim.pcd || '-'}</td>
                                    <td>ET{rim.offset}</td>
                                    <td>{rim.centerBore ? `${rim.centerBore} mm` : '-'}</td>
                                    <td className="text-end">
                                        {rim.isStock && <span className="badge bg-success">Fabrika Ebatı</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
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
                <p className="mt-3 text-muted">Uyumlu jant ebatları yükleniyor...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-5">
                <i className="ri-error-warning-line fs-1 text-danger"></i>
                <p className="text-danger mt-2">{error}</p>
                <button className="btn btn-outline-primary btn-sm mt-2" onClick={loadCompatibleRims}>
                    <i className="ri-refresh-line me-1"></i>Tekrar Dene
                </button>
            </div>
        );
    }

    return (
        <div className="rim-size-selection">
            <div className="row">
                {/* Sol Panel - Araç Bilgisi + Filtreler */}
                <div className="col-md-3">
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
                                id="rim-pos-all"
                                name="rimPosition"
                                checked={positionFilter === 'all'}
                                onChange={() => setPositionFilter('all')}
                            />
                            <label className="form-check-label" htmlFor="rim-pos-all">
                                Tümü ({counts.all})
                            </label>
                        </div>

                        {counts.both > 0 && (
                            <div className="form-check mb-2">
                                <input
                                    type="radio"
                                    className="form-check-input"
                                    id="rim-pos-both"
                                    name="rimPosition"
                                    checked={positionFilter === 'both'}
                                    onChange={() => setPositionFilter('both')}
                                />
                                <label className="form-check-label" htmlFor="rim-pos-both">
                                    Ön/Arka Ortak ({counts.both})
                                </label>
                            </div>
                        )}

                        {counts.front > 0 && (
                            <div className="form-check mb-2">
                                <input
                                    type="radio"
                                    className="form-check-input"
                                    id="rim-pos-front"
                                    name="rimPosition"
                                    checked={positionFilter === 'front'}
                                    onChange={() => setPositionFilter('front')}
                                />
                                <label className="form-check-label" htmlFor="rim-pos-front">
                                    Sadece Ön ({counts.front})
                                </label>
                            </div>
                        )}

                        {counts.rear > 0 && (
                            <div className="form-check mb-2">
                                <input
                                    type="radio"
                                    className="form-check-input"
                                    id="rim-pos-rear"
                                    name="rimPosition"
                                    checked={positionFilter === 'rear'}
                                    onChange={() => setPositionFilter('rear')}
                                />
                                <label className="form-check-label" htmlFor="rim-pos-rear">
                                    Sadece Arka ({counts.rear})
                                </label>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sağ Panel - Jant Grupları */}
                <div className="col-md-9">
                    <div className="rim-groups">
                        {(positionFilter === 'all' || positionFilter === 'both') &&
                            renderRimGroup('Ön ve Arka Jant Ebatları', groupedRims.both)}

                        {(positionFilter === 'all' || positionFilter === 'front') &&
                            renderRimGroup('Ön Jant Ebatları', groupedRims.front)}

                        {(positionFilter === 'all' || positionFilter === 'rear') &&
                            renderRimGroup('Arka Jant Ebatları', groupedRims.rear)}
                    </div>
                </div>
            </div>
        </div>
    );
}