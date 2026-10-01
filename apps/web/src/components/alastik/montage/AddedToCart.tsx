'use client';

// "Ürün Sepetine Eklendi" — montaj noktası seçimi (referans: ikinciellastik /sepete-eklendi, alastik paleti).
// Solda il/ilçe filtreli anlaşmalı nokta listesi; sağda seçim yoksa tanıtım + SSS, seçim varsa nokta detayı
// (mobilde alttan açılan panel). Altta sabit şerit: "Montaj Almadan, Sepete Git" / "Sepete Git".
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Container } from 'react-bootstrap';
import { useCart } from '@/src/context/CartContext';
import { ROUTES } from '@/src/config/routes';
import {
    AMENITY_LABELS, BRAND_RED, BRAND_RED_DARK, SELECT_CHEVRON, ServiceRow, Stars, TEXT_DARK, TRUST_GREEN,
    formatPrice, hoursSummary, SITE_DOMAIN, type MontagePoint
} from './shared';
import { api } from '@src/lib/api';


// "Montaj Satın Al" (kendi lastiği) modu: ownTireRim verilince bu ekran /montaj-satin-al içinde kullanılır —
// noktalar ve hizmetler seçilen jant çapına göre süzülür, montaj lastiksiz eklenir (ownTire), sepet boş olabilir.
// ownTireRim verilmezse davranış /montaj-noktasi-sec ile birebir aynıdır.
const OWN_TIRE_DEFAULT_QUANTITY = 4;
// Sitenin genelindeki ifade: "Türkiye'nin 81 ilinde montaj hizmeti"
const SERVICE_CITY_COUNT = 81;

// Hizmet adındaki jant çapı aralığı: "13inç - 16inç", "Jant Pres 13 - 14 - 15 - 16", "19inç ve Üzeri", "19inç Rot Ayarı".
// Aralık yoksa hizmet her çapa uygundur.
function rimFits(name: string, rim: number): boolean {
    const nums = (name.match(/\b(1[2-9]|2[0-4])\b/g) || []).map(Number);
    if (!nums.length) return true;
    const min = Math.min(...nums);
    const max = /ve\s*(üzeri|üstü)/i.test(name) || nums.length === 1 ? 99 : Math.max(...nums);
    return rim >= min && rim <= max;
}

// lg altı = mobil: detay paneli alttan açılan sayfada gösterilir
function useMobile() {
    const [m, setM] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 991px)');
        const f = (e: MediaQueryListEvent) => setM(e.matches);
        setM(mq.matches);
        mq.addEventListener('change', f);
        return () => mq.removeEventListener('change', f);
    }, []);
    return m;
}

