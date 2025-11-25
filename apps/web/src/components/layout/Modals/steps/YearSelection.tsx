'use client';

import { useState, useEffect } from 'react';
import { useWheelSize } from '@/src/hooks/WheelSize/useWheelSize';

interface YearSelectionProps {
    make: string;
    model: string;
    selectedYear: number | null;
    onSelect: (year: number, generation?: string, vehicleImage?: string) => void;
}

export default function YearSelection({ make, model, selectedYear, onSelect }: YearSelectionProps) {
    const { getYears, loading } = useWheelSize();
    const [years, setYears] = useState<number[]>([]);

    useEffect(() => {
        if (make && model) loadYears();
    }, [make, model]);

    const loadYears = async () => {
        const data = await getYears(make, model);
        setYears(data.map((y: any) => y.year).sort((a: number, b: number) => b - a));
    };

    if (loading) {
        return (
            <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Yükleniyor...</span>
                </div>
                <p className="mt-3 text-muted">Yıllar yükleniyor...</p>
            </div>
        );
    }

    return (
        <div className="year-selection">
            <div className="text-center mb-4">
                <p className="text-muted">
                    <strong className="text-capitalize">{make} {model}</strong> için üretim yılını seçin
                </p>
            </div>

            {years.length > 0 ? (
                <div className="row g-2">
                    {years.map((year) => (
                        <div key={year} className="col-3 col-md-2">
                            <button
                                onClick={() => onSelect(year)}
                                className={`btn w-100 ${selectedYear === year ? 'btn-primary' : 'btn-outline-secondary'}`}
                            >
                                {year}
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-5">
                    <i className="ri-calendar-line fs-1 text-muted"></i>
                    <p className="text-muted mt-2">Yıl bulunamadı</p>
                </div>
            )}
        </div>
    );
}