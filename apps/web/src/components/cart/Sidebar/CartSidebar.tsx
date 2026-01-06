'use client';

import React, { useState } from 'react';
import { Tooltip } from "@mui/material";
import { ROUTES } from '@/src/config/routes';

interface CartSidebarProps {
    totals: {
        subtotal: number;
        kdv: number;
        total: number;
        itemCount: number;
    };
    showCheckoutButton?: boolean;
    showContinueButton?: boolean;
}

export default function CartSidebar({
    totals,
    showCheckoutButton = true,
    showContinueButton = true
}: CartSidebarProps) {

    const formatPrice = (price: number) => {
        return price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };
    const [showCoupon, setShowCoupon] = useState(false);
    const [couponCode, setCouponCode] = useState('');

    return (
        <>
            <div className="card bg-white rounded mt-3" style={{ boxShadow: '0 0 24px 0 rgba(0, 0, 0, .2)' }}>
                <div className="card-body">
                    <h5 className="card-title">Sepet Özeti</h5>
                    <div className="d-flex justify-content-between mb-2">
                        <span className="fw-semibold text-black fs-sm">Ürünler Toplamı</span>
                        <span>{formatPrice(totals.subtotal)} TL</span>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                        <span className="fw-semibold text-black fs-sm">Kargo Bedeli</span>
                        <span>0 TL</span>
                    </div>
                    <hr />
                    <div className="d-flex justify-content-between mb-4">
                        <span className="fw-semibold text-black fs-sm">Toplam (KDV Dahil)</span>
                        <span className="fw-bold text-primary">{formatPrice(totals.subtotal)} TL</span>
                    </div>
                    {showCheckoutButton && (
                        <button className="btn btn-primary w-100 mb-2 fw-semibold fs-6 py-3">
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
                            <button
                                className="btn btn-outline-primary btn-md"
                            >
                                Uygula
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}