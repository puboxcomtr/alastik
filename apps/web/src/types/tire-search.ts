// apps/web/src/types/tire-search.ts

export interface TireSearchState {
    // Aşama 1: Marka
    make: string;
    makeName: string;

    // Aşama 2: Model
    model: string;
    modelName: string;

    // Aşama 3: Yıl
    year: number | null;
    generation?: string;

    // Aşama 4: Modifikasyon
    modification?: string;
    modificationName?: string;

    // Aşama 5: Lastik Ebatı
    selectedTireSize?: TireSize;

    // Araç görseli
    vehicleImage?: string;
}

export interface TireSize {
    front: string;
    rear: string;
    width: number;
    aspectRatio: number;
    diameter: number;
}

export interface VehicleCompatibleData {
    tires: Array<{
        width: number;
        aspectRatio: number;
        diameter: number;
        display: string;
        isFront: boolean;
        isRear: boolean;
    }>;
    wheels: Array<{
        diameter: number;
        width: number;
        offset: number;
        boltPattern: string;
        centerBore: number;
        display: string;
    }>;
}

export type SearchStep = 'make' | 'model' | 'year' | 'modification' | 'size';

export interface SearchProgress {
    currentStep: SearchStep;
    completedSteps: SearchStep[];
    canGoNext: boolean;
    canGoPrevious: boolean;
}