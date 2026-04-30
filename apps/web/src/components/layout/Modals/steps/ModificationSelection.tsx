'use client';

import { useState, useEffect, useMemo } from 'react';
import { useWheelSize } from '@/src/hooks/WheelSize/useWheelSize';
import type { WheelSizeModification } from '@/src/types/vehicle';

/* MUI */
import { Typography, Divider, Box, Alert } from '@mui/material';

/* Internal Imports */
import { useTranslations } from '@/src/hooks/Theme/useTranslations';
import { translateFuelType, translateBodyType } from '@/src/utils/vehicleTranslations';


interface ModificationSelectionProps {
    make: string;
    makeName: string;
    model: string;
    modelName: string;
    year: number;
    generation?: string;
    selectedModification?: string;
    vehicleImage?: string;
    onSelect: (modification: string, modificationName: string) => void;
    onSkipToSize?: () => void;
}

export default function ModificationSelection({
    make,
    makeName,
    model,
    modelName,
    year,
    generation,
    selectedModification,
    vehicleImage,
    onSkipToSize,
    onSelect
}: ModificationSelectionProps) {
    const { getModifications, loading } = useWheelSize();
    const [modifications, setModifications] = useState<WheelSizeModification[]>([]);
    const { t } = useTranslations('general');

    // Filtreler
    const [filterFuel, setFilterFuel] = useState<string>('');
    const [filterPower, setFilterPower] = useState<string>('');
    const [filterBody, setFilterBody] = useState<string>('');

    useEffect(() => {
        if (make && model && year) loadModifications();
    }, [make, model, year]);

    const loadModifications = async () => {
        const data = await getModifications(make, model, year);
        setModifications(data);
    };

    // Filtre seçeneklerini çıkar
    const allFuelTypes = useMemo(() => {
        const fuels = new Set<string>();
        modifications.forEach(mod => {
            if (mod.engine?.fuel) fuels.add(mod.engine.fuel);
        });
        return Array.from(fuels).sort();
    }, [modifications]);

    const allPowerOptions = useMemo(() => {
        const powers = new Set<string>();
        modifications.forEach(mod => {
            if (mod.engine?.power?.hp) {
                powers.add(`${mod.engine.power.hp} hp`);
            }
        });
        return Array.from(powers).sort((a, b) => {
            const numA = parseInt(a);
            const numB = parseInt(b);
            return numA - numB;
        });
    }, [modifications]);

    const allBodyTypes = useMemo(() => {
        const bodies = new Set<string>();
        modifications.forEach(mod => {
            if (mod.generation?.bodies) {
                mod.generation.bodies.forEach(b => bodies.add(b.name));
            }
        });
        return Array.from(bodies);
    }, [modifications]);
    const filteredModifications = useMemo(() => {
        return modifications.filter(mod => {
            if (filterFuel && mod.engine?.fuel !== filterFuel) return false;
            if (filterPower && `${mod.engine?.power?.hp} hp` !== filterPower) return false;
            if (filterBody && !mod.generation?.bodies?.some(b => b.name === filterBody)) return false;
            return true;
        });
    }, [modifications, filterFuel, filterPower, filterBody]);

    const resetFilters = () => {
        setFilterFuel('');
        setFilterPower('');
        setFilterBody('');
    };

    const hasActiveFilters = filterFuel || filterPower || filterBody;

    if (loading) {
        return (
            <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Yükleniyor...</span>
                </div>
                <p className="mt-3 text-muted">Motor bilgileri yükleniyor...</p>
            </div>
        );
    }
    if (!loading && modifications.length === 0) {
        return (
            <div className="modification-selection">
                <div className="row justify-content-center">
                    <div className="col-md-8">
                        <div className="text-center py-5">
                            <i className="ri-error-warning-line" style={{ fontSize: '4rem', color: 'var(--cz-primary)' }}></i>
                            <Typography variant="h6" sx={{ mt: 2, color: 'black' }}>
                                Motor Bilgisi Bulunamadı
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                                <strong>{makeName} {modelName}</strong> için motor bilgisi bulunamadı.
                            </Typography>
                            {onSkipToSize && (
                                <button
                                    className="btn btn-primary mt-3"
                                    onClick={onSkipToSize}
                                >
                                    Lastik Ebatlarına Git
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="modification-selection">
            <div className="row">
                {/* Sol: Araç Bilgisi + Filtreler */}
                <div className="d-none d-md-block col-md-3">
                    <Typography variant="h6" sx={{ py: 1.5, color: 'black' }}>
                        {t('garage_car')}
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

                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'black' }}>
                        {makeName} {modelName} {year}
                    </Typography>

                    {/* Filtreler */}
                    <Box sx={{ mt: 2 }} />
                    <Divider />
                    <Typography variant="h6" sx={{ py: 1.5, color: 'black' }}>
                        {t('filter')}
                        {hasActiveFilters && (
                            <button
                                onClick={resetFilters}
                                className="btn btn-sm btn-link pl-2 text-danger"
                                style={{ fontSize: '12px' }}
                            >
                                {t('clear')}
                            </button>
                        )}
                    </Typography>
                    <Divider />
                    <div className="py-2">
                        {/* Yakıt Filtresi */}
                        {allFuelTypes.length > 1 && (
                            <div className="mb-3">
                                <label className="form-label fw-semibold" style={{ fontSize: '13px' }}>Yakıt</label>
                                <select
                                    className="form-select"
                                    value={filterFuel}
                                    onChange={(e) => setFilterFuel(e.target.value)}
                                    style={{
                                        borderRadius: '0.375rem',
                                        border: '1px solid black',
                                        padding: '0.75rem'
                                    }}
                                >
                                    <option value="">Tümü</option>
                                    {allFuelTypes.map((fuel, idx) => (
                                        <option key={`fuel-${idx}`} value={fuel}>{translateFuelType(fuel)}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {/* Motor Gücü Filtresi */}
                        {allPowerOptions.length > 1 && (
                            <div className="mb-3">
                                <label className="form-label fw-semibold" style={{ fontSize: '13px' }}>Motor Gücü</label>
                                <select
                                    className="form-select"
                                    value={filterPower}
                                    onChange={(e) => setFilterPower(e.target.value)}
                                    style={{
                                        borderRadius: '0.375rem',
                                        border: '1px solid black',
                                        padding: '0.75rem'
                                    }}
                                >
                                    <option value="">Tümü</option>
                                    {allPowerOptions.map((power, idx) => (
                                        <option key={`power-${idx}`} value={power}>{power}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>
                {/* Sağ: Motor Listesi */}
                <div className="col-md-9">
                    {/* Motor Tablosu */}
                    {filteredModifications.length > 0 ? (
                        <>
                            {/* Masaüstü: Tablo */}
                            <div className="table-responsive d-none d-md-block">
                                <table className="table table-hover align-middle" style={{ fontSize: '14px' }}>
                                    <thead>
                                        <tr className="text-muted" style={{ fontSize: '12px' }}>
                                            <th>Tip</th>
                                            <th>Üretim Yılı</th>
                                            <th>Güç</th>
                                            <th>Motor Hacmi</th>
                                            <th>Yakıt</th>
                                            <th>Kasa</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredModifications.map((mod) => (
                                            <tr
                                                key={mod.slug}
                                                onClick={() => onSelect(mod.slug, mod.name)}
                                                className={selectedModification === mod.slug ? 'table-active' : ''}
                                                style={{
                                                    cursor: 'pointer',
                                                    borderLeft: selectedModification === mod.slug ? '3px solid #dc3545' : '3px solid transparent'
                                                }}
                                            >
                                                <td><strong>{mod.name}</strong></td>
                                                <td>
                                                    {mod.start_year && mod.end_year
                                                        ? `${mod.start_year} - ${mod.end_year}`
                                                        : mod.start_year
                                                            ? `${mod.start_year} - bugüne`
                                                            : '-'
                                                    }
                                                </td>
                                                <td>
                                                    {mod.engine?.power?.hp
                                                        ? `${mod.engine.power.hp} hp / ${mod.engine.power.kW} kW`
                                                        : '-'
                                                    }
                                                </td>
                                                <td>
                                                    {mod.engine?.capacity
                                                        ? <span>{mod.engine.capacity} L</span>
                                                        : '-'
                                                    }
                                                </td>
                                                <td>{mod.engine?.fuel ? translateFuelType(mod.engine.fuel) : '-'}</td>
                                                <td>{mod.generation?.bodies?.[0]?.name ? translateBodyType(mod.generation.bodies[0].name) : '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobil: Kart Listesi */}
                            <div className="d-block d-md-none">
                                {filteredModifications.map((mod) => {
                                    const isSelected = selectedModification === mod.slug;
                                    return (
                                        <div
                                            key={mod.slug}
                                            onClick={() => onSelect(mod.slug, mod.name)}
                                            className="mb-2 p-3 border rounded"
                                            style={{
                                                cursor: 'pointer',
                                                borderColor: isSelected ? '#dc3545' : '#dee2e6',
                                                borderWidth: isSelected ? '2px' : '1px',
                                                backgroundColor: isSelected ? '#fff5f5' : '#fff'
                                            }}
                                        >
                                            <div className="d-flex justify-content-between align-items-start mb-2">
                                                <strong style={{ fontSize: '15px' }}>{mod.name}</strong>
                                                <span className="text-muted" style={{ fontSize: '12px' }}>
                                                    {mod.start_year && mod.end_year
                                                        ? `${mod.start_year} - ${mod.end_year}`
                                                        : mod.start_year
                                                            ? `${mod.start_year} - bugüne`
                                                            : '-'
                                                    }
                                                </span>
                                            </div>
                                            <div className="d-flex flex-wrap gap-2" style={{ fontSize: '13px' }}>
                                                {mod.engine?.power?.hp && (
                                                    <span className="badge bg-light text-dark border">
                                                        {mod.engine.power.hp} hp / {mod.engine.power.kW} kW
                                                    </span>
                                                )}
                                                {mod.engine?.capacity && (
                                                    <span className="badge bg-light text-dark border">
                                                        {mod.engine.capacity} L
                                                    </span>
                                                )}
                                                {mod.engine?.fuel && (
                                                    <span className="badge bg-light text-dark border">
                                                        {translateFuelType(mod.engine.fuel)}
                                                    </span>
                                                )}
                                                {mod.generation?.bodies?.[0]?.name && (
                                                    <span className="badge bg-light text-dark border">
                                                        {translateBodyType(mod.generation.bodies[0].name)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-5">
                            <i className="ri-settings-3-line fs-1 text-muted"></i>
                            <p className="text-muted mt-2">Sonuç bulunamadı</p>
                            {hasActiveFilters && (
                                <button onClick={resetFilters} className="btn btn-primary btn-sm">
                                    Filtreleri Temizle
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}