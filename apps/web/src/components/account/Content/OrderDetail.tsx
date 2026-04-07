'use client';

import React from 'react';
import Link from 'next/link';
import { Offcanvas } from 'react-bootstrap';
import { buildProductUrl } from '@/src/config/routes';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    pending: { label: 'Onay Bekliyor', color: 'bg-warning' },
    confirmed: { label: 'Onaylandı', color: 'bg-info' },
    processing: { label: 'Hazırlanıyor', color: 'bg-info' },
    shipped: { label: 'Kargoya Verildi', color: 'bg-primary' },
    delivered: { label: 'Teslim Edildi', color: 'bg-success' },
    cancelled: { label: 'İptal Edildi', color: 'bg-danger' },
    returned: { label: 'İade Edildi', color: 'bg-secondary' },
    payment_failed: { label: 'Ödeme Başarısız', color: 'bg-danger' },
};

const PAYMENT_METHOD_MAP: Record<string, string> = {
    credit_card: 'Kredi Kartı',
    credit_card_3d: 'Kredi Kartı',
    bank_transfer: 'Banka Havalesi',
    netahsilat_installment: 'Banka Havalesi',
    cash_on_delivery: 'Kapıda Ödeme',
};

const PAYMENT_STATUS_MAP: Record<string, string> = {
    pending: 'Bekliyor',
    paid: 'Ödendi',
    failed: 'Başarısız',
    refunded: 'İade Edildi',
    cancelled: 'İptal Edildi',
};

type OrderDetailProps = {
    order: any;
    show: boolean;
    onHide: () => void;
    loading?: boolean;
};

