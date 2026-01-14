'use client';

import React from 'react';
export default function CartTitle() {
    return (

        <div className="card border-0 shadow-sm">
            <div className="card-body pt-4 p-3 pr-0">
                <div className='d-flex'>
                    <h6 className="text-primary h6 mb-0">Teslimat ve Fatura <i className="ri-arrow-right-wide-line"></i> </h6>
                    <h6 className="text-muted h6 mb-0">Ödeme Bilgileri </h6>
                </div>
                <hr />
            </div>
        </div>
    );
}