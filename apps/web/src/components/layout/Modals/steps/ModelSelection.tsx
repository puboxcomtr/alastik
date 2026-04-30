'use client';

// ============================================
// React
// ============================================
import { useState, useEffect } from 'react';

// ============================================
// MUI
// ============================================
import { Typography, Divider } from '@mui/material';

// ============================================
// Hooks
// ============================================
import { useWheelSize } from '@/src/hooks/WheelSize/useWheelSize';
import { useTranslations } from '@/src/hooks/Theme/useTranslations';

// ============================================
// Types
// ============================================
import type { WheelSizeModel } from '@/src/types/vehicle';

interface ModelSelectionProps {
    make: string;
    makeName: string;
    selectedModel: string;
    onSelect: (model: string, modelName: string) => void;
}
export default function ModelSelection({ make, makeName, selectedModel, onSelect }: ModelSelectionProps) {
    const { getModels, loading } = useWheelSize();
    const [models, setModels] = useState<WheelSizeModel[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const { t } = useTranslations('general');

    useEffect(() => {
        if (make) loadModels();
    }, [make]);

    const loadModels = async () => {
        const data = await getModels(make);
        setModels(data);
    };

    const filteredModels = models.filter(model =>
        model.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Yükleniyor...</span>
                </div>
                <p className="mt-3 text-muted">Modeller yükleniyor...</p>
            </div>
        );
    }

    return (
        <div className="model-selection">
            <div className="row">
                <div className="d-none d-md-block col-md-2">
                    <Typography variant="h6" sx={{ py: 1.5, color: 'black', }}>
                        {t('garage_car')}
                    </Typography>
                    <Divider />
                    <Typography variant="subtitle2" sx={{ py: 1.5, color: 'text.grey' }}>
                        {makeName}
                    </Typography>
                </div>
                <div className="col-md-10">
                    {/* Arama */}
                    <div className='mb-4' style={{ position: 'relative' }}>
                        <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Aramak istediğiniz model"
                            style={{
                                borderRadius: '5px',
                                border: '1px solid black',
                                padding: '0.75rem',
                                paddingRight: '2.5rem'
                            }}
                            value={searchTerm}
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
                    {/* Model Grid */}
                    {filteredModels.length > 0 ? (
                        <div className="row g-3">
                            {filteredModels.map((model) => (
                                <div key={model.slug} className="col-6 col-md-4 col-lg-3">
                                    <div
                                        className={`card h-100 text-center ${selectedModel === model.slug ? 'border-primary' : ''}`}
                                        onClick={() => onSelect(model.slug, model.name)}
                                        style={{ cursor: 'pointer', borderRadius: '3px', borderColor: '#767676', padding: '15px 0' }}
                                    >
                                        <small className="fw-semibold text-black">{model.name}</small>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-5">
                            <i className="ri-search-line fs-1 text-muted"></i>
                            <p className="text-muted mt-2">Sonuç bulunamadı</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}