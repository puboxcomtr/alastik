'use client';

import { useState, useMemo, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { TireSearchState, SearchStep } from '@/src/types/tire-search';

// Steps
import MakeSelection from './steps/MakeSelection';
import ModelSelection from './steps/ModelSelection';
import YearSelection from './steps/YearSelection';
import ModificationSelection from './steps/ModificationSelection';
import TireSizeSelection from './steps/TireSizeSelection';

interface TireSearchModalProps {
    open: boolean;
    onClose: () => void;
    onSearchComplete?: (searchData: any) => void;
}

export default function TireSearchModal({ open, onClose, onSearchComplete }: TireSearchModalProps) {
    const [currentStep, setCurrentStep] = useState<SearchStep>('make');
    const [searchState, setSearchState] = useState<TireSearchState>({
        make: '',
        makeName: '',
        model: '',
        modelName: '',
        year: null
    });


    const stepOrder: SearchStep[] = ['make', 'model', 'year', 'modification', 'size'];
    const currentStepIndex = stepOrder.indexOf(currentStep);

    const completedSteps = useMemo(() => {
        const completed: SearchStep[] = [];
        if (searchState.make) completed.push('make');
        if (searchState.model) completed.push('model');
        if (searchState.year) completed.push('year');
        if (searchState.modification) completed.push('modification');
        if (searchState.selectedTireSize) completed.push('size');
        return completed;
    }, [searchState]);

    const progressPercent = Math.round((completedSteps.length / stepOrder.length) * 100);

    const canGoNext = useMemo(() => {
        switch (currentStep) {
            case 'make': return !!searchState.make;
            case 'model': return !!searchState.model;
            case 'year': return !!searchState.year;
            case 'modification': return !!searchState.modification;
            case 'size': return !!searchState.selectedTireSize;
            default: return false;
        }
    }, [currentStep, searchState]);

    const canGoPrevious = currentStepIndex > 0;

    const updateSearchState = (updates: Partial<TireSearchState>) => {
        setSearchState(prev => ({ ...prev, ...updates }));
    };

    const goToNextStep = () => {
        if (canGoNext && currentStepIndex < stepOrder.length - 1) {
            setCurrentStep(stepOrder[currentStepIndex + 1]);
        }
    };

    const goToPreviousStep = () => {
        if (canGoPrevious) {
            setCurrentStep(stepOrder[currentStepIndex - 1]);
        }
    };


    const handleShowTires = () => {
        if (!searchState.selectedTireSize) return;

        console.log('[TIRE SEARCH WIZARD] Lastik arama tamamlandı:', searchState);

        onClose();

        if (onSearchComplete) {
            onSearchComplete({
                marka: searchState.make,
                model: searchState.model,
                yil: searchState.year?.toString(),
                modifikasyon: searchState.modification,
                sonuclar: {
                    lastikler: [searchState.selectedTireSize]
                }
            });
        }
    };

    const stepTitles = {
        make: 'Araç Markası Seçin',
        model: 'Model Seçin',
        year: 'Yıl Seçin',
        modification: 'Motor Seçin',
        size: 'Lastik Ebatı Seçin'
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="lg"
            fullWidth
            PaperProps={{
                sx: { minHeight: '600px' }
            }}
        >
            {/* Header */}
            <DialogTitle sx={{ pb: 1 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">Araca Göre Lastik Arama</Typography>
                    <IconButton onClick={onClose} size="medium">
                        <i className="ri-close-line"></i>
                    </IconButton>
                </Box>
            </DialogTitle>

            {/* Body */}
            <DialogContent dividers sx={{ minHeight: '400px' }}>
                <div className="container">
                    <div className="row">
                        <div className="col-md-8">
                            {currentStep === 'make' && (
                                <MakeSelection
                                    selectedMake={searchState.make}
                                    onSelect={(make, makeName) => {
                                        updateSearchState({ make, makeName });
                                        goToNextStep();
                                    }}
                                />
                            )}

                            {currentStep === 'model' && (
                                <ModelSelection
                                    make={searchState.make}
                                    selectedModel={searchState.model}
                                    onSelect={(model, modelName) => {
                                        updateSearchState({ model, modelName });
                                        goToNextStep();
                                    }}
                                />
                            )}

                            {currentStep === 'year' && (
                                <YearSelection
                                    make={searchState.make}
                                    model={searchState.model}
                                    selectedYear={searchState.year}
                                    onSelect={(year, generation, vehicleImage) => {
                                        updateSearchState({ year, generation, vehicleImage });
                                        goToNextStep();
                                    }}
                                />
                            )}

                            {currentStep === 'modification' && (
                                <ModificationSelection
                                    make={searchState.make}
                                    model={searchState.model}
                                    year={searchState.year!}
                                    selectedModification={searchState.modification}
                                    vehicleImage={searchState.vehicleImage}
                                    onSelect={(modification, modificationName) => {
                                        updateSearchState({ modification, modificationName });
                                        goToNextStep();
                                    }}
                                />
                            )}

                            {currentStep === 'size' && (
                                <TireSizeSelection
                                    make={searchState.make}
                                    model={searchState.model}
                                    year={searchState.year!}
                                    modification={searchState.modification!}
                                    vehicleImage={searchState.vehicleImage}
                                    onSelect={(tireSize) => {
                                        updateSearchState({ selectedTireSize: tireSize });
                                    }}
                                />
                            )}
                        </div>
                    </div>

                </div>
            </DialogContent>

            {/* Footer */}
            <DialogActions sx={{ justifyContent: 'space-between', p: 2 }}>
                <Button
                    onClick={goToPreviousStep}
                    disabled={!canGoPrevious}
                >
                    Geri
                </Button>


                {currentStep !== 'size' ? (
                    <Button
                        onClick={goToNextStep}
                        disabled={!canGoNext}
                    >
                        İleri
                    </Button>
                ) : (
                    <Button
                        onClick={handleShowTires}
                        disabled={!searchState.selectedTireSize}
                    >
                        Lastikleri Göster
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}