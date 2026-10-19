'use client';

import Link from 'next/link';
import { Container } from 'react-bootstrap';
import { useCart } from '@/src/context/CartContext';
import { ROUTES } from '@/src/config/routes';

const formatPrice = (price: number) => price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function MontageStickyBar() {
    const { items, totals } = useCart();
    if (items.length === 0) return null;

    const montageSelected = items.some(i => i.itemType === 'montage');

    return (
        <>
        <div style={{ height: 72 }} aria-hidden="true" />
        <div className="lja-montage-bar">
            <Container className="d-flex align-items-center justify-content-between gap-3 py-2">
                <div className="d-flex flex-column">
                    <small className="text-muted lh-1">Ürün Tutarı ({totals.itemCount} adet)</small>
                    <span className="fw-bold fs-5 text-black">{formatPrice(totals.subtotal)} TL</span>
                </div>
                <Link href={ROUTES.CART} className="btn btn-dark fw-semibold flex-shrink-0">
                    {montageSelected ? 'Sepete Devam Et' : 'Montaj Almadan Sepete Devam Et'}
                </Link>
            </Container>
            <style>{`
                .lja-montage-bar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 1030; background: #fff; border-top: 1px solid #e0e5eb; box-shadow: 0 -4px 16px rgba(0,0,0,.08); }
                @media (max-width: 575.98px) {
                    .lja-montage-bar .btn { font-size: 13px; padding: 8px 12px; }
                    .lja-montage-bar .fs-5 { font-size: 16px !important; }
                }
            `}</style>
        </div>
        </>
    );
}
