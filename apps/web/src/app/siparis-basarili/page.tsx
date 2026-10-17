'use client';
import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Container, Row, Col } from 'react-bootstrap';
import { Package } from 'lucide-react';
import { orderService } from '@/src/services/orderService';
import { ROUTES } from '@/src/config/routes';
import { pushDataLayer, fireAdsConversion } from '@/src/lib/tracking';

import { Order } from '@/src/types/order';


// Components
import OrderSummary from '@/src/components/payment/Success/OrderSummary';
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

    // Dönüşüm olayları — sipariş başarılı yüklendiğinde 1 kez tetikle
    useEffect(() => {
        if (!order || conversionSentRef.current) return;
        if (typeof window === 'undefined') return;

        conversionSentRef.current = true;
        // Sipariş tutarı API yanıtında pricing.total altındadır (KDV dahil ödenen toplam)
        const orderValue = Number(order.pricing?.total ?? 0);

        // GTM dönüşüm tetikleyicileri için dataLayer olayı (her iki site)
        pushDataLayer({
            event: 'purchase',
            value: orderValue,
            currency: 'TRY',
            transaction_id: orderNumber || ''
        });

        // Google Ads dönüşümü — sitenin etiket haritasından (config/tracking.ts)
        fireAdsConversion('purchase', {
            value: orderValue,
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
                </Col>
                <Col lg="6">
                    <PaymentProducts orderNumber={orderNumber || undefined} />
                </Col>
            </Row>
        </Container>
    );
}