'use client';

import React from 'react';


export default function CartContent() {

    const formatPrice = (price: number) => {
        return price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
        <div className="card border-0 shadow-sm">
            <div className="card-body pt-0 p-3">
                <div className="alert alert-danger">
                    <span className="fs-7">
                        4 Al, Lastik Kaskosu Kazan kampanyasından faydalanmak için, kampanya kapsamındaki ürünlerden sepetinize 3 adet daha eklemelisiniz.
                    </span>
                </div>
            </div>
        </div>
    );
}