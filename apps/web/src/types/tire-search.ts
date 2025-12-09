// apps/web/src/types/tire-search.ts

export type SearchStep = 'make' | 'model' | 'year' | 'modification' | 'size' | 'rim' | 'details';

export interface TireSize {
    front: string;
    rear: string;
    width: number;
    aspectRatio: number;
    diameter: number;
}

export interface RimSize {
    diameter: number;
    width: number;
    pcd: string;          
    offset: number;        
    centerBore: number;   
    display: string;       
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
    selectedRimSize?: RimSize;
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

export interface RimSearchResult {
    make: string;
    makeName: string;
    model: string;
    modelName: string;
    year: number;
    modification: string;
    modificationName: string;
    rimSize: RimSize;
}