export interface TireSize {
    width: number;
    aspectRatio: number;
    rimDiameter: number;
}

export interface TireMetrics {
    diameter: number;
    circumference: number;
    sidewallHeight: number;
}

export interface FitmentResult {
    status: 'safe' | 'warning' | 'danger';
    label: string;
    description: string;
    color: string;
    icon: string;
    diameterDiffPercent: number;
    speedoDiffKmh: number;
    diameterDiffMm: number;
}

export interface TireSizeOptions {
    widths: number[];
    aspectRatios: number[];
    rimDiameters: number[];
}