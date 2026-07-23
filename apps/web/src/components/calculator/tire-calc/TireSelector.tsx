'use client';

import { useEffect, useState } from 'react';
import { Form, Button } from 'react-bootstrap';

import { TireSize, TireSizeOptions } from '@/src/types/tire-calc/tire-calc';
import { getTireSizeOptions } from '@/src/services/calculatorService';

interface Props {
    originalSize: TireSize;
    targetSize: TireSize;
    onOriginalChange: (size: TireSize) => void;
    onTargetChange: (size: TireSize) => void;
    onCalculate: () => void;
    onReset: () => void;
}

export default function TireSelector({
    originalSize,
    targetSize,
    onOriginalChange,
    onTargetChange,
    onCalculate,
    onReset
}: Props) {
    const [options, setOptions] = useState<TireSizeOptions>({
        widths: [],
        aspectRatios: [],
        rimDiameters: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadOptions() {
            const data = await getTireSizeOptions();
            if (data) {
                setOptions(data);
            } else {
                setOptions({
                    widths: [115, 125, 135, 145, 155, 165, 170, 175, 185, 195, 205, 215, 225, 235, 245, 255, 265, 275, 285, 295, 305, 315, 325, 335, 345, 355, 365],
                    aspectRatios: [25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85],
                    rimDiameters: [10, 12, 13, 14, 15, 16, 17, 17.5, 18, 19, 20, 21, 22, 23, 24]
                });
            }
            setLoading(false);
        }
        loadOptions();
    }, []);

    const updateOriginal = (field: keyof TireSize, value: number) => {
        onOriginalChange({ ...originalSize, [field]: value });
    };

    const updateTarget = (field: keyof TireSize, value: number) => {
        onTargetChange({ ...targetSize, [field]: value });
    };

    if (loading) {
        return (
            <div className="bg-body rounded border p-5 text-center">
                <span className="text-body-secondary">Yükleniyor...</span>
            </div>
        );
    }

    return (
        <div className="tire-selector bg-body rounded border overflow-hidden">
            <table className="mb-0" style={{ width: '100%', borderCollapse: 'collapse', color: '#fff' }}>
                <thead>
                    <tr>
                        <th style={{ width: '25%', backgroundColor: '#1a1a1a', color: '#fff' }}></th>
                        <th className="fw-bold text-center py-3" style={{ backgroundColor: '#1a1a1a', color: '#fff' }}>
                            Lastik Tabanı
                        </th>
                        <th className="fw-bold text-center py-3" style={{ backgroundColor: '#1a1a1a', color: '#fff' }}>
                            /
                        </th>
                        <th className="fw-bold text-center py-3" style={{ backgroundColor: '#1a1a1a', color: '#fff' }}>
                            Lastik Yanağı
                        </th>
                        <th className="fw-bold text-center py-3" style={{ backgroundColor: '#1a1a1a', color: '#fff' }}>
                            Jant Çapı
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td className="fw-bold text-center align-middle" style={{ color: '#1a1a1a', padding: '12px' }}>
                            Orijinal Lastik
                        </td>
                        <td className="align-middle" style={{ padding: '12px' }}>
                            <Form.Select
                                size="sm"
                                style={{ color: '#000' }}
                                value={originalSize.width}
                                onChange={(e) => updateOriginal('width', Number(e.target.value))}
                            >
                                {options.widths.map(w => (
                                    <option key={w} value={w}>{w}</option>
                                ))}
                            </Form.Select>
                        </td>
                        <td className="text-center fw-bold align-middle" style={{ padding: '12px' }}>/</td>
                        <td className="align-middle" style={{ padding: '12px' }}>
                            <Form.Select
                                size="sm"
                                style={{ color: '#000' }}
                                value={originalSize.aspectRatio}
                                onChange={(e) => updateOriginal('aspectRatio', Number(e.target.value))}
                            >
                                {options.aspectRatios.map(r => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </Form.Select>
                        </td>
                        <td className="align-middle" style={{ padding: '12px' }}>
                            <Form.Select
                                size="sm"
                                style={{ color: '#000' }}
                                value={originalSize.rimDiameter}
                                onChange={(e) => updateOriginal('rimDiameter', Number(e.target.value))}
                            >
                                {options.rimDiameters.map(d => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </Form.Select>
                        </td>
                    </tr>
                    <tr>
                        <td className="fw-bold text-center align-middle" style={{ color: '#1a1a1a', padding: '12px' }}>
                            İstenen Lastik
                        </td>
                        <td className="align-middle" style={{ padding: '12px' }}>
                            <Form.Select
                                size="sm"
                                style={{ color: '#000' }}
                                value={targetSize.width}
                                onChange={(e) => updateTarget('width', Number(e.target.value))}
                            >
                                {options.widths.map(w => (
                                    <option key={w} value={w}>{w}</option>
                                ))}
                            </Form.Select>
                        </td>
                        <td className="text-center fw-bold align-middle" style={{ padding: '12px' }}>/</td>
                        <td className="align-middle" style={{ padding: '12px' }}>
                            <Form.Select
                                size="sm"
                                style={{ color: '#000' }}
                                value={targetSize.aspectRatio}
                                onChange={(e) => updateTarget('aspectRatio', Number(e.target.value))}
                            >
                                {options.aspectRatios.map(r => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </Form.Select>
                        </td>
                        <td className="align-middle" style={{ padding: '12px' }}>
                            <Form.Select
                                size="sm"
                                style={{ color: '#000' }}
                                value={targetSize.rimDiameter}
                                onChange={(e) => updateTarget('rimDiameter', Number(e.target.value))}
                            >
                                {options.rimDiameters.map(d => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </Form.Select>
                        </td>
                    </tr>
                </tbody>
            </table>

            <div className="d-flex justify-content-center gap-2 p-3 border-top">
                <Button
                    className="border-0 px-4 site-bg-primary"
                    onClick={onCalculate}
                >
                    <i className="ri-calculator-line me-1"></i> Hesapla
                </Button>
                <Button variant="outline-dark" className="px-4" onClick={onReset}>
                    <i className="ri-refresh-line me-1"></i> Sıfırla
                </Button>
            </div>
        </div>
    );
}