'use client';

import React, { useState } from 'react';
import { Tooltip } from "@mui/material";
import { useCart } from '@/src/context/CartContext';

interface CheckoutSummaryProps {
    onSubmit: () => void;
    loading?: boolean;
    showButton?: boolean;
}

export default function CheckoutSummary({ onSubmit, loading, showButton = true }: CheckoutSummaryProps) {
    const { items, totals } = useCart();
    const [couponCode, setCouponCode] = useState('');
    const [mobileExpanded, setMobileExpanded] = useState(false);

    const formatPrice = (price: number) => {
        return price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
        <>
            {/* Masaüstü Sidebar */}
            <div className="d-none d-lg-block">
                <div className="card bg-white rounded">
                    <div className="card-body">
                        <h5 className="card-title">Sipariş Özeti</h5>
                        <hr />
                        <div className="d-flex justify-content-between mb-2">
                            <span className="fw-semibold text-black fs-sm">Ürünler Toplamı</span>
                            <span>{formatPrice(totals.subtotal)} TL</span>
                        </div>
                        <div className="d-flex justify-content-between mb-2">
                            <span className="fw-semibold text-black fs-sm">Kargo Bedeli</span>
                            <span className="text-success">Ücretsiz</span>
                        </div>
                        <hr />
                        <div className="d-flex justify-content-between mb-4">
                            <span className="fw-semibold text-black fs-sm">Toplam (KDV Dahil)</span>
                            <span className="fw-bold text-primary">{formatPrice(totals.subtotal)} TL</span>
                        </div>
                        {showButton && (
                            <button
                                type="button"
                                className="btn btn-primary w-100 mb-2 fw-semibold fs-6 py-3"
                                onClick={onSubmit}
                                disabled={loading}
                            >
                                {loading ? 'Yükleniyor...' : 'Ödemeye Geç'}
                            </button>
                        )}
                        <div className="d-flex gap-2 flex-column my-3">
                            <input
                                type="text"
                                className="form-control form-control-md"
                                placeholder="Hediye Çeki / İndirim Kodu"
                                value={couponCode}
                                onChange={(e) => setCouponCode(e.target.value)}
                            />
                            <button className="btn btn-outline-primary btn-md">
                                Uygula
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobil Bottom Bar */}
            <div className="d-lg-none">
                {mobileExpanded && (
                    <div
                        className="cart-mobile-overlay"
                        onClick={() => setMobileExpanded(false)}
                    />
                )}

                <div
                    className={`cart-mobile-panel ${mobileExpanded ? 'cart-mobile-panel--open' : 'cart-mobile-panel--closed'}`}
                >
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className="fw-bold">Sipariş Özeti</h5>
                        <button
                            className="btn btn-sm p-0"
                            onClick={() => setMobileExpanded(false)}
                        >
                            <i className="ri-close-line fs-5"></i>
                        </button>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                        <span className="fs-sm text-black">Ara Toplam</span>
                        <span>{formatPrice(totals.subtotal)} TL</span>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                        <span className="fs-sm text-black">Kargo Bedeli</span>
                        <span className="text-success">Ücretsiz</span>
                    </div>
                    <div className="d-flex gap-2 mb-2">
                        <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Hediye Çeki / İndirim Kodu"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value)}
                        />
                        <button className="btn btn-outline-primary btn-sm">
                            Uygula
                        </button>
                    </div>
                </div>

                <div
                    className='cart__toggle start-0 end-0'
                    onClick={() => setMobileExpanded(!mobileExpanded)}
                    style={{
                        position: 'fixed',
                        bottom: mobileExpanded ? '315px' : '120px',
                        left: 0,
                        right: 0,
                        zIndex: 1052,
                        transition: 'bottom 0.3s ease',
                    }}
                >
                    <i className={`ri-arrow-${mobileExpanded ? 'down' : 'up'}-s-line text-muted fs-3`}></i>
                </div>

                <div className="cart-mobile-bar">
                    <div className="d-flex align-items-center justify-content-between">
                        <div className="d-flex flex-column cart-mobile-label">
                            <span className='text-black fw-bold fs-6'>Toplam</span>
                            <span className='text-muted'>KDV Dahil</span>
                        </div>
                        <div className="fw-bold text-primary cart-mobile-price">
                            {formatPrice(totals.subtotal)} TL
                        </div>
                    </div>
                    <div className="d-flex flex-column">
                        {showButton && (
                            <button
                                className="btn btn-primary fw-semibold fs-md my-3"
                                onClick={onSubmit}
                                disabled={loading}
                            >
                                {loading ? 'Yükleniyor...' : 'Ödemeye Geç'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}