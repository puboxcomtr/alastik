export interface TireSize {
    width: number;       // Lastik tabanı (mm) - örn: 205
    aspectRatio: number; // Yanak oranı (%) - örn: 55
    rimDiameter: number; // Jant çapı (inch) - örn: 16
}

export interface TireMetrics {
    diameter: number;        // Dış çap (mm)
    circumference: number;   // Çevre (mm)
    sidewallHeight: number;  // Yanak yüksekliği (mm)
}

export interface FitmentResult {
    status: 'safe' | 'warning' | 'danger';
    label: string;
    description: string;
    color: string;
    icon: string;
    diameterDiffPercent: number;  // Çap farkı (%)
    speedoDiffKmh: number;         // Hız sapması (km/h, 100 km/h referans)
    diameterDiffMm: number;        // Çap farkı (mm)
}

export interface TireSizeOptions {
    widths: number[];
    aspectRatios: number[];
    rimDiameters: number[];
}