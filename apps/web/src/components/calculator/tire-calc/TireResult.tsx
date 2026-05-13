'use client';

import { Row, Col } from 'react-bootstrap';

import { TireSize, FitmentResult } from '@/src/types/tire-calc/tire-calc';
import { calcTireMetrics, formatTireSize } from '@/src/types/tire-calc/tire-formul';

interface Props {
    originalSize: TireSize;
    targetSize: TireSize;
    result: FitmentResult;
}

export default function TireResult({ originalSize, targetSize, result }: Props) {
    const origMetrics = calcTireMetrics(originalSize);
    const targetMetrics = calcTireMetrics(targetSize);

    const metrics = [
        {
            label: 'Çap Farkı',
            origValue: `${origMetrics.diameter.toFixed(1)} mm`,
            targetValue: `${targetMetrics.diameter.toFixed(1)} mm`,
            diff: `${result.diameterDiffMm > 0 ? '+' : ''}${result.diameterDiffMm.toFixed(1)} mm`,
            diffPercent: `${result.diameterDiffPercent > 0 ? '+' : ''}${result.diameterDiffPercent.toFixed(2)}%`,
            icon: 'ri-ruler-line'
        },
        {
            label: 'Yanak Yüksekliği',
            origValue: `${origMetrics.sidewallHeight.toFixed(1)} mm`,
            targetValue: `${targetMetrics.sidewallHeight.toFixed(1)} mm`,
            diff: `${(targetMetrics.sidewallHeight - origMetrics.sidewallHeight) > 0 ? '+' : ''}${(targetMetrics.sidewallHeight - origMetrics.sidewallHeight).toFixed(1)} mm`,
            diffPercent: null,
            icon: 'ri-arrow-up-down-line'
        },
        {
            label: 'Çevre',
            origValue: `${origMetrics.circumference.toFixed(1)} mm`,
            targetValue: `${targetMetrics.circumference.toFixed(1)} mm`,
            diff: `${(targetMetrics.circumference - origMetrics.circumference) > 0 ? '+' : ''}${(targetMetrics.circumference - origMetrics.circumference).toFixed(1)} mm`,
            diffPercent: null,
            icon: 'ri-loader-line'
        },
        {
            label: 'Hız Sapması (100 km/h)',
            origValue: '100.00 km/h',
            targetValue: `${(100 + result.speedoDiffKmh).toFixed(2)} km/h`,
            diff: `${result.speedoDiffKmh > 0 ? '+' : ''}${result.speedoDiffKmh.toFixed(2)} km/h`,
            diffPercent: null,
            icon: 'ri-speed-up-line'
        }
    ];

    return (
        <div
            className="bg-body rounded border overflow-hidden"
            style={{ borderColor: `${result.color}40` }}
        >
            <div
                className="p-3 d-flex align-items-center gap-2"
                style={{ backgroundColor: `${result.color}15`, borderBottom: `1px solid ${result.color}40` }}
            >
                <i className={result.icon} style={{ fontSize: '1.5rem', color: result.color }}></i>
                <div>
                    <div className="fw-bold" style={{ color: result.color }}>
                        Hesaplama Sonucu: {result.label}
                    </div>
                    <div className="fs-sm text-body-secondary">
                        {formatTireSize(originalSize)} → {formatTireSize(targetSize)}
                    </div>
                </div>
            </div>

            <div className="p-3">
                <Row className="g-3">
                    {metrics.map((m, i) => (
                        <Col key={i} xs={12} sm={6} lg={3}>
                            <div className="border rounded p-3 h-100">
                                <div className="d-flex align-items-center gap-2 mb-2">
                                    <i className={m.icon} style={{ fontSize: '1.25rem', color: '#0d6efd' }}></i>
                                    <span className="fw-semibold fs-sm">{m.label}</span>
                                </div>
                                <div className="fs-xs text-body-secondary">
                                    Mevcut: <span className="fw-medium text-dark">{m.origValue}</span>
                                </div>
                                <div className="fs-xs text-body-secondary">
                                    Yeni: <span className="fw-medium text-dark">{m.targetValue}</span>
                                </div>
                                <div className="mt-2 pt-2 border-top">
                                    <span className="fw-bold" style={{ color: result.color }}>
                                        {m.diff}
                                    </span>
                                    {m.diffPercent && (
                                        <span className="fs-xs text-body-secondary ms-1">
                                            ({m.diffPercent})
                                        </span>
                                    )}
                                </div>
                            </div>
                        </Col>
                    ))}
                </Row>

                <div className="mt-3 p-3 rounded" style={{ backgroundColor: '#f8f9fa' }}>
                    <div className="d-flex align-items-start gap-2">
                        <i className="ri-information-line" style={{ fontSize: '1.25rem', color: '#0d6efd' }}></i>
                        <div className="fs-sm text-body-secondary">
                            <strong>Not:</strong> Hesaplama sonuçları endüstri standardı formüllere göre üretilmiştir.
                            Gerçek uygulama öncesi araç üreticisi önerilerine ve süspansiyon/jant uyumluluğuna mutlaka dikkat ediniz.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}