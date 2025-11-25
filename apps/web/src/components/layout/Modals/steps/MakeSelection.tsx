// apps/web/src/components/layout/Modals/steps/MakeSelection.tsx
'use client';
import { useState, useEffect, useMemo } from 'react';
import { useWheelSize } from '@/src/hooks/WheelSize/useWheelSize';
import type { WheelSizeMake } from '@/src/types/vehicle';

interface MakeSelectionProps {
    selectedMake: string;
    onSelect: (make: string, makeName: string) => void;
}

const POPULAR_MAKES = [
    'audi', 'bmw', 'mercedes-benz', 'volkswagen',
    'ford', 'renault', 'opel', 'peugeot',
    'toyota', 'honda', 'hyundai', 'kia'
];

export default function MakeSelection({ selectedMake, onSelect }: MakeSelectionProps) {
    const { getMakes, loading } = useWheelSize();
    const [allMakes, setAllMakes] = useState<WheelSizeMake[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAll, setShowAll] = useState(false);

    useEffect(() => {
        loadMakes();
    }, []);

    const loadMakes = async () => {
        const makes = await getMakes();
        setAllMakes(makes);
    };

    const popularMakes = useMemo(() => {
        return allMakes.filter(make => POPULAR_MAKES.includes(make.slug));
    }, [allMakes]);

    const searchResults = useMemo(() => {
        if (!searchTerm.trim()) return [];
        const term = searchTerm.toLowerCase();
        return allMakes.filter(make =>
            make.name.toLowerCase().includes(term) ||
            make.slug.toLowerCase().includes(term)
        );
    }, [allMakes, searchTerm]);

    const displayedMakes = useMemo(() => {
        if (searchTerm.trim()) return searchResults;
        if (showAll) return allMakes;
        return popularMakes;
    }, [searchTerm, showAll, searchResults, popularMakes, allMakes]);

    const handleMakeClick = (make: WheelSizeMake) => {
        onSelect(make.slug, make.name);
    };

    if (loading) {
        return (
            <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Yükleniyor...</span>
                </div>
                <p className="mt-3 text-muted">Markalar yükleniyor...</p>
            </div>
        );
    }

    return (
        <div className="make-selection">
            {/* Arama */}
            <div className="mb-4">
                <div style={{ position: 'relative' }}>
                    <input
                        type="text"
                        value={searchTerm}
                        className="form-control form-control-sm"
                        placeholder="Aramak istediğiniz marka"
                        style={{
                            borderRadius: '5px',
                            border: '1px solid black',
                            padding: '0.75rem',
                            paddingRight: '2.5rem'
                        }}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <i
                        className="ri-search-line"
                        style={{
                            position: 'absolute',
                            right: '1rem',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            pointerEvents: 'none',
                            color: '#6c757d'
                        }}
                    ></i>
                </div>
            </div>

            {/* Marka Grid */}
            {displayedMakes.length > 0 ? (
                <>
                    <div className="row g-2">
                        {displayedMakes.map((make) => (
                            <div key={make.slug} className="col-lg-4">
                                <div
                                    className={`card h-100 text-center ${selectedMake === make.slug ? 'border-primary' : ''}`}
                                    onClick={() => handleMakeClick(make)}
                                    style={{ cursor: 'pointer', borderRadius: '3px', borderColor: '#767676', padding: '15px 0' }}
                                >
                                        <small className="fw-semibold text-black">{make.name}</small>
                                </div>
                            </div>
                        ))}
                    </div>

                    {!searchTerm && !showAll && allMakes.length > popularMakes.length && (
                        <div className="text-center mt-3">
                            <button
                                onClick={() => setShowAll(true)}
                                className="btn btn-outline-primary"
                            >
                                Tüm Markaları Göster
                            </button>
                        </div>
                    )}

                    {!searchTerm && showAll && (
                        <div className="text-center mt-3">
                            <button
                                onClick={() => setShowAll(false)}
                                className="btn btn-outline-secondary btn-sm"
                            >
                                Daha Az Göster
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <div className="text-center py-5">
                    <i className="ri-search-line fs-1 text-muted"></i>
                    <p className="text-muted mt-2">Sonuç bulunamadı</p>
                </div>
            )}

            <style jsx>{`
                .make-card {
                    transition: all 0.2s ease;
                    border: 2px solid #dee2e6;
                }
                .make-card:hover {
                    border-color: #dc3545;
                    transform: translateY(-2px);
                }
                .make-card.border-primary {
                    border-color: #dc3545 !important;
                    background-color: #fff5f5;
                }
            `}</style>
        </div>
    );
}