export default function OrderDetail({ order, show, onHide, loading }: OrderDetailProps) {

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(price);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('tr-TR', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
    };

    const getStatus = (status: string) => {
        return STATUS_MAP[status] || { label: status, color: 'bg-secondary' };
    };

    const formatAddress = (snapshot: any) => {
        if (!snapshot) return '-';
        const parts = [
            snapshot.street,
            snapshot.buildingNo ? `No: ${snapshot.buildingNo}` : null,
            snapshot.floor ? `Kat: ${snapshot.floor}` : null,
            snapshot.apartmentNo ? `Daire: ${snapshot.apartmentNo}` : null,
        ].filter(Boolean).join(' ');

        const location = [snapshot.neighborhoodName, snapshot.districtName, snapshot.cityName].filter(Boolean).join(', ');
        return `${parts}${parts && location ? ', ' : ''}${location}`;
    };

    return (
        <Offcanvas show={show} onHide={onHide} placement="start" style={{ width: '500px' }}>
            {loading ? (
                <div className="d-flex align-items-center justify-content-center h-100">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Yükleniyor...</span>
                    </div>
                </div>
            ) : !order ? (
                <div className="d-flex align-items-center justify-content-center h-100">
                    Sipariş Bulunamadı.
                </div>
            ) : (
                <>
                    {/* Header */}
                    <Offcanvas.Header closeButton className="align-items-start py-3 pt-lg-4">
                        <div>
                            <Offcanvas.Title className="mb-1">
                                Sipariş #{order.orderNumber}
                            </Offcanvas.Title>
                            <span className="d-flex align-items-center fs-sm fw-medium text-body-emphasis">
                                <span className={`${getStatus(order.status).color} rounded-circle p-1 me-2`}></span>
                                {getStatus(order.status).label}
                            </span>
                        </div>
                    </Offcanvas.Header>

                    {/* Body */}
                    <Offcanvas.Body className="d-flex flex-column gap-4 pt-2 pb-3">

                        {/* Urunler */}
                        <div className="d-flex flex-column gap-3">
                            {order.items?.map((item: any, idx: number) => (
                                <div className="d-flex align-items-center" key={idx}>
                                    {item.seoUrl ? (
                                        <Link href={buildProductUrl(item.seoUrl)} className="flex-shrink-0">
                                            {item.image ? (
                                                <img src={item.image} width="110" alt={item.name} style={{ objectFit: 'contain' }} />
                                            ) : (
                                                <div style={{ width: 110, height: 110, background: '#f5f5f5' }} className="d-flex align-items-center justify-content-center rounded">
                                                    <i className="ci-image fs-3 text-muted"></i>
                                                </div>
                                            )}
                                        </Link>
                                    ) : (
                                        <span className="flex-shrink-0">
                                            {item.image ? (
                                                <img src={item.image} width="110" alt={item.name} style={{ objectFit: 'contain' }} />
                                            ) : (
                                                <div style={{ width: 110, height: 110, background: '#f5f5f5' }} className="d-flex align-items-center justify-content-center rounded">
                                                    <i className="ci-image fs-3 text-muted"></i>
                                                </div>
                                            )}
                                        </span>
                                    )}
                                    <div className="w-100 min-w-0 ps-2 ps-sm-3">
                                        <h5 className="d-flex animate-underline mb-2">
                                            {item.seoUrl ? (
                                                <Link href={buildProductUrl(item.seoUrl)} className="d-block fs-sm fw-medium text-truncate animate-target text-decoration-none text-body-emphasis">
                                                    {item.name}
                                                </Link>
                                            ) : (
                                                <span className="d-block fs-sm fw-medium text-truncate">{item.name}</span>
                                            )}
                                        </h5>
                                        <div className="h6 mb-2">{formatPrice(item.unitPrice)}</div>
                                        <div className="fs-xs">Adet: {item.quantity}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="border-top pt-4">
                            <h6>Teslimat Bilgileri</h6>
                            <ul className="list-unstyled fs-sm mb-4">
                                <li className="d-flex justify-content-between mb-1">
                                    Sipariş tarihi:
                                    <span className="text-body-emphasis fw-medium text-end ms-2">
                                        {formatDate(order.createdAt)}
                                    </span>
                                </li>
                                {order.shippingSnapshot?.fullName && (
                                    <li className="d-flex justify-content-between mb-1">
                                        Alıcı:
                                        <span className="text-body-emphasis fw-medium text-end ms-2">
                                            {order.shippingSnapshot.fullName}
                                        </span>
                                    </li>
                                )}
                                <li className="d-flex justify-content-between mb-1">
                                    Teslimat adresi:
                                    <span className="text-body-emphasis fw-medium text-end ms-2" style={{ maxWidth: '60%' }}>
                                        {formatAddress(order.shippingSnapshot)}
                                    </span>
                                </li>
                            </ul>

                            {order.billingSnapshot && (
                                <>
                                    <h6>Fatura Bilgileri</h6>
                                    <ul className="list-unstyled fs-sm mb-4">
                                        {order.billingSnapshot.invoiceType === 'corporate' ? (
                                            <>
                                                <li className="d-flex justify-content-between mb-1">
                                                    Firma:
                                                    <span className="text-body-emphasis fw-medium text-end ms-2">
                                                        {order.billingSnapshot.companyName}
                                                    </span>
                                                </li>
                                                <li className="d-flex justify-content-between mb-1">
                                                    Vergi dairesi / No:
                                                    <span className="text-body-emphasis fw-medium text-end ms-2">
                                                        {order.billingSnapshot.taxOffice} / {order.billingSnapshot.taxNo}
                                                    </span>
                                                </li>
                                            </>
                                        ) : (
                                            <li className="d-flex justify-content-between mb-1">
                                                Ad soyad:
                                                <span className="text-body-emphasis fw-medium text-end ms-2">
                                                    {order.billingSnapshot.fullName}
                                                </span>
                                            </li>
                                        )}
                                        <li className="d-flex justify-content-between mb-1">
                                            Fatura adresi:
                                            <span className="text-body-emphasis fw-medium text-end ms-2" style={{ maxWidth: '60%' }}>
                                                {formatAddress(order.billingSnapshot)}
                                            </span>
                                        </li>
                                    </ul>
                                </>
                            )}

                            <h6>Ödeme Bilgileri</h6>
                            <ul className="list-unstyled fs-sm m-0">
                                <li className="d-flex justify-content-between mb-1">
                                    Ödeme Yöntemi:
                                    <span className="text-body-emphasis fw-medium text-end ms-2">
                                        {PAYMENT_METHOD_MAP[order.payment?.method] || order.payment?.method || '-'}
                                    </span>
                                </li>
                                <li className="d-flex justify-content-between mb-1">
                                    Ödeme durumu:
                                    <span className="text-body-emphasis fw-medium text-end ms-2">
                                        {PAYMENT_STATUS_MAP[order.payment?.status] || order.payment?.status || '-'}
                                    </span>
                                </li>
                                {order.pricing?.shippingCost > 0 && (
                                    <li className="d-flex justify-content-between mb-1">
                                        Kargo:
                                        <span className="text-body-emphasis fw-medium text-end ms-2">
                                            {formatPrice(order.pricing.shippingCost)}
                                        </span>
                                    </li>
                                )}
                                {order.pricing?.discountAmount > 0 && (
                                    <li className="d-flex justify-content-between mb-1">
                                        İndirim:
                                        <span className="text-body-emphasis fw-medium text-end ms-2">
                                            -{formatPrice(order.pricing.discountAmount)}
                                        </span>
                                    </li>
                                )}
                            </ul>
                        </div>

                        {/* Toplam */}
                        <div className="d-flex align-items-center justify-content-between fs-sm border-top pt-4">
                            Toplam:
                            <span className="h5 text-end ms-2 mb-0">
                                {formatPrice(order.pricing?.total || 0)}
                            </span>
                        </div>

                        {order.customerNote && (
                            <div className="border-top pt-4">
                                <h6>Müşteri Notu</h6>
                                <p className="fs-sm text-body mb-0">{order.customerNote}</p>
                            </div>
                        )}
                    </Offcanvas.Body>
                </>
            )}
        </Offcanvas>
    );
}