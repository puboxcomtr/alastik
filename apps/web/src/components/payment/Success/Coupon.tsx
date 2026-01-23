'use client';

import React, { useState } from 'react';

export default function Coupon() {
    const [copied, setCopied] = useState(false);
    const couponCode = '500TLKUPON';

    const handleCopy = () => {
        navigator.clipboard.writeText(couponCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <div
            className="bg-danger rounded px-4 py-4"
            style={{ '--cz-bg-opacity': 0.2 } as React.CSSProperties}
        >
            <div className="py-3">
                <h2 className="h4 text-center pb-2 mb-1">Tebrikler! Yeni alışverişinizde <strong>500 TL</strong> indirim!</h2>
                <p className="fs-sm text-center mb-4">Kuponu şimdi kullanın veya kişisel hesabınızda bulun.</p>
                <div className="d-flex gap-2 mx-auto" style={{ maxWidth: '500px' }}>
                    <input
                        type="text"
                        className="form-control border-white border-opacity-10 w-100"
                        id="couponCode"
                        value={couponCode}
                        readOnly
                    />
                    <button
                        type="button"
                        className="btn btn-dark"
                        onClick={handleCopy}
                    >
                        {copied ? 'Kopyalandı!' : 'Kopyala'}
                    </button>
                </div>
            </div>
        </div>
    );
}