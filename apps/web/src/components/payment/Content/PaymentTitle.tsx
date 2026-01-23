'use client';

import React from 'react';
export default function PaymentTitle() {
    return (

        <div className="card border-0">
            <div className="card-body pt-4 p-3 pr-0">
                <div className='d-flex'>
                    <h6 className="text-primary h6 mb-0">Ödeme Bilgileri <i className="ri-arrow-right-wide-line"></i> </h6>
                    <h6 className="text-muted h6 mb-0">Sipariş Özeti </h6>
                </div>
                <hr />
            </div>
        </div>
    );
}