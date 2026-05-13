'use client';

import { TireSize, FitmentResult } from '@/src/types/tire-calc/tire-calc';
import { calcTireDiameter, formatTireSize } from '@/src/types/tire-calc/tire-formul';

interface Props {
    originalSize: TireSize;
    targetSize: TireSize;
    result: FitmentResult | null;
}

export default function TirePreview({ originalSize, targetSize, result }: Props) {
    const origDiameter = calcTireDiameter(originalSize);
    const targetDiameter = calcTireDiameter(targetSize);

    // SVG için ölçek: en büyük lastik 180px olacak şekilde orantı
    const maxDiameter = Math.max(origDiameter, targetDiameter);
    const scale = 180 / maxDiameter;

    const origRadius = (origDiameter / 2) * scale;
    const targetRadius = (targetDiameter / 2) * scale;

    // Jant yarıçapı (inch × 25.4 / 2 × scale)
    const origRimRadius = (originalSize.rimDiameter * 25.4 / 2) * scale;
    const targetRimRadius = (targetSize.rimDiameter * 25.4 / 2) * scale;

    return (
        <div className="tire-preview bg-body rounded border p-4 h-100">
            <h6 className="text-center fw-bold mb-4" style={{ color: '#000' }}>
                Lastik Boyut Karşılaştırması
            </h6>

            <div className="d-flex justify-content-around align-items-center flex-wrap gap-3">
                {/* Mevcut Lastik */}
                <div className="text-center">
                    <div className="fw-semibold mb-2" style={{ color: '#000' }}>
                        Mevcut Lastik
                    </div>
                    <svg width="200" height="200" viewBox="-100 -100 200 200">
                        {/* Lastik (siyah halka) */}
                        <circle
                            cx="0"
                            cy="0"
                            r={origRadius}
                            fill="#1a1a1a"
                        />
                        {/* Jant (gri iç daire) */}
                        <circle
                            cx="0"
                            cy="0"
                            r={origRimRadius}
                            fill="#a0a0a0"
                        />
                        {/* Jant göbeği */}
                        <circle
                            cx="0"
                            cy="0"
                            r={origRimRadius * 0.25}
                            fill="#6c757d"
                        />
                    </svg>
                    <div className="fw-semibold mt-2">{formatTireSize(originalSize)}</div>
                    <div className="text-body-tertiary fs-sm">Ø {origDiameter.toFixed(0)} mm</div>
                </div>

                {/* Sonuç Kartı (Ortada) */}
                {result && (
                    <div
                        className="text-center p-3 rounded"
                        style={{
                            minWidth: '200px',
                            backgroundColor: `${result.color}15`,
                            border: `1px solid ${result.color}40`
                        }}
                    >
                        <i
                            className={result.icon}
                            style={{ fontSize: '2rem', color: result.color }}
                        ></i>
                        <div className="fw-bold mt-2" style={{ color: result.color }}>
                            {result.label}
                        </div>
                        <div className="fw-semibold mt-2 fs-sm">
                            Çap farkı: {result.diameterDiffPercent > 0 ? '+' : ''}{result.diameterDiffPercent.toFixed(1)}%
                        </div>
                        <div className="text-body-secondary fs-xs mt-2">
                            {result.description}
                        </div>
                    </div>
                )}

                {/* Yeni Lastik */}
                <div className="text-center">
                    <div className="fw-semibold mb-2" style={{ color: '#000' }}>
                        Yeni Lastik
                    </div>
                    <svg width="200" height="200" viewBox="-100 -100 200 200">
                        <circle
                            cx="0"
                            cy="0"
                            r={targetRadius}
                            fill="#1a1a1a"
                        />
                        <circle
                            cx="0"
                            cy="0"
                            r={targetRimRadius}
                            fill="#a0a0a0"
                        />
                        <circle
                            cx="0"
                            cy="0"
                            r={targetRimRadius * 0.25}
                            fill="#6c757d"
                        />
                    </svg>
                    <div className="fw-semibold mt-2">{formatTireSize(targetSize)}</div>
                    <div className="text-body-tertiary fs-sm">Ø {targetDiameter.toFixed(0)} mm</div>
                </div>
            </div>
        </div>
    );
}