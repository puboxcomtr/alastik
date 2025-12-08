// apps/web/src/types/tire-search.ts

export type SearchStep = 'make' | 'model' | 'year' | 'modification' | 'size';

export interface TireSize {
    front: string;
    rear: string;
    width: number;
    aspectRatio: number;
    diameter: number;
}

export interface TireSearchState {
    make: string;
    makeName: string;
    model: string;
    modelName: string;
    year: number | null;
    generation?: string;
    modification?: string;
    modificationName?: string;
    vehicleImage?: string;
    selectedTireSize?: TireSize;
}

export interface TireSearchResult {
    make: string;
    makeName: string;
    model: string;
    modelName: string;
    year: number;
    modification: string;
    modificationName: string;
    tireSize: TireSize;
}