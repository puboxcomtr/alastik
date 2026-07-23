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
            <Row className="justify-content-center">
                <Col xs={12} lg={10} xl={9}>
                    <div className="text-center mt-4">
                        <h2 className="fs-4 fw-bold mb-4">
                            <a href="https://alastik.com/jant-lastik-hesaplama" className="text-decoration-none text-reset">Jant Lastik Uyum Tablosu</a>
                        </h2>
                        <p className="text-body-secondary mb-4">
                            Aracınıza doğru lastiği takmak için jant ile lastik ölçüsünün birbiriyle uyumlu olması gerekir. Jant lastik uyum tablosu, hangi jant genişliğine hangi lastik ölçülerinin takılabileceğini gösteren pratik bir referanstır. Örneğin 7J genişliğindeki bir jant için 205, 215 ve 225 kesit genişliğindeki lastikler uygunken, dar veya çok geniş lastikler hem güvenlik hem de performans açısından sorun çıkarır.
                        </p>
                        <p className="text-body-secondary mb-4">
                            Uyum tablosunda temel olarak jant çapı (inç), jant genişliği (J) ve lastik kesit genişliği (mm) karşılaştırılır. Jant çapı ile lastik iç çapı birebir aynı olmalıdır; yani 16 inç jantta yalnızca 16 inç lastik kullanılabilir. Jant genişliği ise belirli bir aralıkta esneklik tanır, ancak üreticinin önerdiği aralığın dışına çıkmak lastiğin yanak yapısını zorlar ve yol tutuşunu bozar.
                            Yanlış jant lastik kombinasyonu, direksiyon hakimiyetinin azalmasına, lastik ömrünün kısalmasına ve yakıt tüketiminin artmasına neden olabilir. Bu nedenle lastik değişimi öncesinde aracınızın ruhsatında veya kapı iç kısmındaki bilgi etiketinde yer alan orijinal ölçüleri kontrol etmeniz önerilir. ALastik uyum tablosu ile jantınıza uygun lastikleri hızlıca görüntüleyebilir ve güvenli seçim yapabilirsiniz.
                        </p>
                        <h2 className="fs-4 fw-bold mb-4">
                            <a href="https://alastik.com/jant-lastik-hesaplama" className="text-decoration-none text-reset">Lastik Ölçüsü Hesaplama</a>
                        </h2>
                        <p className="text-body-secondary mb-4">
                            Lastik ölçüsü hesaplama, lastiğin yanağında yazan değerlerin ne anlama geldiğini anlamakla başlar. Örneğin 205/55 R16 ölçüsünde 205 kesit genişliğini (mm), 55 yanak oranını (yüzde), R radyal yapıyı ve 16 jant çapını (inç) ifade eder. Bu değerlerden yola çıkarak lastiğin toplam çapını, çevresini ve tur başına aldığı yolu hesaplamak mümkündür.
                            Farklı ölçüde lastik kullanmak istediğinizde en kritik nokta, lastiğin toplam dış çapını mümkün olduğunca sabit tutmaktır. Dış çap değiştiğinde hız göstergesi ve kilometre sayacı sapma gösterir; çap büyürse aracınız gösterilenden daha hızlı, küçülürse daha yavaş görünür. Genel kabul gören kural, dış çaptaki değişimin yüzde 3'ü aşmamasıdır.
                            Lastik ölçüsü hesaplarken kesit genişliği ve yanak oranı birlikte değerlendirilir. Örneğin daha geniş bir lastiğe geçerken yanak oranını düşürerek toplam çapı dengede tutabilirsiniz. Bu tür hesaplamaları elle yapmak zaman aldığından, ALastik lastik ölçüsü hesaplama aracı mevcut ölçünüzü girmenizin ardından uyumlu alternatifleri ve çap farklarını otomatik olarak listeler.

                        </p>
                        <h2 className="fs-4 fw-bold mb-4">
                            <a href="https://alastik.com/jant-lastik-hesaplama" className="text-decoration-none text-reset">Lastik Hesaplama Modülü</a>
                        </h2>
                        <p className="text-body-secondary mb-4">
                            Lastik hesaplama modülü, aracınızın mevcut lastik ölçüsünü girdiğinizde uygun alternatifleri, çap farklarını ve hız göstergesi sapmasını anında hesaplayan bir dijital araçtır. Manuel formüllerle uğraşmadan, birkaç saniyede güvenilir sonuçlar elde etmenizi sağlar. Bu sayede farklı ölçü denemelerini kolayca karşılaştırabilir ve aracınıza en uygun seçeneği belirleyebilirsiniz.
                            Modülün temel çalışma mantığı, girilen kesit genişliği, yanak oranı ve jant çapı değerlerinden lastiğin toplam dış çapını hesaplamasına dayanır. Ardından alternatif ölçüleri aynı yöntemle işleyerek aralarındaki milimetre ve yüzde bazındaki farkları gösterir. Yeşil ile işaretlenen sonuçlar güvenli aralıkta olan, sarı veya kırmızı ile işaretlenenler ise dikkat edilmesi gereken kombinasyonlardır.
                        </p>
                        <p className="text-body-secondary">
                            ALastik lastik hesaplama modülü, yalnızca teknik bir hesaplama aracı olmakla kalmaz, aynı zamanda bulduğunuz uygun ölçüdeki lastikleri doğrudan stoktan görüntülemenizi sağlar. Böylece hesaplamadan satın almaya kadar tüm süreci tek bir sayfada tamamlayabilirsiniz. Doğru ölçü seçimi hem sürüş güvenliğinizi artırır hem de lastiklerinizden maksimum verim almanızı sağlar.
                        </p>
                    </div>
                    <div className="mt-5">
                        <h3 className="fs-5 fw-bold mb-3 d-flex align-items-center gap-2">
                            <i className="ti ti-tags"></i>
                            Popüler Etiketler
                        </h3>
                        <div className="d-flex flex-wrap align-items-baseline gap-2 p-3 bg-body-tertiary rounded">
                            <a href="https://alastik.com/etiket/205-55-r16-pirelli-yaz-lastikleri-fiyatlari" className="text-decoration-none" style={{ fontSize: '20px' }}>205 55 R16 Pirelli Lastik Fiyatları
                            </a>
                            <a href="https://alastik.com/etiket/205-55-r16-yaz-lastik-fiyatlari" className="text-decoration-none text-body-secondary" style={{ fontSize: '13px' }}>Yaz lastiği 205 55 R16</a>
                            <a href="https://alastik.com/etiket/195-65-r15-lastik-fiyatlari" className="text-decoration-none text-body" style={{ fontSize: '18px' }}>Yaz Lastiği 195/65R15</a>
                            <a href="https://alastik.com/etiket/195-65-r15-lastik-fiyatlari" className="text-decoration-none text-body-secondary" style={{ fontSize: '16px' }}>195/ 65 R15 Yaz Lastiği</a>
                            <a href="https://alastik.com/etiket/195-65-r15-kis-lastik-fiyatlari" className="text-decoration-none" style={{ fontSize: '24px' }}>195/ 65 R15 Kış Lastiği</a>
                            <a href="https://alastik.com/kategori/4-mevsim-lastikler" className="text-decoration-none text-body" style={{ fontSize: '17px' }}>4 Mevsim Lastik 4 Adet</a>
                            <a href="https://alastik.com/etiket/205-55-r16-4-mevsim-lastik-fiyatlari" className="text-decoration-none text-body-secondary" style={{ fontSize: '13px' }}>4 Mevsim Lastik 205 55 R16</a>
                            <a href="https://alastik.com/jant-lastik-hesaplama" className="text-decoration-none text-body-secondary" style={{ fontSize: '15px' }}>Dış Çap Farkı</a>
                            <a href="https://alastik.com/jant-lastik-hesaplama" className="text-decoration-none" style={{ fontSize: '21px' }}>Lastik Hesaplama Modülü</a>
                            <a href="https://alastik.com/jant-lastik-hesaplama" className="text-decoration-none text-body-secondary" style={{ fontSize: '14px' }}>Yük Endeksi</a>
                            <a href="https://alastik.com/jant-lastik-hesaplama" className="text-decoration-none text-body" style={{ fontSize: '16px' }}>Ebat Uyumu</a>
                        </div>
                    </div>
                </Col>
            </Row>
        </Container>
    );
}