// Tanıtım + SSS (sağ panel, nokta seçilmeden önce)
function Promo({ pointCount, cityCount, plain = false, ownTire = false }: { pointCount: number; cityCount: number; plain?: boolean; ownTire?: boolean }) {
    const ownTireFaq = [
        {
            q: 'Montaj Hizmeti Almanın Avantajları Nedir?',
            a: [
                'Türkiye genelindeki anlaşmalı montaj noktalarından dilediğini seçebilirsin.',
                'Hizmetleri ve fiyatları aracının jant çapına göre karşılaştırabilirsin.',
                'Montaj ve diğer hizmetlerin ücretini online ödersin — noktada ek ücret yok.',
                `Montaj noktasındaki hizmetin ${SITE_DOMAIN} güvencesi altındadır.`,
            ],
        },
        {
            q: 'Lastiklerimi başka yerden aldım, yine de hizmet alabilir miyim?',
            a: ['Evet. Bu sayfadan kendi lastiğin için montaj, balans, rot ve depolama hizmeti alabilirsin; sepetinde lastik olması gerekmez.'],
        },
        {
            q: 'Nasıl Çalışır?',
            a: [
                '1) Soldan ilini seç, listeden bir anlaşmalı noktanın "Hizmetleri Gör" butonuna bas.',
                '2) İstediğin hizmetleri adet seçerek sepetine ekle ve siparişini tamamla.',
                '3) Montaj noktasının tam adresi ve iletişim bilgisi sipariş onayında sana iletilir; lastiklerinle noktaya gidersin.',
            ],
        },
    ];
    const defaultFaq = [
        {
            q: 'Montaj Hizmeti Almanın Avantajları Nedir?',
            a: [
                'Türkiye genelindeki anlaşmalı montaj noktalarından dilediğini seçebilirsin.',
                'Hizmet seçtiğinde lastiklerin ev ya da iş adresine değil, seçtiğin montaj noktasına kargolanır.',
                'Montaj ve diğer hizmetlerin ücretini siparişinle birlikte online ödersin — noktada ek ücret yok.',
                `Lastiklerin montaj noktasına sorunsuz sevk edilmesi ${SITE_DOMAIN} güvencesi altındadır.`,
            ],
        },
        {
            q: 'Neden Lastik Montaj Hizmeti Almalıyım?',
            a: [
                'Lastik montajı balans ayarıyla birlikte yapılmalıdır; balanssız lastik titreşim, düzensiz aşınma ve güvenlik riski yaratır.',
                'Anlaşmalı noktalar profesyonel ekipmanla, jant ve lastiğe zarar vermeden montaj yapar.',
                'Sibop değişimi, rot ayarı ve lastik oteli gibi ek hizmetleri aynı noktada, tek seferde alabilirsin.',
            ],
        },
        {
            q: 'Nasıl Çalışır?',
            a: [
                '1) Soldan ilini seç, listeden bir anlaşmalı noktanın "Hizmetleri Gör" butonuna bas.',
                '2) İstediğin hizmetleri adet seçerek sepetine ekle.',
                '3) Siparişini tamamla; lastiklerin o noktaya gönderilir, montaj noktasının tam adresi ve iletişim bilgisi sipariş onayında sana iletilir.',
            ],
        },
    ];
    const faq = ownTire ? ownTireFaq : defaultFaq;
    const [open, setOpen] = useState(0);
    return (
        <div className={plain ? '' : 'sk-card sk-card-red'}>
            {/* Tanıtım bloğu (CSS gradyan + pin çizimi, dış görsel yok) */}
            <div className="sk-hero">
                <div className="sk-hero-pin" aria-hidden="true">
                    <svg width="220" height="220" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                    </svg>
                </div>
                <div style={{ position: 'relative' }}>
                    <div className="sk-hero-sub">{cityCount} ilde</div>
                    <div className="sk-hero-big">{pointCount}+</div>
                    <div className="sk-hero-title">anlaşmalı montaj noktası</div>
                    <div className="sk-hero-text">{ownTire
                        ? 'Montaj noktanı seç, hizmetlerini online al — lastiklerinle gel, montajın orada yapılsın.'
                        : 'Lastiğini al, montaj noktanı seç — lastiklerin oraya gelsin, montajın orada yapılsın.'}</div>
                </div>
            </div>
            <div className="sk-faq">
                {faq.map((item, i) => (
                    <div key={i} className="sk-faq-item">
                        <button type="button" className="sk-faq-q" onClick={() => setOpen(open === i ? -1 : i)}>
                            <span>{item.q}</span>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                style={{ flexShrink: 0, transition: 'transform .2s', transform: open === i ? 'rotate(180deg)' : 'none' }}>
                                <path d="m6 9 6 6 6-6" />
                            </svg>
                        </button>
                        {open === i && (
                            <ul className="sk-faq-a">
                                {item.a.map((t, k) => <li key={k}>{t}</li>)}
                            </ul>
                        )}
                    </div>
                ))}
            </div>
            <p className="sk-muted-xs mt-3 mb-0">Bir noktanın hizmetlerini ve fiyatlarını görmek için soldaki listeden &quot;Hizmetleri Gör&quot;e bas.</p>
        </div>
    );
}

