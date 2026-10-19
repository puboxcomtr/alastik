import { TireSize, TireMetrics, FitmentResult } from './tire-calc';

export function calcTireDiameter(size: TireSize): number {
    const sidewall = (size.width * size.aspectRatio) / 100;
    const rimMm = size.rimDiameter * 25.4;
    return rimMm + (2 * sidewall);
}

export function calcCircumference(diameter: number): number {
    return diameter * Math.PI;
}

export function calcSidewallHeight(size: TireSize): number {
    return (size.width * size.aspectRatio) / 100;
}

export function calcTireMetrics(size: TireSize): TireMetrics {
    const diameter = calcTireDiameter(size);
    return {
        diameter,
        circumference: calcCircumference(diameter),
        sidewallHeight: calcSidewallHeight(size)
    };
}

export function calcDiameterDiff(original: number, target: number): number {
    return ((target - original) / original) * 100;
}

export function calcSpeedoDiff(originalCirc: number, targetCirc: number, refSpeed = 100): number {
    return (refSpeed * targetCirc / originalCirc) - refSpeed;
}

export function evaluateFitment(original: TireSize, target: TireSize): FitmentResult {
    const origMetrics = calcTireMetrics(original);
    const targetMetrics = calcTireMetrics(target);

    const diffPercent = calcDiameterDiff(origMetrics.diameter, targetMetrics.diameter);
    const speedoDiff = calcSpeedoDiff(origMetrics.circumference, targetMetrics.circumference);
    const diffMm = targetMetrics.diameter - origMetrics.diameter;
    const abs = Math.abs(diffPercent);

    if (abs <= 2) {
        return {
            status: 'safe',
            label: 'Uygun - Güvenle Kullanılabilir',
            description: 'Bu lastik boyutu değişikliği kabul edilebilir sınırlarda.',
            color: '#16a34a',
            icon: 'ri-checkbox-circle-fill',
            diameterDiffPercent: diffPercent,
            speedoDiffKmh: speedoDiff,
            diameterDiffMm: diffMm
        };
    }

    if (abs <= 3) {
        return {
            status: 'warning',
            label: 'Sınırda - Dikkatli Kullanılmalı',
            description: 'Çap farkı sınır değerlere yakın. Süspansiyon ve hız göstergesi etkilenebilir.',
            color: '#eab308',
            icon: 'ri-alert-fill',
            diameterDiffPercent: diffPercent,
            speedoDiffKmh: speedoDiff,
            diameterDiffMm: diffMm
        };
    }

    return {
        status: 'danger',
        label: 'Uygun Değil - Önerilmez',
        description: 'Çap farkı çok yüksek. Hız göstergesi sapması, süspansiyon ve ABS sistemleri olumsuz etkilenir.',
        color: '#dc2626',
        icon: 'ri-close-circle-fill',
        diameterDiffPercent: diffPercent,
        speedoDiffKmh: speedoDiff,
        diameterDiffMm: diffMm
    };
}

export function formatTireSize(size: TireSize): string {
    return `${size.width}/${size.aspectRatio}R${size.rimDiameter}`;
}