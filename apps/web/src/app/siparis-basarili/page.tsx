'use client';
import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Container, Row, Col } from 'react-bootstrap';
import { Package } from 'lucide-react';
import { orderService } from '@/src/services/orderService';
import { ROUTES } from '@/src/config/routes';

import { Order } from '@/src/types/order';


// Components
import OrderSummary from '@/src/components/payment/Success/OrderSummary';
import Coupon from '@/src/components/payment/Success/Coupon';
import PaymentProducts from '@/src/components/payment/Success/PaymentProducts';

declare global {
    interface Window {
        gtag?: (...args: unknown[]) => void;
    }
}


export default function OrderSuccessPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const orderNumber = searchParams.get('order');
    const [order, setOrder] = useState<Order | null>(null);
    const [isValidAccess, setIsValidAccess] = useState(false);
    const conversionSentRef = useRef(false);

    // Google Ads conversion event — sipariş başarılı yüklendiğinde 1 kez tetikle
    useEffect(() => {
        if (!order || conversionSentRef.current) return;
        if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;

        conversionSentRef.current = true;
        const orderValue = Number((order as { total?: number; totalAmount?: number; grandTotal?: number }).total
            ?? (order as { totalAmount?: number }).totalAmount
            ?? (order as { grandTotal?: number }).grandTotal
            ?? 0);

        window.gtag('event', 'conversion', {
            send_to: 'AW-18022245202/qJixCKjJ8LscENLG1pFD',
            value: orderValue,
            currency: 'TRY',
            transaction_id: orderNumber || ''
        });
    }, [order, orderNumber]);

    useEffect(() => {
        // Referrer kontrolü
        const referrer = document.referrer;
        const isFromOurSite = referrer.includes('alastik.com') || referrer.includes('localhost');

        if (!isFromOurSite && !searchParams.get('order')) {
            router.push(ROUTES.HOME);
            return;
        }

        setIsValidAccess(true);

        // Sipariş verilerini çek
        if (orderNumber) {
            orderService.getOrderByNumber(orderNumber).then(data => {
                setOrder(data);
            });
        }
    }, [orderNumber, router, searchParams]);

    if (!isValidAccess) {
        return null;
    }
    if (!order) {
        return (
            <Container className="py-5">
                <div className="text-center">
                    <div className="text-danger mb-4" style={{ fontSize: '64px' }}>
                        <Package />
                    </div>
                    <h2>Sipariş Bulunamadı</h2>
                    <p className="text-muted">Sipariş bilgilerine ulaşılamadı.</p>
                    <Link href={ROUTES.HOME} className="btn btn-primary mt-3">
                        Anasayfaya Dön
                    </Link>
                </div>
            </Container>
        );
    }

    return (
        <Container>
            <Row className='row-fluid align-items-center px-2 py-lg-3'>
                <Col lg="6">
                    <OrderSummary order={order} />
                    <Coupon />
                </Col>
                <Col lg="6">
                    <PaymentProducts orderNumber={orderNumber || undefined} />
                </Col>
            </Row>
        </Container>
    );
}