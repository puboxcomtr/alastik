'use client';

import { useState, useEffect, useMemo } from 'react';
import { useWheelSize } from '@/src/hooks/WheelSize/useWheelSize';

/* MUI */
import { Typography, Divider, Box } from '@mui/material';

/* Internal Imports */
import { useTranslations } from '@/src/hooks/Theme/useTranslations';
import { translateBodyType } from '@/src/utils/vehicleTranslations';

interface GenerationSelectionProps {
    make: string;
    makeName: string;
    model: string;
    modelName: string;
    onSelect: (year: number, generation: string, vehicleImage?: string) => void;
}

interface Generation {
    slug: string;
    name: string;
    start: number;
    end: number | null;
    years: number[];
    year_ranges: string[];
    bodies: Array<{
        slug: string;
        name: string;
        image?: string;
    }>;
}

export default function GenerationSelection({ make, makeName, model, modelName, onSelect }: GenerationSelectionProps) {
    const { getGenerations, loading } = useWheelSize();
    const [generations, setGenerations] = useState<Generation[]>([]);
    const { t } = useTranslations('general');
    // Filtreler
    const [filterYear, setFilterYear] = useState<number | null>(null);
    const [filterBody, setFilterBody] = useState<string>('');

    useEffect(() => {
        if (make && model) loadGenerations();
    }, [make, model]);

    const loadGenerations = async () => {
        const data = await getGenerations(make, model);
        setGenerations(data || []);
    };
    const allYears = useMemo(() => {
        const years = new Set<number>();
        generations.forEach(gen => {
            if (gen.years) {
                gen.years.forEach(y => years.add(y));
            }
        });
        return Array.from(years).sort((a, b) => b - a);
    }, [generations]);
    const allBodyTypes = useMemo(() => {
        const bodies = new Set<string>();
        generations.forEach(gen => {
            if (gen.bodies) {
                gen.bodies.forEach(b => bodies.add(b.name));
            }
        });
        return Array.from(bodies);
    }, [generations]);
    const filteredGenerations = useMemo(() => {
        return generations.filter(gen => {
            if (filterYear && gen.years && !gen.years.includes(filterYear)) {
                return false;
            }
            if (filterBody && gen.bodies && !gen.bodies.some(b => b.name === filterBody)) {
                return false;
            }
            return true;
        });
    }, [generations, filterYear, filterBody]);

    const handleSelect = (gen: Generation) => {
        const year = gen.years?.length > 0
            ? gen.years[gen.years.length - 1]
            : gen.end || gen.start;
        const image = gen.bodies?.[0]?.image;
        onSelect(year, gen.slug, image);
    };

    const resetFilters = () => {
        setFilterYear(null);
        setFilterBody('');
    };

    if (loading) {
        return (
            <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Yükleniyor...</span>
                </div>
                <p className="mt-3 text-muted">Araç modelleri yükleniyor...</p>
            </div>
        );
    }
    if (!loading && generations.length === 0) {
        return (
            <div className="generation-selection">
                <div className="row justify-content-center">
                    <div className="col-md-8">
                        <div className="text-center py-5">
                            <i className="ri-error-warning-line" style={{ fontSize: '4rem', color: 'var(--cz-primary)' }}></i>
                            <Typography variant="h6" sx={{ mt: 2, color: 'black' }}>
                                Araç Bilgisi Bulunamadı
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                                <strong>{makeName} {modelName}</strong> için detaylı bilgi internet sitemizde bulunmuyor.
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
                                Lastik ebadınızı aracınızın kapı etiketinden veya mevcut lastiklerinizden öğrenebilirsiniz.
                            </Typography>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="generation-selection">
            <div className="row">
                {/* Sol: Filtreler */}
                <div className="col-md-3">
                    <Typography variant="h6" sx={{ py: 1.5, color: 'black', }}>
                        {t('garage_car')}
                    </Typography>
                    <Divider />
                    <Typography variant="subtitle2" sx={{ py: 1.5, color: 'text.grey' }}>
                        {makeName} {modelName}
                    </Typography>
                    <Box sx={{ m: 2 }} />
                    <Divider />
                    <Typography variant="h6" sx={{ py: 1.5, color: 'black', }}>
                        {t('filter')}
                        {(filterYear || filterBody) && (
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
                    <div className="card-body py-2">
                        {/* Yıl Filtresi */}
                        <div className="mb-3">
                            <label className="form-label fw-semibold" style={{ fontSize: '13px' }}>Üretim Yılı</label>
                            <select
                                className="form-select cursor-pointer"
                                value={filterYear || ''}
                                onChange={(e) => setFilterYear(e.target.value ? Number(e.target.value) : null)}
                                style={{
                                    borderRadius: '0.375rem',
                                    border: '1px solid black',
                                    padding: '0.75rem'
                                }}
                            >
                                <option value="">Tümü</option>
                                {allYears.map((year, idx) => (
                                    <option key={`year-${year}-${idx}`} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>

                        {/* Kasa Tipi Filtresi */}
                        {allBodyTypes.length > 0 && (
                            <div className="mb-2">
                                <label className="form-label fw-semibold" style={{ fontSize: '13px' }}>Kasa Tipi</label>
                                {allBodyTypes.map((body, idx) => (
                                    <div key={`body-${idx}`} className="form-check">
                                        <input
                                            className="form-check-input"
                                            type="radio"
                                            name="bodyType"
                                            id={`body-${idx}`}
                                            checked={filterBody === body}
                                            onChange={() => setFilterBody(filterBody === body ? '' : body)}
                                        />
                                        <label className="form-check-label" style={{ fontSize: '13px' }} htmlFor={`body-${idx}`}>
                                            {translateBodyType(body)}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                {/* Sağ: Jenerasyon Kartları */}
                <div className="col-md-9">
                    {filteredGenerations.length > 0 ? (
                        <div className="row g-3">
                            {filteredGenerations.map((gen, idx) => (
                                <div key={`gen-${gen.slug}-${idx}`} className="col-md-4">
                                    <div
                                        className="card h-100"
                                        onClick={() => handleSelect(gen)}
                                        style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.borderColor = '#000';
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.borderColor = '#dee2e6';
                                            e.currentTarget.style.transform = 'translateY(0)';
                                        }}
                                    >
                                        {/* Araç Görseli */}
                                        <div
                                            className="card-img-top bg-light d-flex align-items-center justify-content-center"
                                            style={{ height: '140px', overflow: 'hidden' }}
                                        >
                                            {gen.bodies?.[0]?.image ? (
                                                <img
                                                    src={gen.bodies[0].image}
                                                    alt={gen.name}
                                                    className="img-fluid"
                                                    style={{ maxHeight: '100%', objectFit: 'contain' }}
                                                />
                                            ) : (
                                                <i className="ri-car-line" style={{ fontSize: '4rem', color: '#dee2e6' }}></i>
                                            )}
                                        </div>

                                        {/* Bilgiler */}
                                        <div className="card-body text-center p-2">
                                            <h6 className="mb-1" style={{ fontSize: '14px' }}>{gen.name}</h6>
                                            <small className="text-muted d-block">
                                                {gen.bodies?.[0]?.name ? translateBodyType(gen.bodies[0].name) : ''}
                                            </small>
                                            <small className="text-muted">
                                                {gen.start} - {gen.end || 'günümüz'}
                                            </small>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-5">
                            <i className="ri-car-line fs-1 text-muted"></i>
                            <p className="text-muted mt-2">Sonuç bulunamadı</p>
                            {(filterYear || filterBody) && (
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