'use client';

// "Montaj Satın Al" — lastiğini başka yerden almış müşteri için montaj / balans / rot / depolama satın alma
// (referans: ikinciellastik /montaj-satin-al, alastik paleti). 3 adım: araç bilgileri → montaj noktası → hizmet seçimi.
// Montaj kalemleri sepete "kendi lastiği" (ownTire) işaretiyle eklenir; sepette lastik şartı aranmaz.
// Ürün sepete eklenince açılan mevcut montaj seçimi (AddedToCart) bu sayfadan bağımsızdır.
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Container } from 'react-bootstrap';
import { useCart } from '@/src/context/CartContext';
import { ROUTES } from '@/src/config/routes';
import {
    AMENITY_LABELS, BRAND_RED, BRAND_RED_DARK, SELECT_CHEVRON, ServiceRow, Stars, TEXT_DARK, TRUST_GREEN,
    formatPrice, hoursSummary, type MontagePoint, type MontageService
} from './shared';

const VEHICLE_TYPES = [
    { value: 'otomobil', label: 'Otomobil' },
    { value: 'suv', label: 'SUV / 4x4' },
    { value: 'ticari', label: 'Hafif Ticari' }
];
const RIM_SIZES = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
const DEFAULT_MONTAGE_QUANTITY = 4;
const INITIAL_POINT_COUNT = 6;

// Hizmet adındaki jant çapı aralığı: "13inç - 16inç", "Jant Pres 13 - 14 - 15 - 16", "19inç ve Üzeri", "19inç Rot Ayarı".
// Aralık yoksa hizmet her çapa uygundur.
function rimFits(name: string, rim: number): boolean {
    const nums = (name.match(/\b(1[2-9]|2[0-4])\b/g) || []).map(Number);
    if (!nums.length) return true;
    const min = Math.min(...nums);
    const max = /ve\s*(üzeri|üstü)/i.test(name) || nums.length === 1 ? 99 : Math.max(...nums);
    return rim >= min && rim <= max;
}

const montageFor = (p: MontagePoint, rim: number): MontageService | undefined =>
    p.services.find(s => s.isMontage && s.rimRange && rim >= s.rimRange.min && rim <= s.rimRange.max);

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

