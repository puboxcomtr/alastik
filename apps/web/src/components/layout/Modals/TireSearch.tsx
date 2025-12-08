'use client';

// ============================================
// React & Next.js
// ============================================
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

// ============================================
// MUI Components
// ============================================
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

// ============================================
// Types
// ============================================
import type { TireSearchState, SearchStep } from '@/src/types/tire-search';

// ============================================
// Services & Hooks
// ============================================
import { buildTagUrl, buildTireSizeTagFallback } from '@/src/config/routes';
import tagService from '@/src/services/tagService';
import { useVehicles } from '@/src/hooks/WheelSize/useVehicles';

// ============================================
// Components
// ============================================
import MakeSelection from './steps/MakeSelection';
import ModelSelection from './steps/ModelSelection';
import GenerationSelection from './steps/GenerationSelection';
import ModificationSelection from './steps/ModificationSelection';
import TireSizeSelection from './steps/TireSizeSelection';
import VehicleDetailsStep from './steps/VehicleDetailsStep';

type ModalMode = 'search' | 'addVehicle';

interface TireSearchModalProps {
    open: boolean;
    onClose: () => void;
    mode?: ModalMode;
    onSearchComplete?: (searchData: any) => void;
    onVehicleSaved?: () => void;
}

export default function TireSearchModal({
    open,
    onClose,
    mode = 'search',
    onSearchComplete,
    onVehicleSaved
}: TireSearchModalProps) {
    const router = useRouter();
    const { addVehicle } = useVehicles();

    const [currentStep, setCurrentStep] = useState<SearchStep>('make');
    const [searchState, setSearchState] = useState<TireSearchState>({
        make: '',
        makeName: '',
        model: '',
        modelName: '',
        year: null
    });
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Mode'a göre adımlar
    const stepOrder: SearchStep[] = mode === 'addVehicle'
        ? ['make', 'model', 'year', 'modification', 'details']
        : ['make', 'model', 'year', 'modification', 'size'];

    const currentStepIndex = stepOrder.indexOf(currentStep);

    const modalTitle = mode === 'addVehicle' ? 'Araç Ekle' : 'Araca Göre Lastik Arama';

    const canGoNext = useMemo(() => {
        switch (currentStep) {
            case 'make': return !!searchState.make;
            case 'model': return !!searchState.model;
            case 'year': return !!searchState.year;
            case 'modification': return !!searchState.modification;
            case 'size': return !!searchState.selectedTireSize;
            case 'details': return true;
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

    const resetModal = () => {
        setCurrentStep('make');
        setSearchState({
            make: '',
            makeName: '',
            model: '',
            modelName: '',
            year: null
        });
        setIsRedirecting(false);
        setIsSaving(false);
    };

    const handleClose = () => {
        resetModal();
        onClose();
    };

    // Lastik Arama - Lastikleri Göster
    const handleShowTires = async () => {
        if (!searchState.selectedTireSize) return;

        setIsRedirecting(true);

        try {
            const { width, aspectRatio, diameter } = searchState.selectedTireSize;
            const tagData = await tagService.getTireSizeTag(width, aspectRatio, diameter);
            const seoUrl = tagData?.seoUrl || buildTireSizeTagFallback(width, aspectRatio, diameter);
            const tagUrl = buildTagUrl(seoUrl);

            const vehicleData = {
                make: searchState.make,
                makeName: searchState.makeName,
                model: searchState.model,
                modelName: searchState.modelName,
                year: searchState.year,
                modification: searchState.modification,
                modificationName: searchState.modificationName,
                vehicleImage: searchState.vehicleImage,
                selectedSize: `${width}-${aspectRatio}-r${diameter}`,
                timestamp: Date.now()
            };
            localStorage.setItem('selectedVehicle', JSON.stringify(vehicleData));

            handleClose();

            if (onSearchComplete) {
                onSearchComplete({
                    ...vehicleData,
                    tireSize: searchState.selectedTireSize,
                    tagUrl
                });
            }

            router.push(tagUrl);
        } catch (error) {
            console.error('[TireSearchModal] Redirect error:', error);
            setIsRedirecting(false);
        }
    };

    // Araç Kaydetme
    const handleSaveVehicle = async (details: { plateNumber: string; mileage?: number; isPrimary: boolean }) => {
        setIsSaving(true);

        try {
            const vehicleData = {
                wheelSizeData: {
                    make: searchState.make,
                    makeName: searchState.makeName,
                    model: searchState.model,
                    modelName: searchState.modelName,
                    year: searchState.year,
                    generation: searchState.generation || '',
                    modification: searchState.modification
                },
                userInputs: {
                    plateNumber: details.plateNumber,
                    mileage: details.mileage,
                    bodyType: searchState.modificationName?.split('-')[0]?.trim() || '',
                    enginePower: searchState.modificationName?.split('-')[1]?.trim() || ''
                },
                image: {
                    url: searchState.vehicleImage || '',
                    source: 'wheelsize'
                },
                isPrimary: details.isPrimary
            };

            const result = await addVehicle(vehicleData);

            if (result.success) {
                handleClose();
                onVehicleSaved?.();
            }
        } catch (error) {
            console.error('[TireSearchModal] Save vehicle error:', error);
        } finally {
            setIsSaving(false);
        }
    };

    // Son adımda footer butonu gösterme
    const showFooter = currentStep !== 'details';

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="lg"
            fullWidth
            PaperProps={{
                sx: { minHeight: '600px' }
            }}
        >
            {/* Header */}
            <DialogTitle sx={{ pb: 1 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">{modalTitle}</Typography>
                    <IconButton onClick={handleClose} size="medium">
                        <i className="ri-close-line"></i>
                    </IconButton>
                </Box>
            </DialogTitle>

            {/* Body */}
            <DialogContent dividers sx={{ minHeight: '400px' }}>
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
                        makeName={searchState.makeName}
                        selectedModel={searchState.model}
                        onSelect={(model, modelName) => {
                            updateSearchState({ model, modelName });
                            goToNextStep();
                        }}
                    />
                )}

                {currentStep === 'year' && (
                    <GenerationSelection
                        make={searchState.make}
                        makeName={searchState.makeName}
                        model={searchState.model}
                        modelName={searchState.modelName}
                        onSelect={(year, generation, vehicleImage) => {
                            updateSearchState({ year, generation, vehicleImage });
                            goToNextStep();
                        }}
                    />
                )}

                {currentStep === 'modification' && (
                    <ModificationSelection
                        make={searchState.make}
                        makeName={searchState.makeName}
                        model={searchState.model}
                        modelName={searchState.modelName}
                        year={searchState.year!}
                        generation={searchState.generation}
                        selectedModification={searchState.modification}
                        vehicleImage={searchState.vehicleImage}
                        onSelect={(modification, modificationName) => {
                            updateSearchState({ modification, modificationName });
                            goToNextStep();
                        }}
                    />
                )}

                {currentStep === 'size' && mode === 'search' && (
                    <TireSizeSelection
                        make={searchState.make}
                        makeName={searchState.makeName}
                        model={searchState.model}
                        modelName={searchState.modelName}
                        year={searchState.year!}
                        modification={searchState.modification!}
                        modificationName={searchState.modificationName || ''}
                        vehicleImage={searchState.vehicleImage}
                        onSelect={(tireSize) => {
                            updateSearchState({ selectedTireSize: tireSize });
                        }}
                    />
                )}

                {currentStep === 'details' && mode === 'addVehicle' && (
                    <VehicleDetailsStep
                        makeName={searchState.makeName}
                        modelName={searchState.modelName}
                        year={searchState.year!}
                        modificationName={searchState.modificationName || ''}
                        vehicleImage={searchState.vehicleImage}
                        onSave={handleSaveVehicle}
                        loading={isSaving}
                    />
                )}
            </DialogContent>

            {/* Footer - details adımında gösterme */}
            {showFooter && (
                <DialogActions sx={{ justifyContent: 'space-between', p: 2 }}>
                    <Button
                        onClick={goToPreviousStep}
                        disabled={!canGoPrevious || isRedirecting}
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
                            disabled={!searchState.selectedTireSize || isRedirecting}
                            variant="contained"
                            color="error"
                            startIcon={isRedirecting ? <CircularProgress size={16} color="inherit" /> : null}
                        >
                            {isRedirecting ? 'Yönlendiriliyor...' : 'Lastikleri Göster'}
                        </Button>
                    )}
                </DialogActions>
            )}
        </Dialog>
    );
}