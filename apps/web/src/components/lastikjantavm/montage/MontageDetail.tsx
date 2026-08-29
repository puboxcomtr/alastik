'use client';

// Anlaşmalı nokta detayı: kimlik bilgisi varsayılan olarak GÖSTERİLMEZ (ad/adres/telefon/harita yok) —
// hizmet satın alınmadan yalnız bölge, olanaklar, saatler, hizmetler ve yorumlar görünür.
// Panelde "Bilgileri Gözüksün" açık noktalarda (isPublicInfo) ad, adres ve telefon gösterilir.
import React from 'react';
import Link from 'next/link';
import { Col, Container, Row } from 'react-bootstrap';
import { AMENITY_LABELS, DAYS, todayStatus, Stars, ServiceList, type MontagePoint } from './montageShared';

const YELLOW = '#e4cc15';
const DARK = '#313131';

export default function MontageDetail({ point }: { point: MontagePoint }) {
    const status = todayStatus(point);
    const todayIndex = (new Date().getDay() + 6) % 7; // Pazartesi=0

    return (
        <section id="montage__detail" className="py-4">
            <Container>
                <nav className="small mb-3">
                    <Link href="/montaj-noktalari" className="text-decoration-none text-muted">
                        <i className="ri-arrow-left-line me-1" />Montaj Noktaları
                    </Link>
                </nav>

                <Row className="g-4">
                    {/* Sol: kimliksiz özet + olanaklar + saatler */}
                    <Col lg={5}>
                        <div className="card border-0 shadow-sm rounded-3 p-4 mb-4">
                            <div className="d-flex justify-content-between align-items-start">
                                <div>
                                    <h1 className="fs-4 fw-bold mb-1" style={{ color: '#e58a00' }}>
                                        {point.isPublicInfo ? point.name : 'ANLAŞMALI NOKTA'}
                                    </h1>
                                    <div className="fw-semibold text-black mb-2">
                                        {point.city}{point.district ? ` / ${point.district}` : ''}
                                    </div>
                                    {point.isPublicInfo && point.address && (
                                        <div className="small text-black mb-1">{point.address}</div>
                                    )}
                                    {point.isPublicInfo && point.phone && (
                                        <div className="small text-black mb-2">
                                            <a href={`tel:${point.phone.replace(/\s/g, '')}`} className="text-black text-decoration-none">{point.phone}</a>
                                        </div>
                                    )}
                                    <a href="#yorumlar" className="text-decoration-underline text-black small fw-semibold">
                                        Mağaza Yorumları Gör ({point.rating.count})
                                    </a>
                                    <div className="d-flex align-items-center gap-2 mt-1">
                                        {point.rating.count > 0
                                            ? <><Stars value={point.rating.average} /><small className="text-muted">{`${point.rating.average} / 5`}</small></>
                                            : <small className="text-muted">(Henüz Yorum Yapılmadı)</small>}
                                    </div>
                                </div>
                                <i className="ri-tools-fill" style={{ fontSize: 44, color: DARK }} />
                            </div>
                            <p className="text-muted small mt-3 mb-0">
                                Nokta bilgileri (ad, adres, telefon) hizmet satın alımınız tamamlandığında sipariş
                                detayınızda paylaşılır.
                            </p>
                        </div>

                        {point.amenities.length > 0 && (
                            <div className="d-flex flex-wrap gap-2 mb-4">
                                {point.amenities.map(a => AMENITY_LABELS[a] && (
                                    <div
                                        key={a}
                                        className="border rounded-2 bg-white text-center p-2"
                                        style={{ width: 86 }}
                                    >
                                        <i className={AMENITY_LABELS[a].icon} style={{ fontSize: 22, color: DARK }} />
                                        <div className="small" style={{ fontSize: 11 }}>{AMENITY_LABELS[a].label}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="card border-0 shadow-sm rounded-3 mb-4">
                            <div className="card-header bg-white fw-bold d-flex justify-content-between">
                                <span>Çalışma Saatleri</span>
                                <span className={status.isOpen ? 'text-success small fw-semibold' : 'text-danger small'}>{status.label}</span>
                            </div>
                            <div className="card-body p-0">
                                <table className="table table-sm mb-0">
                                    <tbody>
                                        {DAYS.map((d, i) => {
                                            const h = point.workingSchedule?.[d.key];
                                            const open = h && h.open && h.close;
                                            return (
                                                <tr key={d.key} className={i === todayIndex ? 'fw-bold' : ''}>
                                                    <td className="ps-3">{d.label}{i === todayIndex ? ' (bugün)' : ''}</td>
                                                    <td className="text-end pe-3">
                                                        {open ? `${h!.open} - ${h!.close}` : <span className="text-danger">Kapalı</span>}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </Col>

                    {/* Sağ: hizmetler + yorumlar */}
                    <Col lg={7}>
                        <div className="card border-0 shadow-sm rounded-3 p-4 mb-4">
                            <h2 className="fs-5 fw-bold mb-2" style={{ color: '#e58a00' }}>Bu Noktadan Alabileceğiniz Hizmetler</h2>
                            {point.services.length === 0 ? (
                                <p className="text-muted mb-0">Bu nokta için hizmet tanımı bulunmuyor.</p>
                            ) : (
                                <ServiceList services={point.services} montagePointId={point._id} />
                            )}
                        </div>

                        <div id="yorumlar" className="card border-0 shadow-sm rounded-3 p-4">
                            <h2 className="fs-5 fw-bold mb-3" style={{ color: '#e58a00' }}>Mağaza Yorumları ({point.rating.count})</h2>
                            {point.rating.count > 0 && (
                                <Row className="mb-3 g-2">
                                    <Col sm={6}>
                                        <div className="border rounded-2 p-2 d-flex justify-content-between align-items-center">
                                            <small>Montaj Süreci</small>
                                            <span className="d-inline-flex align-items-center gap-1">
                                                <Stars value={point.rating.processAverage} size={14} />
                                                <small className="fw-bold">{point.rating.processAverage}</small>
                                            </span>
                                        </div>
                                    </Col>
                                    <Col sm={6}>
                                        <div className="border rounded-2 p-2 d-flex justify-content-between align-items-center">
                                            <small>Montaj Noktası</small>
                                            <span className="d-inline-flex align-items-center gap-1">
                                                <Stars value={point.rating.locationAverage} size={14} />
                                                <small className="fw-bold">{point.rating.locationAverage}</small>
                                            </span>
                                        </div>
                                    </Col>
                                </Row>
                            )}
                            {point.reviews.length === 0 ? (
                                <p className="text-muted mb-0">Bu montaj noktası için henüz yorum yapılmamış.</p>
                            ) : (
                                point.reviews.map((r, i) => (
                                    <div key={i} className={`py-3 ${i > 0 ? 'border-top' : ''}`}>
                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                            <span className="fw-semibold">{r.memberName === 'sistem' ? 'LastikJantAVM Müşterisi' : r.memberName}</span>
                                            <Stars value={(r.processRating + r.locationRating) / 2} size={14} />
                                        </div>
                                        {r.comment && <p className="mb-1 small">{r.comment}</p>}
                                        <small className="text-muted">
                                            {new Date(r.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </small>
                                    </div>
                                ))
                            )}
                        </div>
                    </Col>
                </Row>
            </Container>
        </section>
    );
}
