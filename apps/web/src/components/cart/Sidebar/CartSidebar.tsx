'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tooltip } from "@mui/material";
import { ROUTES } from '@/src/config/routes';
import { isLogged } from '@/src/hooks/Theme/useAuth';
import { CartSidebarProps } from '@/src/types/cart';

export default function CartSidebar({
    totals,
    showCheckoutButton = true,
    showContinueButton = true
}: CartSidebarProps) {

    const router = useRouter();
    const handleCheckout = () => {
        if (isLogged()) {
            router.push(ROUTES.CHECKOUT);
        } else {
            router.push(`${ROUTES.LOGIN}?from=checkout`);
        }
    };
    const formatPrice = (price: number) => {
        return price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };
    const [showCoupon, setShowCoupon] = useState(false);
    const [couponCode, setCouponCode] = useState('');
    const [mobileExpanded, setMobileExpanded] = useState(false);

    return (
        <>
            {/* Masaüstü Sidebar */}
            <div className="d-none d-lg-block">
                <div className="card bg-white rounded">
                    <div className="card-body">
                        <h5 className="card-title">Sepet Özeti</h5>
                        <hr />
                        <div className="d-flex justify-content-between mb-2">
                            <span className="fw-semibold text-black fs-sm">Ürünler Toplamı</span>
                            <span>{formatPrice(totals.productsSubtotal ?? totals.subtotal)} TL</span>
                        </div>
                        <div className="d-flex justify-content-between mb-2">
                            <span className="fw-semibold text-black fs-sm">Kargo Bedeli</span>
                            <span>0 TL</span>
                        </div>
                        <hr className="my-2" />
                        {(totals.montage ?? 0) > 0 && (
                            <div className="d-flex justify-content-between mb-2">
                                <span className="fw-semibold text-black fs-sm">Montaj Fiyatı</span>
                                <span>{formatPrice(totals.montage as number)} TL</span>
                            </div>
                        )}
                        {totals.kdv > 0 && (
                            <div className="d-flex justify-content-between mb-2">
                                <span className="fw-semibold text-black fs-sm">KDV</span>
                                <span>{formatPrice(totals.kdv)} TL</span>
                            </div>
                        )}
                        <hr />
                        <div className="d-flex justify-content-between mb-4">
                            <span className="fw-semibold text-black fs-sm">Toplam (KDV Dahil)</span>
                            <span className="fw-bold text-primary">{formatPrice(totals.total)} TL</span>
                        </div>
                        {showCheckoutButton && (
                            <button
                                className="btn btn-primary w-100 mb-2 fw-semibold fs-6 py-3"
                                onClick={handleCheckout}
                            >
                                Siparişi Tamamla
                            </button>
                        )}
                        <div
                            className='d-flex align-items-center gap-1 cursor-pointer my-3'
                            onClick={() => setShowCoupon(!showCoupon)}
                        >
                            <span className='fs-7 text-decoration-underline'>
                                Hediye Çeki / İndirim Kodum Var
                            </span>
                            <Tooltip title="İndirim kuponu kullanmak için tıklayın ve kodunuzu girin">
                                <i className={`ri-arrow-${showCoupon ? 'up' : 'down'}-s-line`}></i>
                            </Tooltip>
                        </div>
                        {showCoupon && (
                            <div className="d-flex gap-2 flex-column">
                                <input
                                    type="text"
                                    className="form-control form-control-md"
                                    placeholder="Kupon kodunuzu girin"
                                    value={couponCode}
                                    onChange={(e) => setCouponCode(e.target.value)}
                                />
                                <button className="btn btn-outline-primary btn-md">
                                    Uygula
                                </button>
                            </div>
                        )}
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

                <div className={`cart-mobile-panel ${mobileExpanded ? 'cart-mobile-panel--open' : 'cart-mobile-panel--closed'}`}>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className="fw-bold">Sepet Özeti</h5>
                        <button
                            className="btn btn-sm p-0"
                            onClick={() => setMobileExpanded(false)}
                        >
                            <i className="ri-close-line fs-5"></i>
                        </button>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                        <span className="fs-sm text-black">Ara Toplam</span>
                        <span className='fw-semibold fs-sm'>{formatPrice(totals.productsSubtotal ?? totals.subtotal)} TL</span>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                        <span className="fs-sm text-black">Kargo Bedeli</span>
                        <span className='fw-semibold fs-sm'>0 TL</span>
                    </div>
                    <hr className="my-2" />
                    {(totals.montage ?? 0) > 0 && (
                        <div className="d-flex justify-content-between mb-2">
                            <span className="fs-sm text-black">Montaj Fiyatı</span>
                            <span className='fw-semibold fs-sm'>{formatPrice(totals.montage as number)} TL</span>
                        </div>
                    )}
                    {totals.kdv > 0 && (
                        <div className="d-flex justify-content-between mb-2">
                            <span className="fs-sm text-black">KDV</span>
                            <span className='fw-semibold fs-sm'>{formatPrice(totals.kdv)} TL</span>
                        </div>
                    )}
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
                        bottom: mobileExpanded ? 'calc(30px + var(--cart-panel-height, 280px))' : '120px',
                        left: 0,
                        right: 0,
                        zIndex: 1052,
                        transition: 'bottom 0.3s ease',
                    }}>
                    <i className={`ri-arrow-${mobileExpanded ? 'down' : 'up'}-s-line text-muted fs-3`}></i>
                </div>
                <div className="cart-mobile-bar">
                    <div className="d-flex align-items-center justify-content-between">
                        <div className="d-flex flex-column cursor-pointer cart-mobile-label">
                            <span className='text-black fw-bold fs-6 '>Toplam</span>
                            <span className='text-muted'>KDV Dahil</span>
                        </div>
                        <div className="fw-bold text-primary cart-mobile-price">
                            {formatPrice(totals.total)} TL
                        </div>
                    </div>
                    <div className="d-flex flex-column">
                        {showCheckoutButton && (
                            <button
                                className="btn btn-primary fw-semibold fs-md my-3"
                                onClick={handleCheckout}
                            >
                                Siparişi Tamamla
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}