function Promo({ pointCount, cityCount }: { pointCount: number; cityCount: number }) {
    const faq = [
        {
            q: 'Montaj Hizmeti Almanın Avantajları Neler?',
            a: [
                'Bulunduğun il ve ilçedeki montaj noktalarını tek sayfada inceleyebilirsin.',
                'Hizmetleri ve fiyatları aracının jant çapına göre karşılaştırabilirsin.',
                'Çalışma saatlerini ve bekleme salonu gibi olanakları önceden görebilirsin.',
                'Hizmet bedelini online ödersin; montaj noktasında ek ücret ödemezsin.'
            ]
        },
        {
            q: 'Nasıl Çalışır?',
            a: [
                '1) Araç türünü ve lastiğinin jant çapını seç.',
                '2) İlini seç, listeden bir montaj noktasının "Hizmetleri Gör" butonuna bas.',
                '3) Montaj ve ihtiyacın olan diğer hizmetleri adet seçerek sepetine ekle, siparişini tamamla.',
                '4) Montaj noktasının adresi ve iletişim bilgisi sipariş onayında sana iletilir; lastiklerinle noktaya gidersin.'
            ]
        },
        {
            q: 'Lastiklerimi başka yerden aldım, yine de hizmet alabilir miyim?',
            a: ['Evet. Bu sayfa kendi lastiğinle montaj, balans, rot ve depolama hizmeti almak içindir; sepetinde lastik olması gerekmez.']
        }
    ];
    const [open, setOpen] = useState(0);
    return (
        <div className="ms-card">
            <div className="ms-hero">
                <div className="ms-hero-pin" aria-hidden="true">
                    <svg width="220" height="220" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                    </svg>
                </div>
                <div style={{ position: 'relative' }}>
                    <div className="ms-hero-sub">Türkiye genelinde</div>
                    <div className="ms-hero-big">{cityCount} ilde</div>
                    <div className="ms-hero-title">{pointCount}+ montaj noktası</div>
                    <div className="ms-hero-text">Aracına uygun hizmetleri bul, montaj noktanı kolayca seç.</div>
                </div>
            </div>
            <div className="ms-faq">
                {faq.map((item, i) => (
                    <div key={i} className="ms-faq-item">
                        <button type="button" className="ms-faq-q" onClick={() => setOpen(open === i ? -1 : i)}>
                            <span>{item.q}</span>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                style={{ flexShrink: 0, transition: 'transform .2s', transform: open === i ? 'rotate(180deg)' : 'none' }}>
                                <path d="m6 9 6 6 6-6" />
                            </svg>
                        </button>
                        {open === i && <ul className="ms-faq-a">{item.a.map((t, k) => <li key={k}>{t}</li>)}</ul>}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function MontageBuy({ points }: { points: MontagePoint[] }) {
    const router = useRouter();
    const params = useSearchParams();
    const { items, removeItem } = useCart();

    const vehicle = params.get('tur') || '';
    const rim = Number(params.get('jant')) || 0;
    const pointId = params.get('nokta') || '';
    const step = rim && pointId ? 3 : rim ? 2 : 1;

    const [formVehicle, setFormVehicle] = useState(vehicle || 'otomobil');
    const [formRim, setFormRim] = useState(rim ? String(rim) : '');
    const [city, setCity] = useState('');
    const [district, setDistrict] = useState('');
    const [showAll, setShowAll] = useState(false);

    useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [step]);

    const go = (next: Record<string, string>) => {
        const q = new URLSearchParams();
        Object.entries(next).forEach(([k, v]) => { if (v) q.set(k, v); });
        router.push(`?${q.toString()}`, { scroll: false });
    };

    // Seçilen çapta montaj hizmeti olan noktalar
    const eligible = useMemo(() => (rim ? points.filter(p => montageFor(p, rim)) : points), [points, rim]);
    const cities = useMemo(() => {
        const list = [...new Set(eligible.map(p => p.city).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr'));
        const ist = list.indexOf('İstanbul');
        if (ist > 0) { list.splice(ist, 1); list.unshift('İstanbul'); }
        return list;
    }, [eligible]);
    const districts = useMemo(
        () => [...new Set(eligible.filter(p => p.city === city).map(p => p.district).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr')),
        [eligible, city]
    );
    const filtered = city ? eligible.filter(p => p.city === city && (!district || p.district === district)) : eligible;
    const listed = city || showAll ? filtered : filtered.slice(0, INITIAL_POINT_COUNT);
    const point = points.find(p => p._id === pointId) || null;
    const allCityCount = new Set(points.map(p => p.city)).size;

    const serviceItems = items.filter(i => i.itemType === 'montage' || i.itemType === 'service' || Boolean(i.montagePointId));
    const pointItems = point ? serviceItems.filter(i => String(i.montagePointId || '') === String(point._id)) : [];
    const pointTotal = pointItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

    // Hizmetler tek noktadan: başka noktadan seçilmiş hizmetler bu noktada seçim yapılınca kaldırılır
    const beforeSelect = async () => {
        if (!point) return;
        for (const i of serviceItems) {
            if (String(i.montagePointId || '') !== String(point._id)) {
                try { await removeItem(String(i.productKey), ''); } catch { /* sessiz */ }
            }
        }
    };

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
                            <div className="ms-intro-visual" aria-hidden="true">
                                <svg width="140" height="140" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                                </svg>
                                <div className="ms-intro-visual-text"><i className="ri-tools-line" /> Aracına uygun bakım<br /><strong>birkaç adım uzağında.</strong></div>
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

                {/* ADIM 2: montaj noktası */}
                {step === 2 && (
                    <>
                        <div className="ms-summary">
                            <span><strong>{vehicleLabel} · {rim} inç</strong></span>
                            <button type="button" className="ms-linkbtn" onClick={() => go({})}>Araç bilgilerini değiştir</button>
                        </div>
                        <div className="ms-filters">
                            <select className="ms-select" style={SELECT_CHEVRON} value={city} onChange={e => { setCity(e.target.value); setDistrict(''); }}>
                                <option value="">İl seçiniz (Tümü)</option>
                                {cities.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <select className="ms-select" style={SELECT_CHEVRON} value={district} onChange={e => setDistrict(e.target.value)} disabled={!city}>
                                <option value="">İlçe seçiniz (Tümü)</option>
                                {districts.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <div className="ms-grid">
                            <div className="ms-card">
                                <span className="ms-tab">Mağazada Montaj</span>
                                <div className="ms-notice">
                                    <div>Kendi lastiğinle hizmet alabileceğin montaj noktalarını incele.</div>
                                    <div className="ms-notice-ok">✓ Jant çapına uygun hizmetleri seç, online ödemeyle siparişini tamamla.</div>
                                </div>
                                <div className="ms-muted-xs mt-3">{filtered.length} montaj noktası</div>
                                {listed.length === 0 ? (
                                    <div className="ms-muted-sm py-5 text-center">Bu bölgede {rim} inç için montaj hizmeti veren nokta bulunamadı.</div>
                                ) : (
                                    <div className="d-flex flex-column gap-3 mt-2">
                                        {listed.map(p => {
                                            const m = montageFor(p, rim);
                                            const h = hoursSummary(p);
                                            return (
                                                <div key={p._id} className="ms-point">
                                                    <div style={{ minWidth: 0 }}>
                                                        <div className="ms-point-label">Anlaşmalı Nokta</div>
                                                        <div className="ms-point-city">{p.city}{p.district ? ` / ${p.district}` : ''}</div>
                                                        {p.isPublicInfo && p.name && <div className="ms-point-name">{p.name}</div>}
                                                        <div className="d-flex align-items-center gap-2 mt-1">
                                                            <Stars value={p.rating.average} />
                                                            <span className="ms-muted-xs">{p.rating.count > 0 ? `(${p.rating.count}) Yorum` : 'Henüz yorum yok'}</span>
                                                        </div>
                                                        <div className="ms-point-hours">Haftaiçi: {h.week} · Cumartesi: {h.sat}</div>
                                                    </div>
                                                    <div className="ms-point-right">
                                                        {m && m.price !== null && (
                                                            m.price === 0
                                                                ? <div className="ms-free">Ücretsiz montaj</div>
                                                                : <div className="ms-muted-xs">{formatPrice(m.price)}&apos;den başlayan fiyatlarla.</div>
                                                        )}
                                                        <button type="button" className="ms-btn ms-btn-red mt-2" onClick={() => go({ tur: vehicle, jant: String(rim), nokta: p._id })}>
                                                            Hizmetleri Gör
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {!city && !showAll && filtered.length > listed.length && (
                                            <button type="button" className="ms-btn ms-btn-outline" onClick={() => setShowAll(true)}>
                                                Tüm noktaları göster ({filtered.length})
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                            <Promo pointCount={points.length} cityCount={allCityCount} />
                        </div>
                    </>
                )}

                {/* ADIM 3: hizmet seçimi */}
                {step === 3 && point && (
                    <>
                        <div className="ms-summary">
                            <span><strong>{vehicleLabel} · {rim} inç</strong> · {point.city}{point.district ? ` / ${point.district}` : ''}</span>
                            <button type="button" className="ms-linkbtn" onClick={() => go({ tur: vehicle, jant: String(rim) })}>Başka nokta seç</button>
                        </div>
                        <div className="ms-grid">
                            <div className="ms-card ms-card-red">
                                <div className="ms-detail-title">Anlaşmalı Nokta</div>
                                <div className="ms-detail-city">{point.city}{point.district ? ` / ${point.district}` : ''}</div>
                                {point.isPublicInfo && point.name && <div className="ms-point-name">{point.name}</div>}
                                {point.isPublicInfo && point.address && <div className="ms-muted-sm mt-2">{point.address}</div>}
                                {point.isPublicInfo && point.phone && (
                                    <div className="ms-muted-sm mt-1"><i className="ri-phone-line me-1" />
                                        <a href={`tel:${point.phone.replace(/\s/g, '')}`} className="text-decoration-none" style={{ color: 'inherit' }}>{point.phone}</a>
                                    </div>
                                )}
                                {(() => { const h = hoursSummary(point); return (
                                    <div className="ms-point-hours">Haftaiçi: {h.week}<br />Cumartesi: {h.sat} / Pazar: {h.sun}</div>
                                ); })()}
                                {point.amenities.length > 0 && (
                                    <div className="ms-amenities">
                                        {point.amenities.map(a => AMENITY_LABELS[a] && (
                                            <div key={a} className="ms-amenity"><i className={AMENITY_LABELS[a].icon} /><span>{AMENITY_LABELS[a].label}</span></div>
                                        ))}
                                    </div>
                                )}
                                {!point.isPublicInfo && <p className="ms-muted-xs mt-3 mb-0">Montaj noktasının tam adresi ve iletişim bilgisi sipariş onayında sana iletilir.</p>}
                            </div>
                            <div className="ms-card">
                                <div className="ms-section-title">{rim} inç İçin Hizmetler</div>
                                <p className="ms-muted-xs mb-2">Önce lastik montajını seç; balans, rot, sibop ve depolama gibi hizmetleri ardından ekleyebilirsin.</p>
                                {(() => {
                                    const montages = point.services.filter(s => s.isMontage && s.rimRange && rim >= s.rimRange.min && rim <= s.rimRange.max);
                                    const others = point.services.filter(s => !s.isMontage && rimFits(s.name, rim));
                                    if (!montages.length && !others.length) return <p className="ms-muted-sm mt-2 mb-0">Bu nokta için {rim} inç hizmet fiyatı henüz girilmedi.</p>;
                                    return (
                                        <div className="ms-services-list">
                                            {montages.map((s, i) => <ServiceRow key={`m-${s.productKey}-${i}`} service={s} montagePointId={point._id} onBeforeSelect={beforeSelect} ownTire defaultQuantity={DEFAULT_MONTAGE_QUANTITY} />)}
                                            {montages.length > 0 && others.length > 0 && <div className="ms-service-divider" />}
                                            {others.map((s, i) => <ServiceRow key={`o-${s.productKey}-${i}`} service={s} montagePointId={point._id} onBeforeSelect={beforeSelect} ownTire />)}
                                        </div>
                                    );
                                })()}
                                <div className="ms-muted-xs mt-2">Seçtiğin hizmetler siparişinle birlikte online ödenir; montaj için lastiklerinle bu noktaya gelirsin.</div>
                            </div>
                        </div>
                    </>
                )}
                {step === 3 && !point && (
                    <div className="text-center py-5">
                        <p className="ms-muted-sm">Seçtiğin montaj noktası bulunamadı.</p>
                        <button type="button" className="ms-btn ms-btn-red" onClick={() => go({ tur: vehicle, jant: String(rim) })}>Noktaları Gör</button>
                    </div>
                )}
            </Container>

            {/* ADIM 3 alt şerit: bu noktadan seçilenler + sepete git */}
            {step === 3 && point && (
                <div className="ms-bar">
                    <Container className="ms-bar-in">
                        <div className="ms-bar-services">
                            {pointItems.length === 0
                                ? <span className="ms-muted-sm">Henüz hizmet seçmedin.</span>
                                : pointItems.map(i => (
                                    <div key={`${i.productKey}`} className="ms-bar-service">
                                        <div className="ms-bar-service-name">{i.productName}{i.quantity > 1 ? ` × ${i.quantity}` : ''}</div>
                                        <div className="ms-bar-service-price">{i.unitPrice === 0 ? 'Ücretsiz' : formatPrice(i.unitPrice * i.quantity)}</div>
                                    </div>
                                ))}
                        </div>
                        <div className="ms-bar-btns">
                            {pointItems.length > 0 && <div className="ms-bar-total">Toplam: <strong>{formatPrice(pointTotal)}</strong></div>}
                            <Link href={ROUTES.CART} className={`ms-btn ms-btn-red ms-btn-x${pointItems.length ? '' : ' disabled'}`} aria-disabled={!pointItems.length}>
                                Sepete Git
                            </Link>
                        </div>
                    </Container>
                </div>
            )}

            <style jsx global>{`
                .ms-page { padding: 24px 0 140px; }
                .ms-h1 { color: ${TEXT_DARK}; font-weight: 800; font-size: 28px; text-align: center; margin: 0; }
                .ms-lead { color: #475569; text-align: center; margin: 8px 0 0; }
                .ms-red { color: ${BRAND_RED}; }
                .ms-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; max-width: 960px; margin: 24px auto 28px; }
                .ms-step-bar { height: 5px; border-radius: 999px; background: #e2e8f0; }
                .ms-step.done .ms-step-bar, .ms-step.active .ms-step-bar { background: ${BRAND_RED}; }
                .ms-step-label { display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 12px; font-weight: 700; color: #64748b; font-size: 15px; }
                .ms-step.active .ms-step-label { color: ${TEXT_DARK}; }
                .ms-step.done .ms-step-label { color: ${BRAND_RED}; }
                .ms-step-num { width: 30px; height: 30px; border-radius: 50%; border: 1.5px solid #cbd5e1; display: inline-grid; place-items: center; font-size: 13px; flex-shrink: 0; }
                .ms-step.active .ms-step-num, .ms-step.done .ms-step-num { border-color: ${BRAND_RED}; color: ${BRAND_RED}; background: #fff1f2; }
                @media (max-width: 575px) { .ms-step-label { font-size: 12px; gap: 6px; flex-direction: column; } .ms-step-num { width: 26px; height: 26px; } }
                .ms-intro { display: grid; grid-template-columns: 1fr; border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden; background: #fff; }
                @media (min-width: 992px) { .ms-intro { grid-template-columns: 0.9fr 1fr 0.95fr; } }
                .ms-intro-visual { position: relative; min-height: 220px; color: rgba(255,255,255,.25); background: linear-gradient(140deg, #1f1f1f 0%, #3a3a3a 55%, ${BRAND_RED_DARK} 140%); display: flex; align-items: center; justify-content: center; }
                .ms-intro-visual-text { position: absolute; left: 24px; bottom: 22px; color: #fff; font-size: 15px; line-height: 1.5; }
                .ms-intro-visual-text i { color: ${BRAND_RED}; margin-right: 6px; }
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
                .ms-filters { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; max-width: 1040px; margin: 0 auto; }
                .ms-grid { display: grid; grid-template-columns: 1fr; gap: 20px; margin-top: 24px; align-items: start; }
                @media (min-width: 992px) { .ms-grid { grid-template-columns: 1fr 1fr; } }
                .ms-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 18px; padding: 22px; }
                .ms-card-red { border: 2px solid rgba(242, 34, 59, .35); }
                .ms-tab { display: inline-block; font-size: 15px; font-weight: 700; padding: 11px 22px; border-radius: 10px 10px 0 0; background: ${BRAND_RED}; color: #fff; }
                .ms-notice { background: #fff1f2; border: 1px solid #fecdd3; border-radius: 0 12px 12px 12px; padding: 16px 18px; color: #334155; font-size: 15px; line-height: 1.6; }
                .ms-notice-ok { color: ${BRAND_RED}; font-weight: 700; margin-top: 6px; }
                .ms-point { display: flex; flex-direction: column; gap: 10px; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px 18px; }
                @media (min-width: 768px) { .ms-point { flex-direction: row; justify-content: space-between; align-items: center; } }
                .ms-point-right { display: flex; flex-direction: column; align-items: flex-start; }
                @media (min-width: 768px) { .ms-point-right { align-items: flex-end; flex-shrink: 0; } }
                .ms-point-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #94a3b8; }
                .ms-point-city { font-weight: 800; font-size: 18px; color: ${TEXT_DARK}; margin-top: 2px; }
                .ms-point-name { font-size: 14px; font-weight: 600; color: ${TEXT_DARK}; margin-top: 2px; }
                .ms-point-hours { margin-top: 8px; font-size: 12px; color: #64748b; line-height: 1.6; }
                .ms-free { font-size: 12px; font-weight: 700; color: ${TRUST_GREEN}; }
                .ms-muted-xs { font-size: 12px; color: #64748b; }
                .ms-muted-sm { font-size: 14px; color: #64748b; }
                .ms-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: 0; border-radius: 10px; font-weight: 700; font-size: 15px; padding: 12px 26px; cursor: pointer; text-decoration: none; transition: background .15s; }
                .ms-btn:disabled, .ms-btn.disabled { opacity: .5; pointer-events: none; }
                .ms-btn-red { background: ${BRAND_RED}; color: #fff; }
                .ms-btn-red:hover { background: ${BRAND_RED_DARK}; color: #fff; }
                .ms-btn-outline { background: #fff; border: 2px solid ${TEXT_DARK}; color: ${TEXT_DARK}; }
                .ms-btn-block { width: 100%; padding: 15px; font-size: 16px; }
                .ms-btn-x { padding: 14px 34px; }
                .ms-hero { position: relative; overflow: hidden; border-radius: 16px; color: #fff; padding: 32px; background: linear-gradient(135deg, #1f1f1f 0%, #333 60%, #4a1d24 100%); }
                .ms-hero-pin { position: absolute; right: -30px; bottom: -40px; color: ${BRAND_RED}; opacity: .35; }
                .ms-hero-sub { font-size: 15px; font-weight: 700; color: rgba(255,255,255,.85); }
                .ms-hero-big { font-size: 54px; font-weight: 800; line-height: 1.05; color: ${BRAND_RED}; margin-top: 6px; }
                .ms-hero-title { font-size: 24px; font-weight: 800; margin-top: 6px; }
                .ms-hero-text { font-size: 15px; color: rgba(255,255,255,.85); margin-top: 12px; max-width: 320px; }
                .ms-faq { margin-top: 20px; }
                .ms-faq-item { padding: 14px 0; border-top: 1px solid #f1f5f9; }
                .ms-faq-item:first-child { border-top: 0; }
                .ms-faq-q { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px; text-align: left; background: none; border: 0; padding: 0; font-weight: 700; color: ${BRAND_RED}; font-size: 16px; }
                .ms-faq-a { margin: 10px 0 0; padding-left: 20px; font-size: 15px; color: #475569; line-height: 1.7; }
                .ms-detail-title { font-size: 20px; font-weight: 800; color: ${BRAND_RED}; text-transform: uppercase; }
                .ms-detail-city { font-weight: 700; font-size: 18px; color: ${TEXT_DARK}; margin-top: 4px; }
                .ms-amenities { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px; }
                .ms-amenity { width: 84px; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 4px; display: flex; flex-direction: column; align-items: center; gap: 6px; }
                .ms-amenity i { font-size: 22px; color: ${TEXT_DARK}; line-height: 1; }
                .ms-amenity span { font-size: 10px; color: #475569; text-align: center; line-height: 1.2; }
                .ms-section-title { font-size: 18px; font-weight: 800; color: ${TEXT_DARK}; }
                .ms-services-list { margin-top: 4px; }
                .ms-service-divider { border-top: 3px solid ${TEXT_DARK}; margin: 4px 0; }
                .ms-service-divider + .sk-srow { border-top: 0; }
                /* ServiceRow (shared.tsx) sınıfları — mevcut montaj seçim ekranıyla aynı görünüm */
                .sk-srow { padding: 14px 0; display: flex; flex-wrap: wrap; align-items: center; gap: 12px; border-top: 1px solid #f1f5f9; }
                .sk-srow:first-child { border-top: 0; }
                .sk-srow-name { flex: 1 1 160px; min-width: 160px; font-weight: 700; color: ${TEXT_DARK}; font-size: 14px; }
                .sk-srow-price { font-weight: 800; color: ${TRUST_GREEN}; font-size: 18px; width: 112px; text-align: right; white-space: nowrap; }
                .sk-select { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 40px 10px 16px; font-size: 14px; color: #475569; background-color: #fff; }
                .sk-select-sm { flex: 0 0 auto; width: 110px; padding: 8px 36px 8px 12px; }
                .sk-btn { border: 0; border-radius: 8px; font-weight: 600; font-size: 14px; padding: 10px 24px; cursor: pointer; transition: background .15s; }
                .sk-btn:disabled { opacity: .55; cursor: not-allowed; }
                .sk-btn-red { background: ${BRAND_RED}; color: #fff; }
                .sk-btn-red:hover:not(:disabled) { background: ${BRAND_RED_DARK}; }
                .sk-btn-dark { background: ${TEXT_DARK}; color: #fff; padding: 8px 20px; }
                @media (max-width: 767px) { .sk-srow { gap: 8px; } .sk-srow-name { flex: 1 1 100%; } .sk-srow-price { order: 1; width: auto; text-align: left; margin-right: auto; font-size: 16px; } .sk-srow .sk-select { order: 2; width: 88px; padding: 8px 28px 8px 10px; background-position: right 0.5rem center; } .sk-srow .sk-btn { order: 3; padding: 9px 14px; white-space: nowrap; } }
                .ms-bar { position: fixed; bottom: 0; left: 0; right: 0; z-index: 1030; background: #fff; border-top: 1px solid #e2e8f0; box-shadow: 0 -4px 24px rgba(0,0,0,.08); }
                .ms-bar-in { display: flex; flex-direction: column; align-items: center; justify-content: space-between; gap: 12px; padding-top: 14px; padding-bottom: 14px; }
                @media (min-width: 576px) { .ms-bar-in { flex-direction: row; padding-top: 20px; padding-bottom: 20px; } }
                .ms-bar-services { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
                .ms-bar-service { padding: 0 14px; border-left: 1px solid #e2e8f0; }
                .ms-bar-service:first-child { border-left: 0; padding-left: 0; }
                .ms-bar-service-name { font-size: 12px; font-weight: 600; color: ${TEXT_DARK}; }
                .ms-bar-service-price { font-size: 14px; font-weight: 800; color: ${TEXT_DARK}; margin-top: 2px; }
                .ms-bar-btns { display: flex; align-items: center; gap: 18px; }
                .ms-bar-total { font-size: 15px; color: ${TEXT_DARK}; white-space: nowrap; }
                @media (max-width: 575px) { .ms-filters { grid-template-columns: 1fr; } .ms-intro-body, .ms-intro-form { padding: 24px; } .ms-intro-title { font-size: 24px; } .ms-hero-big { font-size: 44px; } }
            `}</style>
        </section>
    );
}