// Detay paneli: masaüstünde sağ kolonda kart; mobilde alttan açılan sayfa
function DetailPanel({ mobile, open, onClose, onContinue, continueLabel, title = 'Montaj Noktaları', children }: {
    mobile: boolean; open: boolean; onClose: () => void; onContinue?: () => void; continueLabel?: string; title?: string; children: React.ReactNode;
}) {
    const [visible, setVisible] = useState(false);
    const contentRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!mobile || !open) { setVisible(false); return; }
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const id = requestAnimationFrame(() => setVisible(true));
        return () => { document.body.style.overflow = prev; cancelAnimationFrame(id); };
    }, [mobile, open]);

    if (!mobile) return <div className="sk-card sk-card-green">{children}</div>;
    if (!open) return null;
    return (
        <div className="sk-sheet-wrap">
            <div className="sk-sheet-backdrop" onClick={onClose} style={{ opacity: visible ? 1 : 0 }} />
            <div className="sk-sheet" style={{ transform: visible ? 'translateY(0)' : 'translateY(100%)' }}>
                <div className="sk-sheet-handle" />
                <div className="sk-sheet-head">
                    <div className="sk-sheet-title">{title}</div>
                    <button type="button" onClick={onClose} aria-label="Kapat" className="sk-sheet-close">✕</button>
                </div>
                <div ref={contentRef} className="sk-sheet-body">{children}</div>
                {onContinue && (
                    <div className="sk-sheet-foot">
                        <button type="button" onClick={onContinue} className="sk-btn sk-btn-green sk-btn-block sk-btn-lg">{continueLabel}</button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function AddedToCart({ points, ownTireRim, onPointOpen }: { points: MontagePoint[]; ownTireRim?: number; onPointOpen?: (open: boolean) => void }) {
    const ownTire = Boolean(ownTireRim);
    const rim = ownTireRim || 0;
    const montageForRim = (p: MontagePoint) => p.services.find(s => s.isMontage && s.rimRange && rim >= s.rimRange.min && rim <= s.rimRange.max);
    const router = useRouter();
    const { items, removeItem, refreshCart, loading } = useCart();
    const mobile = useMobile();

    // İller alfabetik; İstanbul varsa en başta ve varsayılan seçili
    const cities = useMemo(() => {
        const list = [...new Set(points.map(p => p.city).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr'));
        const ist = list.indexOf('İstanbul');
        if (ist > 0) { list.splice(ist, 1); list.unshift('İstanbul'); }
        return list;
    }, [points]);

    const [city, setCity] = useState<string>('');
    const [district, setDistrict] = useState('');
    const [openId, setOpenId] = useState<string | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [infoOpen, setInfoOpen] = useState(false);

    // Site logosu ("güvencesiyle" rozeti) panel tema ayarından okunur — header ile aynı kaynak
    const [siteLogo, setSiteLogo] = useState('');
    useEffect(() => {
        api.get('/admin/design/settings/theme').then(data => {
            if (data.success && data.data?.logo) setSiteLogo(api.getImageUrl(data.data.logo));
        }).catch(() => { /* logo yüklenemezse rozet gizli kalır */ });
    }, []);

    useEffect(() => { refreshCart(); }, [refreshCart]);

    const districts = useMemo(
        () => [...new Set(points.filter(p => p.city === city).map(p => p.district).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr')),
        [points, city]
    );
    // İl seçilmeden ilk açılışta tüm illerden ilk 4 nokta listelenir; il seçilince kısıt yok
    const INITIAL_POINT_COUNT = 4;
    const listed = city
        ? points.filter(p => p.city === city && (!district || p.district === district))
        : points.slice(0, INITIAL_POINT_COUNT);
    const openPoint = listed.find(p => p._id === openId) || null;
    const cityCount = SERVICE_CITY_COUNT;

    const serviceItems = items.filter(i => i.itemType === 'montage' || i.itemType === 'service' || Boolean(i.montagePointId));
    // Hizmetler tek noktadan: sepette hizmet varsa o nokta "aktif"tir, diğer noktalarda seçim kilitlenir
    const activePointId = serviceItems.find(i => i.montagePointId)?.montagePointId || '';

    // Seçili hizmetleri sepetten kaldırır (başka noktadan seçince / montaj almadan)
    const clearServices = async () => {
        for (const i of serviceItems) {
            try { await removeItem(String(i.productKey), ''); } catch { /* sessiz */ }
        }
    };
    // İl değişimi seçimi SİLMEZ; silme yalnız başka noktada "Seç"e basınca olur
    const changeCity = (value: string) => {
        setCity(value); setDistrict(''); setOpenId(null);
    };

    const goCart = () => router.push(ROUTES.CART);
    // Montaj almadan: sepetteki montaj/hizmet kalemleri kaldırılır, sepete gidilir (operatör kararı)
    const goCartWithoutMontage = async () => {
        await clearServices();
        router.push(ROUTES.CART);
    };

    // Sepet henüz yüklenirken "boş" denmez; yalnızca yükleme bitince boş ekranı gösterilir.
    if (loading && !ownTire) {
        return (
            <Container className="py-5 text-center">
                <div className="spinner-border" role="status" style={{ color: BRAND_RED }}>
                    <span className="visually-hidden">Yükleniyor…</span>
                </div>
            </Container>
        );
    }

    if (items.length === 0 && !ownTire) {
        return (
            <Container className="py-5 text-center">
                <p className="fw-semibold mb-2" style={{ color: TEXT_DARK, fontSize: 17 }}>
                    Montaj hizmetinden yararlanabilmeniz için sepetinizde lastik ürünü bulunmalıdır.
                </p>
                <p className="text-muted mb-3" style={{ fontSize: 14 }}>
                    Lastiğinizi sepete ekledikten sonra size en yakın anlaşmalı montaj noktasını seçebilir,
                    montaj ve diğer hizmetleri siparişinizle birlikte online satın alabilirsiniz.
                </p>
                <Link href={ROUTES.HOME} className="fw-semibold text-decoration-none" style={{ color: BRAND_RED }}>Lastik modellerini inceleyin →</Link>
            </Container>
        );
    }

    const renderDetail = (p: MontagePoint) => {
        // Başka noktadan seçilmiş hizmet varsa, bu noktadan seçim yapılınca öncekiler otomatik kaldırılır
        const beforeSelect = async () => {
            if (activePointId && String(activePointId) !== String(p._id)) await clearServices();
        };
        return (
            <>
                <div className="sk-detail-title">Anlaşmalı Nokta</div>
                <div className="sk-detail-city">{p.city}{p.district ? ` / ${p.district}` : ''}</div>
                {p.isPublicInfo && p.name && <div className="sk-detail-name">{p.name}</div>}
                <div className="sk-detail-divider" />
                {p.isPublicInfo && p.address && (
                    <>
                        <div className="sk-muted-sm">{p.address}</div>
                        <div className="sk-detail-divider" />
                    </>
                )}
                {p.isPublicInfo && p.phone && (
                    <div className="sk-muted-sm">
                        <i className="ri-phone-line me-1" />
                        <a href={`tel:${p.phone.replace(/\s/g, '')}`} className="text-decoration-none" style={{ color: 'inherit' }}>{p.phone}</a>
                    </div>
                )}
                {p.rating.count > 0 && (
                    <div className="d-flex align-items-center gap-2 mt-2">
                        <Stars value={p.rating.average} />
                        <span className="sk-muted-xs">({p.rating.count}) Yorum</span>
                    </div>
                )}

                {p.amenities.length > 0 && (
                    <div className="sk-amenities">
                        {p.amenities.map(a => AMENITY_LABELS[a] && (
                            <div key={a} className="sk-amenity">
                                <i className={AMENITY_LABELS[a].icon} />
                                <span>{AMENITY_LABELS[a].label}</span>
                            </div>
                        ))}
                    </div>
                )}

                <div className="sk-services">
                    <div className="sk-section-title">Bu Noktadan Alabileceğiniz Hizmetler</div>
                    {p.services.length ? (
                        <div className="sk-services-list">
                            {/* Montaj hizmetleri başta; kalın ayraçtan sonra diğer hizmetler */}
                            {(() => {
                                const montages = p.services.filter(s => s.isMontage && (!ownTire || (s.rimRange && rim >= s.rimRange.min && rim <= s.rimRange.max)));
                                const others = p.services.filter(s => !s.isMontage && (!ownTire || rimFits(s.name, rim)));
                                return (
                                    <>
                                        {montages.map((s, i) => <ServiceRow key={`m-${s.productKey}-${i}`} service={s} montagePointId={p._id} onBeforeSelect={beforeSelect} ownTire={ownTire} defaultQuantity={ownTire ? OWN_TIRE_DEFAULT_QUANTITY : undefined} />)}
                                        {montages.length > 0 && others.length > 0 && <div className="sk-service-divider" />}
                                        {others.map((s, i) => <ServiceRow key={`o-${s.productKey}-${i}`} service={s} montagePointId={p._id} onBeforeSelect={beforeSelect} ownTire={ownTire} />)}
                                    </>
                                );
                            })()}
                        </div>
                    ) : (
                        <p className="sk-muted-sm mt-2 mb-0">Bu nokta için hizmet fiyatı henüz girilmedi.</p>
                    )}
                    <div className="sk-muted-xs mt-2">{ownTire
                        ? 'Seçtiğin hizmetler siparişinle birlikte online ödenir; montaj için lastiklerinle bu noktaya gelirsin.'
                        : 'Seçtiğin hizmetler siparişinle birlikte online ödenir; lastiklerin bu noktaya gönderilir, montaj için buraya gelirsin.'}</div>
                </div>

                {p.reviews.length > 0 && (
                    <div className="mt-4">
                        <div className="sk-section-title">Mağaza Yorumları</div>
                        <div className="d-flex flex-column gap-3 mt-3">
                            {p.reviews.map((r, i) => {
                                const avg = Math.round(((r.processRating + r.locationRating) / 2) * 10) / 10;
                                return (
                                    <div key={i} className="sk-review">
                                        <div className="sk-review-h">Genel Değerlendirme</div>
                                        <div className="d-flex align-items-center gap-2 mt-1">
                                            <Stars value={avg} /><span className="sk-review-h" style={{ fontSize: 14 }}>{avg}/5</span>
                                        </div>
                                        <div className="mt-2" style={{ fontSize: 14 }}><span className="sk-red fw-semibold">Üye :</span> <span className="sk-review-h">{r.memberName === 'sistem' ? 'ALastik Müşterisi' : r.memberName}</span></div>
                                        {r.comment && (
                                            <>
                                                <div className="sk-review-h mt-2">Yorum</div>
                                                <p className="sk-muted-sm mt-1 mb-0">{r.comment}</p>
                                            </>
                                        )}
                                        <div className="mt-2" style={{ fontSize: 12 }}>
                                            <span className="sk-red fw-semibold">Değerlendirme Tarihi:</span>{' '}
                                            <span className="sk-review-h">{new Date(r.createdAt).toLocaleDateString('tr-TR')}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </>
        );
    };

    return (
        <section id="sepete-eklendi" className="sk-page">
            <Container>
                {!ownTire && (
                    <>
                        <h1 className="sk-h1">Montaj Noktanızı Seçin</h1>
                        <p className="sk-lead">Montaj noktanı şimdi seç, montaj ve diğer hizmetleri sepetine ekle.</p>
                    </>
                )}

                <div className="sk-filters">
                    <select className="sk-select" style={SELECT_CHEVRON} value={city} onChange={e => changeCity(e.target.value)}>
                        <option value="">İl Seçiniz (Tümü)</option>
                        {cities.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select className="sk-select" style={SELECT_CHEVRON} value={district} onChange={e => { setDistrict(e.target.value); setOpenId(null); }}>
                        <option value="">İlçe Seçiniz (Tümü)</option>
                        {districts.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>

                {mobile && (
                    <p className="text-center sk-muted-sm mt-4 px-2">
                        Montaj hizmeti almanın avantajları ve hakkında detaylı bilgi almak için{' '}
                        <button type="button" onClick={() => setInfoOpen(true)} className="sk-linkbtn">tıklayınız.</button>
                    </p>
                )}
                {mobile && (
                    <DetailPanel mobile open={infoOpen} onClose={() => setInfoOpen(false)} title="Montaj Hizmeti">
                        <Promo plain pointCount={points.length} cityCount={cityCount} ownTire={ownTire} />
                    </DetailPanel>
                )}

                <div className="sk-grid">
                    {/* SOL: nokta listesi */}
                    <div className="sk-card">
                        <div className="d-flex">
                            <span className="sk-tab">Mağazada Montaj</span>
                        </div>
                        {/* Kurumsal uyarı: hizmet seçiminde lastikler seçilen noktaya gönderilir */}
                        <div className="sk-notice">
                            <i className="ri-error-warning-line" />
                            <span>{ownTire
                                ? `Kendi lastiğinle hizmet alabileceğin, ${rim} inç montaj yapan noktalar listelenir; montaj işleminiz seçtiğiniz noktada gerçekleştirilir.`
                                : 'Bir montaj noktasından hizmet seçtiğinizde lastikleriniz seçtiğiniz noktaya gönderilir; montaj işleminiz o noktada gerçekleştirilir.'}</span>
                        </div>
                        {listed.length === 0 ? (
                            <div className="sk-muted-sm py-5 text-center">Bu ilde anlaşmalı nokta bulunamadı.</div>
                        ) : (
                            <div className="d-flex flex-column gap-3 mt-4">
                                {listed.map(p => {
                                    const isOpen = openPoint?._id === p._id;
                                    const from = ownTire ? (montageForRim(p)?.price ?? null) : p.montageStartingPrice;
                                    return (
                                        <div key={p._id} className={`sk-point${isOpen ? ' is-open' : ''}`}>
                                            <div className="sk-point-row">
                                                <div style={{ minWidth: 0 }}>
                                                    <div className="sk-point-label">Anlaşmalı Nokta</div>
                                                    <div className="sk-point-city">{p.city}{p.district ? ` / ${p.district}` : ''}</div>
                                                    {p.isPublicInfo && p.name && <div className="sk-point-name">{p.name}</div>}
                                                    {p.rating.count > 0 && (
                                                        <div className="d-flex align-items-center gap-2 mt-1">
                                                            <Stars value={p.rating.average} />
                                                            <span className="sk-muted-xs">({p.rating.count}) Yorum</span>
                                                        </div>
                                                    )}
                                                    {/* Çalışma saatleri: kart boş kalmasın diye il/ilçe bloğunun altında özet */}
                                                    {(() => { const h = hoursSummary(p); return (
                                                        <div className="sk-point-hours">
                                                            <div>Haftaiçi: {h.week}</div>
                                                            <div>Cumartesi: {h.sat} / Pazar: {h.sun}</div>
                                                        </div>
                                                    ); })()}
                                                </div>
                                                {/* Sağ kolon: rozet + fiyat + buton tek blok, karta göre dikeyde ortalı */}
                                                <div className="sk-point-right">
                                                    {String(activePointId) === String(p._id) && <div className="sk-selected">✓ Seçildi</div>}
                                                    {siteLogo && (
                                                        <div className="sk-assure">
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                            <img src={siteLogo} alt={SITE_DOMAIN} className="sk-assure-logo" />
                                                            <span>güvencesiyle</span>
                                                        </div>
                                                    )}
                                                    {from !== null && (
                                                        from === 0
                                                            ? <div className="sk-free">Ücretsiz montaj</div>
                                                            : <div className="sk-muted-xs">{formatPrice(from)}&apos;den başlayan fiyatlarla.</div>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => { setOpenId(p._id); setSheetOpen(true); onPointOpen?.(true); }}
                                                        className={`sk-btn sk-btn-wide mt-2 ${isOpen && !mobile ? 'sk-btn-muted' : 'sk-btn-black'}`}
                                                    >
                                                        Hizmetleri Gör
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* SAĞ: seçim yoksa tanıtım + SSS; seçim varsa nokta detayı */}
                    {!openPoint && !mobile && <Promo pointCount={points.length} cityCount={cityCount} ownTire={ownTire} />}
                    {openPoint && (
                        <DetailPanel mobile={mobile} open={sheetOpen} onClose={() => setSheetOpen(false)} onContinue={goCart} continueLabel="Sepete Ekle Ve Git">
                            {renderDetail(openPoint)}
                        </DetailPanel>
                    )}
                </div>
            </Container>

            {/* alt şerit */}
            <div className="sk-bar">
                <Container className="sk-bar-in">
                    {/* Alt şeritte yalnızca lastik montajı hizmeti gösterilir (ad üstte, fiyat altta) */}
                    <div className="sk-bar-services">
                        {serviceItems.filter(i => i.itemType === 'montage').map(i => (
                            <div key={`${i.productKey}-${i.montagePointId || ''}`} className="sk-bar-service">
                                <div className="sk-bar-service-name">{i.productName}{i.quantity > 1 ? ` × ${i.quantity}` : ''}</div>
                                <div className="sk-bar-service-price">{i.unitPrice === 0 ? 'Ücretsiz' : formatPrice(i.unitPrice * i.quantity)}</div>
                            </div>
                        ))}
                    </div>
                    <div className="sk-bar-btns">
                        {!ownTire && <button type="button" onClick={goCartWithoutMontage} className="sk-btn sk-btn-outline">Montaj Almadan, Sepete Git</button>}
                        <button type="button" onClick={goCart} className="sk-btn sk-btn-green sk-btn-x">Sepete Git</button>
                    </div>
                </Container>
            </div>

            <style jsx global>{`
                .sk-page { padding: 24px 0 120px; }
                .sk-h1 { color: ${TEXT_DARK}; font-weight: 800; font-size: 26px; text-align: center; display: flex; align-items: center; justify-content: center; gap: 12px; margin: 0; }
                .sk-lead { color: #475569; text-align: center; margin: 8px 0 0; }
                .sk-filters { display: flex; justify-content: center; gap: 12px; margin: 20px auto 0; max-width: 672px; }
                .sk-select { flex: 1 1 0; min-width: 0; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 40px 10px 16px; font-size: 14px; color: #475569; background-color: #fff; }
                .sk-select-sm { flex: 0 0 auto; width: 110px; padding: 8px 36px 8px 12px; }
                .sk-linkbtn { background: none; border: 0; padding: 0; color: ${BRAND_RED}; font-weight: 600; text-decoration: underline; }
                .sk-grid { display: grid; grid-template-columns: 1fr; gap: 20px; margin-top: 24px; align-items: start; }
                @media (min-width: 992px) { .sk-grid { grid-template-columns: 1fr 1fr; } }
                .sk-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; }
                .sk-card-red { border: 2px solid rgba(242, 34, 59, .5); }
                .sk-card-green { border: 2px solid rgba(22, 163, 74, .5); }
                .sk-tab { font-size: 14px; font-weight: 600; padding: 10px 20px; border-radius: 8px; background: #313131; color: #fff; }
                .sk-notice { display: flex; gap: 8px; align-items: flex-start; background: #fff8e6; border: 1px solid #f0d48a; color: #7a5c00; border-radius: 8px; padding: 10px 12px; font-size: 13px; line-height: 1.5; margin-top: 12px; }
                .sk-notice i { font-size: 16px; line-height: 1.3; }
                .sk-point { position: relative; border: 1px solid #e2e8f0; border-radius: 16px; padding: 12px 16px; transition: border-color .15s, background .15s; }
                .sk-point.is-open { border-color: ${TRUST_GREEN}; background: #f0fdf4; }
                .sk-point-row { display: flex; flex-direction: column; gap: 8px; }
                /* Sağ kolon: içerik sağa yaslı (Seçildi, rozet, fiyat, buton), karta göre dikeyde ortalı */
                .sk-point-right { display: flex; flex-direction: column; align-items: flex-end; }
                @media (min-width: 768px) { .sk-point-row { flex-direction: row; align-items: center; justify-content: space-between; gap: 12px; } .sk-point-right { flex-shrink: 0; max-width: 45%; } }
                .sk-point-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: #94a3b8; }
                .sk-point-city { font-weight: 700; color: ${TEXT_DARK}; margin-top: 2px; }
                .sk-point-name { font-size: 14px; font-weight: 600; color: ${TEXT_DARK}; margin-top: 2px; }
                .sk-point-hours { margin-top: 8px; font-size: 12px; color: #64748b; line-height: 1.5; }
                /* Rozet: logo ile yazı dikeyde tam ortalı (flex + line-height 1) */
                .sk-assure { display: flex; align-items: flex-end; justify-content: center; gap: 6px; margin-bottom: 4px; }
                .sk-assure-logo { display: block; height: 16px; width: auto; }
                .sk-assure span { font-size: 12px; color: #64748b; line-height: 1; }
                .sk-point-right .sk-muted-xs { margin-top: 6px; }
                .sk-free { font-size: 11px; font-weight: 700; color: ${TRUST_GREEN}; }
                .sk-selected { display: inline-block; background: ${TRUST_GREEN}; color: #fff; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 999px; margin-bottom: 6px; }
                .sk-muted-xs { font-size: 12px; color: #64748b; }
                .sk-muted-sm { font-size: 14px; color: #64748b; }
                .sk-warn { color: #d97706 !important; }
                .sk-red { color: ${BRAND_RED}; }
                .sk-btn { border: 0; border-radius: 8px; font-weight: 600; font-size: 14px; padding: 10px 24px; cursor: pointer; transition: background .15s, filter .15s; }
                .sk-btn:disabled { opacity: .55; cursor: not-allowed; }
                .sk-btn-red { background: ${BRAND_RED}; color: #fff; }
                .sk-btn-red:hover:not(:disabled) { background: ${BRAND_RED_DARK}; }
                .sk-btn-black { background: #313131; color: #fff; }
                .sk-btn-black:hover:not(:disabled) { background: #000; }
                .sk-btn-muted { background: #94a3b8; color: #fff; cursor: default; }
                .sk-btn-dark { background: ${TEXT_DARK}; color: #fff; padding: 8px 20px; }
                .sk-btn-dark:hover:not(:disabled) { background: #000; }
                .sk-btn-green { background: ${BRAND_RED}; color: #fff; }
                .sk-btn-green:hover:not(:disabled) { background: ${BRAND_RED_DARK}; }
                .sk-btn-outline { background: #fff; border: 2px solid ${TEXT_DARK}; color: ${TEXT_DARK}; padding: 10px 24px; }
                .sk-btn-outline:hover { background: ${TEXT_DARK}; color: #fff; }
                .sk-btn-x { padding: 12px 32px; }
                .sk-btn-block { width: 100%; }
                .sk-btn-lg { padding: 14px; font-size: 16px; border-radius: 12px; }
                .sk-btn-wide { width: 100%; }
                @media (min-width: 768px) { .sk-btn-wide { width: auto; } }
                .sk-hero { position: relative; overflow: hidden; border-radius: 16px; color: #fff; padding: 32px; background: linear-gradient(135deg, #8f0a1d 0%, ${BRAND_RED} 55%, #ff7a8a 100%); }
                .sk-hero-pin { position: absolute; right: -32px; bottom: -40px; opacity: .15; }
                .sk-hero-sub { font-size: 14px; font-weight: 600; color: rgba(255,255,255,.8); }
                .sk-hero-big { font-size: 48px; font-weight: 800; line-height: 1; margin-top: 4px; }
                .sk-hero-title { font-size: 20px; font-weight: 700; margin-top: 4px; }
                .sk-hero-text { font-size: 14px; color: rgba(255,255,255,.85); margin-top: 12px; max-width: 320px; }
                .sk-faq { margin-top: 20px; }
                .sk-faq-item { padding: 12px 0; border-top: 1px solid #f1f5f9; }
                .sk-faq-item:first-child { border-top: 0; }
                .sk-faq-q { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px; text-align: left; background: none; border: 0; padding: 0; font-weight: 700; color: #313131; }
                .sk-faq-a { margin: 8px 0 0; padding-left: 20px; font-size: 14px; color: #475569; line-height: 1.65; }
                .sk-faq-a li + li { margin-top: 6px; }
                .sk-detail-title { font-size: 20px; font-weight: 800; color: ${BRAND_RED}; text-transform: uppercase; }
                .sk-detail-city { font-weight: 600; color: ${TEXT_DARK}; margin-top: 4px; }
                .sk-detail-name { font-size: 14px; font-weight: 700; color: ${TEXT_DARK}; margin-top: 2px; }
                /* Detay başlık / adres / telefon blokları arası ayraç (üst-alt boşluklu) */
                .sk-detail-divider { border-top: 1px solid #e2e8f0; margin: 12px 0; }
                .sk-amenities { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px; }
                .sk-amenity { width: 80px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 4px; display: flex; flex-direction: column; align-items: center; gap: 6px; }
                .sk-amenity i { font-size: 22px; color: ${TEXT_DARK}; line-height: 1; }
                .sk-amenity span { font-size: 10px; color: #475569; text-align: center; line-height: 1.2; }
                .sk-services { border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; margin-top: 20px; }
                .sk-section-title { font-size: 18px; font-weight: 800; color: #313131; }
                .sk-services-list { margin-top: 4px; max-height: 26rem; overflow-y: auto; padding-right: 4px; }
                .sk-srow { padding: 14px 0; display: flex; flex-wrap: wrap; align-items: center; gap: 12px; border-top: 1px solid #f1f5f9; }
                .sk-srow:first-child { border-top: 0; }
                /* Montaj grubu ile diğer hizmetler arasındaki kalın ayraç */
                .sk-service-divider { border-top: 3px solid ${TEXT_DARK}; margin: 4px 0; }
                .sk-service-divider + .sk-srow { border-top: 0; }
                .sk-srow-name { flex: 1 1 160px; min-width: 160px; font-weight: 700; color: ${TEXT_DARK}; font-size: 14px; }
                .sk-srow-hint { font-weight: 400; font-size: 12px; color: #64748b; }
                .sk-srow-price { font-weight: 800; color: ${TRUST_GREEN}; font-size: 18px; width: 112px; text-align: right; white-space: nowrap; }
                /* Mobil: hizmet adı tam satır; altında fiyat her zaman soldan başlar, ardından adet ve buton */
                @media (max-width: 767px) { .sk-srow { gap: 8px; flex-wrap: wrap; } .sk-srow-name { flex: 1 1 100%; } .sk-srow-price { order: 1; width: auto; text-align: left; margin-right: auto; font-size: 16px; } .sk-srow .sk-select { order: 2; width: 88px; padding: 8px 28px 8px 10px; background-position: right 0.5rem center; } .sk-srow .sk-btn { order: 3; padding: 9px 14px; white-space: nowrap; } }
                .sk-review { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
                .sk-review-h { font-size: 14px; font-weight: 700; color: ${TEXT_DARK}; }
                .sk-bar { position: fixed; bottom: 0; left: 0; right: 0; z-index: 1030; background: #fff; border-top: 1px solid #e2e8f0; box-shadow: 0 -4px 24px rgba(0,0,0,.08); }
                .sk-bar-services { display: flex; flex-wrap: wrap; gap: 8px; align-items: stretch; justify-content: center; }
                .sk-bar-service { padding: 0 14px; text-align: left; }
                .sk-bar-service-name { font-size: 12px; font-weight: 600; color: ${TEXT_DARK}; }
                .sk-bar-service-price { font-size: 14px; font-weight: 800; color: ${TEXT_DARK}; margin-top: 2px; }
                @media (min-width: 576px) { .sk-bar-services { justify-content: flex-start; } }
                .sk-bar-in { display: flex; flex-direction: column; align-items: center; justify-content: space-between; gap: 12px; padding-top: 14px; padding-bottom: 14px; }
                @media (min-width: 576px) { .sk-bar-in { padding-top: 22px; padding-bottom: 22px; } .sk-bar-btns .sk-btn { padding: 15px 34px; font-size: 15px; } }
                .sk-bar-btns { display: flex; flex-direction: column; align-items: center; gap: 12px; width: 100%; }
                .sk-bar-btns .sk-btn { width: 100%; }
                @media (min-width: 576px) { .sk-bar-in { flex-direction: row; } .sk-bar-btns { flex-direction: row; width: auto; } .sk-bar-btns .sk-btn { width: auto; } }
                .sk-sheet-wrap { position: fixed; inset: 0; z-index: 1060; }
                .sk-sheet-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,.5); transition: opacity .25s ease; }
                .sk-sheet { position: absolute; left: 0; right: 0; bottom: 0; top: 56px; background: #fff; border-radius: 24px 24px 0 0; display: flex; flex-direction: column; box-shadow: 0 -10px 40px rgba(0,0,0,.25); transition: transform .25s ease-out; }
                .sk-sheet-handle { margin: 8px auto 0; height: 6px; width: 48px; border-radius: 999px; background: #cbd5e1; flex-shrink: 0; }
                .sk-sheet-head { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; border-bottom: 1px solid #f1f5f9; flex-shrink: 0; }
                .sk-sheet-title { font-size: 20px; font-weight: 700; color: ${TEXT_DARK}; }
                .sk-sheet-close { background: none; border: 0; font-size: 24px; line-height: 1; color: #64748b; padding: 4px; }
                .sk-sheet-body { flex: 1 1 auto; overflow-y: auto; overscroll-behavior: contain; padding: 16px 20px; }
                .sk-sheet-foot { padding: 16px; border-top: 1px solid #e2e8f0; background: #fff; flex-shrink: 0; }
            `}</style>
        </section>
    );
}
