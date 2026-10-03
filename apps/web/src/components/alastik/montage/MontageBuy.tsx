'use client';

// "Montaj Satın Al" — lastiğini başka yerden almış müşteri için montaj / balans / rot / depolama satın alma
// (referans: ikinciellastik /montaj-satin-al). 1. adım: araç türü + jant çapı. 2–3. adım: /montaj-noktasi-sec ekranının
// kendisi (AddedToCart) "kendi lastiği" modunda — aynı liste, filtre, detay paneli, mobil alttan açılan panel ve alt şerit.
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Container } from 'react-bootstrap';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import AddedToCart from './AddedToCart';
import { BRAND_ACCENT, BRAND_RED, BRAND_RED_DARK, BRAND_TINT, SELECT_CHEVRON, TEXT_DARK, useMontageSite, type MontagePoint } from './shared';

const VEHICLE_TYPES = [
    { value: 'otomobil', label: 'Otomobil' },
    { value: 'suv', label: 'SUV / 4x4' },
    { value: 'ticari', label: 'Hafif Ticari' }
];
const RIM_SIZES = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
// Sitenin genelindeki ifade: "Türkiye'nin 81 ilinde montaj hizmeti"
const SERVICE_CITY_COUNT = 81;
// Görsel sitenin kendi varlık klasöründen okunur (public/<site>/assets/img/montaj/…)
const HERO_IMAGE = '/img/montaj/montaj-satin-al.webp';

const hasMontageFor = (p: MontagePoint, rim: number) =>
    p.services.some(s => s.isMontage && s.rimRange && rim >= s.rimRange.min && rim <= s.rimRange.max);

