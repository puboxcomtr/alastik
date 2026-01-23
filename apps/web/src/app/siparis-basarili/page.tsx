'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Container, Row, Col } from 'react-bootstrap'
import { CheckCircle, Package, CreditCard, Home } from 'lucide-react';
import { orderService } from '@/src/services/orderService';

// Components
import OrderSummary from '@/src/components/payment/Success/OrderSummary';
import Coupon from '@/src/components/payment/Success/Coupon';
import PaymentProducts from '@/src/components/payment/Success/PaymentProducts';

interface Order {
    orderNumber: string;
    pricing: {
        subtotal: number;
        total: number;
    };
    payment: {
        method: string;
        bankTransfer?: {
            referenceCode: string;
        };
    };
    items: Array<{
        name: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
    }>;
}

export default function OrderSuccessPage() {
    const searchParams = useSearchParams();
    const orderNumber = searchParams.get('order');
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (orderNumber) {
            orderService.getOrderByNumber(orderNumber).then(data => {
                setOrder(data);
                setLoading(false);
            });
        } else {
            setLoading(false);
        }
    }, [orderNumber]);

    if (loading) {
        return (
            <Container className="py-5 text-center">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Yükleniyor...</span>
                </div>
            </Container>
        );
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
                    <Link href="/" className="btn btn-primary mt-3">
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
                    <PaymentProducts />
                </Col>
            </Row>
        </Container>
    );
}