'use client';

import { useState, useMemo } from 'react';
import { Container, Row, Col } from 'react-bootstrap';

import TireSelector from '@/src/components/calculator/tire-calc/TireSelector';
import TirePreview from '@/src/components/calculator/tire-calc/TirePreview';
import TireResult from '@/src/components/calculator/tire-calc/TireResult';

import { TireSize } from '@/src/types/tire-calc/tire-calc';
import { evaluateFitment } from '@/src/types/tire-calc/tire-formul';

export default function TireCalcView() {
    const [originalSize, setOriginalSize] = useState<TireSize>({
        width: 195,
        aspectRatio: 65,
        rimDiameter: 15
    });

    const [targetSize, setTargetSize] = useState<TireSize>({
        width: 205,
        aspectRatio: 55,
        rimDiameter: 16
    });

    const [showResult, setShowResult] = useState(false);

    const result = useMemo(() => {
        if (!showResult) return null;
        return evaluateFitment(originalSize, targetSize);
    }, [originalSize, targetSize, showResult]);

    const handleCalculate = () => {
        setShowResult(true);
    };

    const handleReset = () => {
        setOriginalSize({ width: 195, aspectRatio: 65, rimDiameter: 15 });
        setTargetSize({ width: 205, aspectRatio: 55, rimDiameter: 16 });
        setShowResult(false);
    };

    return (
        <Container className="py-5">
            <Row className="justify-content-center">
                <Col xs={12} lg={10} xl={9}>
                    <div className="mb-4 text-center">
                        <h1 className="fs-3 fw-bold mb-2">Jant Lastik Hesaplama Modülü</h1>
                        <p className="text-body-secondary mb-0">
                            Lütfen orijinal lastik ebatınızı ve karşılaştırmak istediğiniz lastik ebatını aşağıdan giriniz.
                        </p>
                    </div>

                    <div className="mb-4">
                        <TireSelector
                            originalSize={originalSize}
                            targetSize={targetSize}
                            onOriginalChange={setOriginalSize}
                            onTargetChange={setTargetSize}
                            onCalculate={handleCalculate}
                            onReset={handleReset}
                        />
                    </div>

                    <div className="mb-4">
                        <TirePreview
                            originalSize={originalSize}
                            targetSize={targetSize}
                            result={result}
                        />
                    </div>

                    {result && (
                        <TireResult
                            originalSize={originalSize}
                            targetSize={targetSize}
                            result={result}
                        />
                    )}
                </Col>
            </Row>
        </Container>
    );
}