function Stepper({ step }: { step: number }) {
    const labels = ['Araç bilgileri', 'Montaj noktası', 'Hizmet seçimi'];
    return (
        <div className="ms-steps">
            {labels.map((label, i) => {
                const n = i + 1;
                const state = n < step ? 'done' : n === step ? 'active' : '';
                return (
                    <div key={label} className={`ms-step ${state}`}>
                        <div className="ms-step-bar" />
                        <div className="ms-step-label">
                            <span className="ms-step-num">{n < step ? '✓' : n}</span>
                            <span>{label}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default function MontageBuy({ points }: { points: MontagePoint[] }) {
    const { assetsBase } = useMontageSite();
    const router = useRouter();
    const params = useSearchParams();

    const vehicle = params.get('tur') || '';
    const rim = Number(params.get('jant')) || 0;
    const [pointOpen, setPointOpen] = useState(false);
    const step = rim ? (pointOpen ? 3 : 2) : 1;

    const [formVehicle, setFormVehicle] = useState(vehicle || 'otomobil');
    const [formRim, setFormRim] = useState(rim ? String(rim) : '');

    useEffect(() => { setPointOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }, [rim]);

    const go = (next: Record<string, string>) => {
        const q = new URLSearchParams();
        Object.entries(next).forEach(([k, v]) => { if (v) q.set(k, v); });
        router.push(`?${q.toString()}`, { scroll: false });
    };

    // Seçilen çapta montaj hizmeti veren noktalar
    const eligible = useMemo(() => (rim ? points.filter(p => hasMontageFor(p, rim)) : points), [points, rim]);
    const allCityCount = SERVICE_CITY_COUNT;
    const vehicleLabel = VEHICLE_TYPES.find(v => v.value === vehicle)?.label || 'Araç';

    return (
        <section id="montaj-satin-al" className="ms-page">
            <Container>
                <h1 className="ms-h1">{step === 1 ? 'Montaj Hizmeti Seçimi' : 'Montaj Satın Al'}</h1>
                <p className="ms-lead">
                    {step === 1
                        ? <><span className="ms-red fw-bold">3 adımda</span> aracını belirt, noktanı bul, hizmetlerini seç.</>
                        : 'Montaj noktanı seç; aracına uygun montaj, balans, rot ve depolama hizmetlerini sepetine ekle.'}
                </p>
                <Stepper step={step} />

                {/* ADIM 1: araç bilgileri */}
                {step === 1 && (
                    <>
                        <div className="ms-intro">
                            <div className="ms-intro-visual">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={`${assetsBase}${HERO_IMAGE}`} alt="Lastik montajı yapan usta" className="ms-intro-img" width={900} height={1000} />
                                <div className="ms-intro-shade" aria-hidden="true" />
                                <div className="ms-intro-visual-text">
                                    <BuildOutlinedIcon className="ms-intro-visual-icon" />
                                    <span>Aracına uygun bakım<br /><strong>birkaç adım uzağında.</strong></span>
                                </div>
                            </div>
                            <div className="ms-intro-body">
                                <div className="ms-eyebrow">Montaj Hizmeti</div>
                                <h2 className="ms-intro-title">Lastiklerin hazırsa,<br />sırada montaj var.</h2>
                                <ul className="ms-checks">
                                    <li>Kendi lastiklerin için montaj ve balans hizmetlerini incele.</li>
                                    <li>Yakınındaki noktaları, çalışma saatlerini ve olanaklarını karşılaştır.</li>
                                    <li>Jant çapına uygun hizmetleri ve fiyatlarını gör.</li>
                                </ul>
                            </div>
                            <form
                                className="ms-intro-form"
                                onSubmit={e => { e.preventDefault(); if (formRim) go({ tur: formVehicle, jant: formRim }); }}
                            >
                                <div className="ms-form-title">Önce aracını tanıyalım</div>
                                <p className="ms-muted-sm">Araç türünü ve lastiğinin jant çapını seçerek devam et.</p>
                                <label className="ms-label" htmlFor="ms-vehicle"><i className="ri-car-line" /> Araç türü</label>
                                <select id="ms-vehicle" className="ms-select" style={SELECT_CHEVRON} value={formVehicle} onChange={e => setFormVehicle(e.target.value)}>
                                    {VEHICLE_TYPES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                                </select>
                                <label className="ms-label" htmlFor="ms-rim"><i className="ri-ruler-line" /> Jant çapı</label>
                                <select id="ms-rim" className="ms-select" style={SELECT_CHEVRON} value={formRim} onChange={e => setFormRim(e.target.value)}>
                                    <option value="">Jant çapını seç</option>
                                    {RIM_SIZES.map(r => <option key={r} value={r}>{r} inç</option>)}
                                </select>
                                <p className="ms-hint">Lastiğinin yanağındaki 205/55 <strong>R16</strong> ifadesinde jant çapı <strong>16 inçtir.</strong></p>
                                <button type="submit" className="ms-btn ms-btn-red ms-btn-block" disabled={!formRim}>
                                    Devam Et <i className="ri-arrow-right-line" />
                                </button>
                            </form>
                        </div>
                        <div className="ms-reach">
                            <h2><i className="ri-map-pin-line ms-red" /> {allCityCount} ilde montaj hizmeti</h2>
                            <p className="ms-muted-sm">Noktanı seç, hizmetleri ve adetlerini belirle, sepetini kontrol et.</p>
                        </div>
                    </>
                )}

                {step >= 2 && (
                    <div className="ms-summary">
                        <span><strong>{vehicleLabel} · {rim} inç</strong></span>
                        <button type="button" className="ms-linkbtn" onClick={() => go({})}>Araç bilgilerini değiştir</button>
                    </div>
                )}
            </Container>

            {/* ADIM 2–3: montaj noktası seçimi — /montaj-noktasi-sec ekranının aynısı, kendi lastiği modunda */}
            {step >= 2 && <AddedToCart key={rim} points={eligible} ownTireRim={rim} onPointOpen={setPointOpen} />}

            <style jsx global>{`
                .ms-page { padding: 24px 0 0; }
                .ms-h1 { color: ${TEXT_DARK}; font-weight: 800; font-size: 28px; text-align: center; margin: 0; }
                .ms-lead { color: #475569; text-align: center; margin: 8px 0 0; }
                .ms-red { color: ${BRAND_RED}; }
                .ms-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; max-width: 960px; margin: 24px auto 28px; }
                .ms-step-bar { height: 5px; border-radius: 999px; background: #e2e8f0; }
                .ms-step.done .ms-step-bar, .ms-step.active .ms-step-bar { background: ${BRAND_ACCENT}; }
                .ms-step-label { display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 12px; font-weight: 700; color: #64748b; font-size: 15px; }
                .ms-step.active .ms-step-label { color: ${TEXT_DARK}; }
                .ms-step.done .ms-step-label { color: ${BRAND_RED}; }
                .ms-step-num { width: 30px; height: 30px; border-radius: 50%; border: 1.5px solid #cbd5e1; display: inline-grid; place-items: center; font-size: 13px; flex-shrink: 0; }
                .ms-step.active .ms-step-num, .ms-step.done .ms-step-num { border-color: ${BRAND_RED}; color: ${BRAND_RED}; background: ${BRAND_TINT}; }
                @media (max-width: 575px) { .ms-step-label { font-size: 12px; gap: 6px; flex-direction: column; } .ms-step-num { width: 26px; height: 26px; } }
                .ms-intro { display: grid; grid-template-columns: 1fr; border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden; background: #fff; }
                @media (min-width: 992px) { .ms-intro { grid-template-columns: 0.9fr 1fr 0.95fr; } }
                .ms-intro-visual { position: relative; min-height: 320px; overflow: hidden; background: #1f1f1f; }
                .ms-intro-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
                .ms-intro-shade { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,.7) 100%); }
                .ms-intro-visual-text { position: absolute; left: 28px; right: 28px; bottom: 26px; display: flex; align-items: flex-end; gap: 12px; color: #fff; font-size: 17px; line-height: 1.5; }
                .ms-intro-visual-icon { color: ${BRAND_RED}; font-size: 30px !important; flex-shrink: 0; }
                .ms-intro-body { padding: 32px; display: flex; flex-direction: column; justify-content: center; }
                .ms-eyebrow { font-size: 12px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: ${BRAND_RED}; }
                .ms-intro-title { font-size: 28px; font-weight: 800; color: ${TEXT_DARK}; line-height: 1.25; margin: 12px 0 18px; }
                .ms-checks { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 14px; }
                .ms-checks li { position: relative; padding-left: 30px; color: #475569; line-height: 1.55; }
                .ms-checks li::before { content: '✓'; position: absolute; left: 0; top: 0; color: ${BRAND_RED}; font-weight: 800; }
                .ms-intro-form { padding: 32px; border-top: 1px solid #f1f5f9; }
                @media (min-width: 992px) { .ms-intro-form { border-top: 0; border-left: 1px solid #f1f5f9; } }
                .ms-form-title { font-size: 22px; font-weight: 800; color: ${TEXT_DARK}; }
                .ms-label { display: flex; align-items: center; gap: 8px; font-weight: 700; color: ${TEXT_DARK}; font-size: 15px; margin: 18px 0 8px; }
                .ms-label i { color: ${BRAND_RED}; font-size: 18px; }
                .ms-select { width: 100%; border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px 40px 12px 16px; font-size: 15px; color: #334155; background-color: #fff; }
                .ms-select:disabled { background-color: #f8fafc; color: #94a3b8; }
                .ms-hint { font-size: 13px; color: #64748b; margin: 12px 0 18px; line-height: 1.6; }
                .ms-reach { text-align: center; margin-top: 36px; }
                .ms-reach h2 { font-size: 26px; font-weight: 800; color: ${TEXT_DARK}; display: flex; gap: 10px; align-items: center; justify-content: center; }
                .ms-summary { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px; max-width: 1040px; margin: 0 auto 14px; color: ${TEXT_DARK}; }
                .ms-linkbtn { background: none; border: 0; padding: 0; color: ${BRAND_RED}; font-weight: 600; text-decoration: underline; font-size: 14px; }
                .ms-muted-xs { font-size: 12px; color: #64748b; }
                .ms-muted-sm { font-size: 14px; color: #64748b; }
                .ms-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: 0; border-radius: 10px; font-weight: 700; font-size: 15px; padding: 12px 26px; cursor: pointer; text-decoration: none; transition: background .15s; }
                .ms-btn:disabled, .ms-btn.disabled { opacity: .5; pointer-events: none; }
                .ms-btn-red { background: ${BRAND_RED}; color: #fff; }
                .ms-btn-red:hover { background: ${BRAND_RED_DARK}; color: #fff; }
                .ms-btn-block { width: 100%; padding: 15px; font-size: 16px; }
                @media (max-width: 575px) { .ms-intro-body, .ms-intro-form { padding: 24px; } .ms-intro-title { font-size: 24px; } }
            `}</style>
        </section>
    );
}
