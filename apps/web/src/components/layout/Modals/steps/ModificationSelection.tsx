'use client';

import { useState, useEffect } from 'react';
import { useWheelSize } from '@/src/hooks/WheelSize/useWheelSize';
import type { WheelSizeModification } from '@/src/types/vehicle';

interface ModificationSelectionProps {
    make: string;
    model: string;
    year: number;
    selectedModification?: string;
    vehicleImage?: string;
    onSelect: (modification: string, modificationName: string) => void;
}

export default function ModificationSelection({
    make,
    model,
    year,
    selectedModification,
    vehicleImage,
    onSelect
}: ModificationSelectionProps) {
    const { getModifications, loading } = useWheelSize();
    const [modifications, setModifications] = useState<WheelSizeModification[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (make && model && year) loadModifications();
    }, [make, model, year]);

    const loadModifications = async () => {
        const data = await getModifications(make, model, year);
        setModifications(data);
    };

    const filteredModifications = modifications.filter(mod =>
        (mod.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

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

    return (
        <div className="modification-selection">
            <div className="text-center mb-4">
                <p className="text-muted">
                    <strong className="text-capitalize">{make} {model} ({year})</strong> için motor tipini seçin
                </p>
            </div>

            <div className="mb-3">
                <div className="input-group">
                    <span className="input-group-text bg-white">
                        <i className="ri-search-line"></i>
                    </span>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Motor ara... (örn: 1.5 TSI, 2.0 TDI)"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button
                            className="btn btn-outline-secondary"
                            onClick={() => setSearchTerm('')}
                        >
                            <i className="ri-close-line"></i>
                        </button>
                    )}
                </div>
            </div>

            {filteredModifications.length > 0 ? (
                <div className="list-group" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {filteredModifications.map((mod) => (
                        <button
                            key={mod.slug}
                            onClick={() => onSelect(mod.slug, mod.name)}
                            className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${selectedModification === mod.slug ? 'active' : ''}`}
                        >
                            <div className="d-flex align-items-center">
                                <i className="ri-settings-3-line me-3"></i>
                                <div className="text-start">
                                    <div className="fw-semibold">{mod.name}</div>
                                    {mod.enginePower && (
                                        <small className="text-muted">{mod.enginePower}</small>
                                    )}
                                </div>
                            </div>
                            {selectedModification === mod.slug && (
                                <i className="ri-check-line"></i>
                            )}
                        </button>
                    ))}
                </div>
            ) : (
                <div className="text-center py-5">
                    <i className="ri-settings-3-line fs-1 text-muted"></i>
                    <p className="text-muted mt-2">Sonuç bulunamadı</p>
                </div>
            )}

            <style jsx>{`
                .list-group-item.active {
                    background-color: #dc3545;
                    border-color: #dc3545;
                }
            `}</style>
        </div>
    );
}