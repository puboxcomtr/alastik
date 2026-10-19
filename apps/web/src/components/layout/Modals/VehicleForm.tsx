'use client';

import { useState, useEffect } from 'react';
import type { Vehicle } from '@/src/types/vehicle';
import { useVehicles } from '@/src/hooks/WheelSize/useVehicles';
import { useWheelSize } from '@/src/hooks/WheelSize/useWheelSize';

interface VehicleFormModalProps {
    isOpen: boolean;
    vehicle?: Vehicle | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function VehicleFormModal({ isOpen, vehicle, onClose, onSuccess }: VehicleFormModalProps) {
    const { addVehicle, updateVehicle } = useVehicles();
    const { loading: wheelSizeLoading, getMakes, getModels, getYears, getGenerations, getModifications } = useWheelSize();

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    const [makes, setMakes] = useState<any[]>([]);
    const [models, setModels] = useState<any[]>([]);
    const [years, setYears] = useState<any[]>([]);
    const [generations, setGenerations] = useState<any[]>([]);
    const [modifications, setModifications] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        make: '',
        makeName: '',
        model: '',
        modelName: '',
        year: 0,
        generation: '',
        modification: '',
        bodyType: '',
        enginePower: '',
        plateNumber: '',
        mileage: '',
        isPrimary: false
    });

    useEffect(() => {
        if (vehicle) {
            setFormData({
                make: vehicle.wheelSizeData.make,
                makeName: vehicle.wheelSizeData.makeName,
                model: vehicle.wheelSizeData.model,
                modelName: vehicle.wheelSizeData.modelName,
                year: vehicle.wheelSizeData.year,
                generation: vehicle.wheelSizeData.generation || '',
                modification: vehicle.wheelSizeData.modification || '',
                bodyType: vehicle.userInputs.bodyType || '',
                enginePower: vehicle.userInputs.enginePower || '',
                plateNumber: vehicle.userInputs.plateNumber || '',
                mileage: vehicle.userInputs.mileage?.toString() || '',
                isPrimary: vehicle.isPrimary
            });
            setStep(5);
        }
    }, [vehicle]);

    useEffect(() => {
        if (isOpen && !vehicle) {
            loadMakes();
        }
    }, [isOpen]);

    const loadMakes = async () => {
        const data = await getMakes();
        setMakes(data);
    };

    const handleMakeChange = async (makeSlug: string) => {
        const selectedMake = makes.find(m => m.slug === makeSlug);
        setFormData(prev => ({
            ...prev,
            make: makeSlug,
            makeName: selectedMake?.name || '',
            model: '',
            modelName: '',
            year: 0,
            generation: '',
            modification: ''
        }));

        setModels([]);
        setYears([]);
        setGenerations([]);
        setModifications([]);

        if (makeSlug) {
            const data = await getModels(makeSlug);
            setModels(data);
        }
    };

    const handleModelChange = async (modelSlug: string) => {
        const selectedModel = models.find(m => m.slug === modelSlug);
        setFormData(prev => ({
            ...prev,
            model: modelSlug,
            modelName: selectedModel?.name || '',
            year: 0,
            generation: '',
            modification: ''
        }));

        setYears([]);
        setGenerations([]);
        setModifications([]);

        if (modelSlug && formData.make) {
            const data = await getYears(formData.make, modelSlug);
            setYears(data);
        }
    };

    const handleYearChange = async (year: number) => {
        setFormData(prev => ({
            ...prev,
            year,
            generation: '',
            modification: ''
        }));

        setGenerations([]);
        setModifications([]);

        if (year && formData.make && formData.model) {
            const data = await getModifications(formData.make, formData.model, year);
            console.log('🔧 Modifications:', data);
            setModifications(data);
        }
    };

    const handleGenerationChange = async (generationSlug: string) => {
        setFormData(prev => ({
            ...prev,
            generation: generationSlug,
            modification: ''
        }));

        setModifications([]);

        if (formData.make && formData.model && formData.year) {
            const data = await getModifications(
                formData.make,
                formData.model,
                formData.year,
                generationSlug
            );
            setModifications(data);
        }
    };

    const handleModificationChange = (modificationSlug: string) => {
        const selectedMod = modifications.find(m => m.slug === modificationSlug);
        setFormData(prev => ({
            ...prev,
            modification: modificationSlug,
            bodyType: selectedMod?.name?.split('-')[0]?.trim() || '',
            enginePower: selectedMod?.name?.split('-')[1]?.trim() || ''
        }));
    };

    const canGoToNextStep = () => {
        switch (step) {
            case 1: return formData.make !== '';
            case 2: return formData.model !== '';
            case 3: return formData.year !== 0;
            case 4: return formData.modification !== '';
            default: return true;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const submitData = {
                wheelSizeData: {
                    make: formData.make,
                    makeName: formData.makeName,
                    model: formData.model,
                    modelName: formData.modelName,
                    year: formData.year,
                    generation: formData.generation,
                    modification: formData.modification
                },
                userInputs: {
                    bodyType: formData.bodyType,
                    enginePower: formData.enginePower,
                    plateNumber: formData.plateNumber,
                    mileage: formData.mileage ? parseInt(formData.mileage) : undefined
                },
                isPrimary: formData.isPrimary
            };

            let result;
            if (vehicle) {
                result = await updateVehicle(vehicle._id, submitData);
            } else {
                result = await addVehicle(submitData);
            }

            if (result.success) {
                onSuccess();
            }
        } catch (error) {
            console.error('Form submit error:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">
                            {vehicle ? 'Araç Düzenle' : 'Yeni Araç Ekle'}
                        </h5>
                        <button
                            type="button"
                            className="btn-close"
                            onClick={onClose}
                            disabled={loading}
                        ></button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            {!vehicle && (
                                <div className="mb-4">
                                    <div className="d-flex justify-content-between mb-2">
                                        <small className="text-muted">Adım {step} / 5</small>
                                        <small className="text-muted">{Math.round((step / 5) * 100)}%</small>
                                    </div>
                                    <div className="progress" style={{ height: '4px' }}>
                                        <div
                                            className="progress-bar"
                                            style={{ width: `${(step / 5) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )}

                            {step === 1 && (
                                <div>
                                    <label className="form-label">Araç Markası</label>
                                    <select
                                        className="form-select"
                                        value={formData.make}
                                        onChange={(e) => handleMakeChange(e.target.value)}
                                        disabled={wheelSizeLoading}
                                        required
                                    >
                                        <option value="">Marka Seçiniz</option>
                                        {makes.map((make) => (
                                            <option key={make.slug} value={make.slug}>
                                                {make.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {step === 2 && (
                                <div>
                                    <label className="form-label">Model</label>
                                    <select
                                        className="form-select"
                                        value={formData.model}
                                        onChange={(e) => handleModelChange(e.target.value)}
                                        disabled={wheelSizeLoading}
                                        required
                                    >
                                        <option value="">Model Seçiniz</option>
                                        {models.map((model) => (
                                            <option key={model.slug} value={model.slug}>
                                                {model.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {step === 3 && (
                                <div>
                                    <label className="form-label">Yıl</label>
                                    <select
                                        className="form-select"
                                        value={formData.year}
                                        onChange={(e) => handleYearChange(parseInt(e.target.value))}
                                        disabled={wheelSizeLoading}
                                        required
                                    >
                                        <option value="0">Yıl Seçiniz</option>
                                        {years.map((year) => (
                                            <option key={year.slug || year.year} value={year.year || year.slug}>
                                                {year.name || year.year}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {step === 4 && (
                                <div>
                                    <label className="form-label">
                                        Motor Gücü {modifications.length === 0 && '(Yükleniyor...)'}
                                    </label>
                                    {modifications.length > 0 ? (
                                        <select
                                            className="form-select"
                                            value={formData.modification}
                                            onChange={(e) => handleModificationChange(e.target.value)}
                                            disabled={wheelSizeLoading}
                                            required
                                        >
                                            <option value="">Motor Gücü Seçiniz</option>
                                            {modifications.map((mod) => (
                                                <option key={mod.slug} value={mod.slug}>
                                                    {mod.name}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <div className="alert alert-info mb-0">
                                            Bu araç için motor bilgisi bulunmuyor.
                                        </div>
                                    )}
                                </div>
                            )}

                            {step === 5 && (
                                <div>
                                    <div className="mb-3">
                                        <label className="form-label">Plaka (Opsiyonel)</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={formData.plateNumber}
                                            onChange={(e) => setFormData(prev => ({ ...prev, plateNumber: e.target.value }))}
                                            placeholder="34 ABC 123"
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">KM (Opsiyonel)</label>
                                        <input
                                            type="number"
                                            className="form-control"
                                            value={formData.mileage}
                                            onChange={(e) => setFormData(prev => ({ ...prev, mileage: e.target.value }))}
                                            placeholder="50000"
                                        />
                                    </div>

                                    <div className="form-check">
                                        <input
                                            type="checkbox"
                                            className="form-check-input"
                                            id="isPrimary"
                                            checked={formData.isPrimary}
                                            onChange={(e) => setFormData(prev => ({ ...prev, isPrimary: e.target.checked }))}
                                        />
                                        <label className="form-check-label" htmlFor="isPrimary">
                                            Varsayılan aracım olarak ayarla
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            {step > 1 && !vehicle && (
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setStep(step - 1)}
                                    disabled={loading}
                                >
                                    Geri
                                </button>
                            )}

                            {step < 5 && (
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={() => setStep(step + 1)}
                                    disabled={!canGoToNextStep() || wheelSizeLoading}
                                >
                                    {wheelSizeLoading ? 'Yükleniyor...' : 'İleri'}
                                </button>
                            )}

                            {step === 5 && (
                                <button
                                    type="submit"
                                    className="btn btn-success"
                                    disabled={loading}
                                >
                                    {loading ? 'Kaydediliyor...' : vehicle ? 'Güncelle' : 'Kaydet'}
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}