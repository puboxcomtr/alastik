'use client';

import React from 'react';
import Link from 'next/link';
import { ROUTES } from '@/src/config/routes';

export default function CartEmpty() {
    return (
        <div className="container py-5">
            <div className="text-center py-5">
                <i className="ri-shopping-cart-line" style={{ fontSize: '64px', color: '#ccc' }}></i>
                <h4 className="mt-3">Sepetinizde Ürün Bulunmamaktadır.</h4>
                <p className="text-muted">Aracınıza özel sunduğumuz ürün ve fırsatlarla dolu alışveriş deneyimini kaçırmayın.</p>
                <Link href={ROUTES.HOME} className="btn btn-primary mt-3">
                    Alışverişe Başla
                </Link>
            </div>
        </div>
    );
}