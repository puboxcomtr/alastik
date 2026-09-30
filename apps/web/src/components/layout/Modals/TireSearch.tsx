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
import { CONDITION_QUERY_PARAM } from '@/src/config/productCondition';
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
import RimSizeSelection from './steps/RimSizeSelection';
import VehicleDetailsStep from './steps/VehicleDetailsStep';
import ChainSizeSelection from './steps/ChainSizeSelection';

type ModalMode = 'search' | 'addVehicle' | 'rimSearch' | 'chainSearch';

interface TireSearchModalProps {
    open: boolean;
    onClose: () => void;
    mode?: ModalMode;
    onSearchComplete?: (searchData: any) => void;
    onVehicleSaved?: () => void;
    /** Sonuç sayfasında açılacak ürün durumu sekmesi (örn. 'ikinci-el') */
    condition?: string;
}

export default function TireSearchModal({
    open,
    onClose,
    mode = 'search',
    onSearchComplete,
    onVehicleSaved,
    condition
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

    const stepOrder: SearchStep[] = useMemo(() => {
        switch (mode) {
            case 'addVehicle':
                return ['make', 'model', 'year', 'modification', 'details'];
            case 'rimSearch':
                return ['make', 'model', 'year', 'modification', 'rim'];
            case 'chainSearch':
                return ['make', 'model', 'year', 'modification', 'chain'];
            default:
                return ['make', 'model', 'year', 'modification', 'size'];
        }
    }, [mode]);

    const currentStepIndex = stepOrder.indexOf(currentStep);

    // Mode'a göre modal başlığı
    const modalTitle = useMemo(() => {
        switch (mode) {
            case 'addVehicle':
                return 'Araç Ekle';
            case 'rimSearch':
                return 'Araca Göre Jant Arama';
            case 'chainSearch':
                return 'Araca Göre Kar Paleti Arama';
            default:
                return 'Araca Göre Lastik Arama';
        }
    }, [mode]);

    const canGoNext = useMemo(() => {
        switch (currentStep) {
            case 'make': return !!searchState.make;
            case 'model': return !!searchState.model;
            case 'year': return !!searchState.year;
            case 'modification': return !!searchState.modification;
            case 'size': return !!searchState.selectedTireSize;
            case 'rim': return !!searchState.selectedRimSize;
            case 'chain': return !!searchState.selectedChainSize;
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

    const handleShowTires = async () => {
        if (!searchState.selectedTireSize) return;

        setIsRedirecting(true);

        try {
            const { width, aspectRatio, diameter } = searchState.selectedTireSize;
            const tagData = await tagService.getTireSizeTag(width, aspectRatio, diameter);
            const seoUrl = tagData?.seoUrl || buildTireSizeTagFallback(width, aspectRatio, diameter);
            const tagUrl = condition
                ? `${buildTagUrl(seoUrl)}?${new URLSearchParams({ [CONDITION_QUERY_PARAM]: condition }).toString()}`
                : buildTagUrl(seoUrl);

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
    // Jant Arama
    const handleShowRims = async () => {
        if (!searchState.selectedRimSize) return;
        setIsRedirecting(true);
        try {
            const { pcd } = searchState.selectedRimSize;

            if (!pcd) {
                console.error('PCD bilgisi eksik');
                setIsRedirecting(false);
                return;
            }
            const tagData = await tagService.getRimPcdTag(pcd);

            if (!tagData?.seoUrl) {
                console.warn(`Jant etiketi bulunamadı: ${pcd}, kategori sayfasına yönlendiriliyor`);
                const { diameter } = searchState.selectedRimSize;
                const params = new URLSearchParams();
                params.set('jantCap', diameter.toString());
                params.set('bijon', pcd);
                const rimUrl = `/kategori/jant?${params.toString()}`;
                router.push(rimUrl);
                setIsRedirecting(false);
                return;
            }
            const tagUrl = buildTagUrl(tagData.seoUrl);
            const vehicleData = {
                make: searchState.make,
                makeName: searchState.makeName,
                model: searchState.model,
                modelName: searchState.modelName,
                year: searchState.year,
                modification: searchState.modification,
                modificationName: searchState.modificationName,
                vehicleImage: searchState.vehicleImage,
                selectedRim: searchState.selectedRimSize,
                timestamp: Date.now()
            };
            localStorage.setItem('selectedVehicleForRim', JSON.stringify(vehicleData));
            handleClose();
            if (onSearchComplete) {
                onSearchComplete({
                    ...vehicleData,
                    rimSize: searchState.selectedRimSize,
                    rimUrl: tagUrl
                });
            }

            router.push(tagUrl);
        } catch (error) {
            console.error('[TireSearchModal] Rim redirect error:', error);
            setIsRedirecting(false);
        }
    };
    // Kar Paleti
    const handleShowChains = async () => {
        if (!searchState.selectedChainSize) return;
        setIsRedirecting(true);

        try {
            const { width, aspectRatio, diameter } = searchState.selectedChainSize;

            const params = new URLSearchParams();
            params.set('genislik', width.toString());
            params.set('yanak', aspectRatio.toString());
            params.set('jant', diameter.toString());

            // kar-zinciri üst kategoridir (kar paleti + kar çorabı alt kategorileri); eski adres 404 veriyordu
            const chainUrl = `/kategori/kar-zinciri?${params.toString()}`;

            const vehicleData = {
                make: searchState.make,
                makeName: searchState.makeName,
                model: searchState.model,
                modelName: searchState.modelName,
                year: searchState.year,
                modification: searchState.modification,
                modificationName: searchState.modificationName,
                vehicleImage: searchState.vehicleImage,
                selectedChain: searchState.selectedChainSize,
                timestamp: Date.now()
            };

            localStorage.setItem('selectedVehicleForChain', JSON.stringify(vehicleData));

            handleClose();

            if (onSearchComplete) {
                onSearchComplete({
                    ...vehicleData,
                    chainSize: searchState.selectedChainSize,
                    chainUrl
                });
            }

            router.push(chainUrl);
        } catch (error) {
            console.error('[TireSearchModal] Chain redirect error:', error);
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

    // Son adımda footer butonu gösterme (details için)
    const showFooter = currentStep !== 'details';

    // Son adım buton metni ve handler
    const getActionButton = () => {
        if (currentStep === 'size') {
            return {
                label: isRedirecting ? 'Yönlendiriliyor...' : 'Lastikleri Göster',
                onClick: handleShowTires,
                disabled: !searchState.selectedTireSize || isRedirecting
            };
        }
        if (currentStep === 'rim') {
            return {
                label: isRedirecting ? 'Yönlendiriliyor...' : 'Jantları Göster',
                onClick: handleShowRims,
                disabled: !searchState.selectedRimSize || isRedirecting
            };
        }
        if (currentStep === 'chain') {
            return {
                label: isRedirecting ? 'Yönlendiriliyor...' : 'Kar Paletlerini Göster',
                onClick: handleShowChains,
                disabled: !searchState.selectedChainSize || isRedirecting
            };
        }
        return null;
    };

    const actionButton = getActionButton();

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
                            setCurrentStep('model');
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
                            setCurrentStep('year');
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
                            setCurrentStep('modification');
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
                            setCurrentStep(stepOrder[4]);
                        }}
                        onSkipToSize={() => setCurrentStep(stepOrder[4])}
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

                {currentStep === 'rim' && mode === 'rimSearch' && (
                    <RimSizeSelection
                        make={searchState.make}
                        makeName={searchState.makeName}
                        model={searchState.model}
                        modelName={searchState.modelName}
                        year={searchState.year!}
                        modification={searchState.modification!}
                        modificationName={searchState.modificationName || ''}
                        vehicleImage={searchState.vehicleImage}
                        onSelect={(rimSize) => {
                            updateSearchState({ selectedRimSize: rimSize });
                        }}
                    />
                )}

                {currentStep === 'chain' && mode === 'chainSearch' && (
                    <ChainSizeSelection
                        make={searchState.make}
                        makeName={searchState.makeName}
                        model={searchState.model}
                        modelName={searchState.modelName}
                        year={searchState.year!}
                        modification={searchState.modification!}
                        modificationName={searchState.modificationName || ''}
                        vehicleImage={searchState.vehicleImage}
                        onSelect={(chainSize) => {
                            updateSearchState({ selectedChainSize: chainSize });
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

            {/* Footer */}
            {showFooter && (
                <DialogActions sx={{ justifyContent: 'space-between', p: 2 }}>
                    <button
                        type="button"
                        onClick={goToPreviousStep}
                        disabled={!canGoPrevious || isRedirecting}
                        className={`btn rounded-2 ${!canGoPrevious || isRedirecting ? 'btn-secondary' : 'btn-outline-primary'}`}
                    >
                        Geri
                    </button>

                    {actionButton && (
                        <Button
                            onClick={actionButton.onClick}
                            disabled={actionButton.disabled}
                            variant="contained"
                            color="primary"
                        >
                            {actionButton.label}
                        </Button>
                    )}
                </DialogActions>
            )}
        </Dialog>
    );
}