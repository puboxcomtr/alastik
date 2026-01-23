'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Grid } from '@mui/material';
import { Container, Row, Col } from 'react-bootstrap'
import { toast } from 'react-toastify';
import { ROUTES } from '@/src/config/routes';
import { useCart } from '@/src/context/CartContext';
import { orderService } from '@/src/services/orderService';

// Components
import PaymentTitle from '@/src/components/payment/Content/PaymentTitle';
import PaymentContent from '@/src/components/payment/Content/PaymentContent';
import PaymentSidebar from '@/src/components/payment/Sidebar/PaymentSidebar';

export default function PaymentPage() {
    const router = useRouter();
    const { items, clearCart, loading: cartLoading } = useCart();
    const [processing, setProcessing] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [orderCompleted, setOrderCompleted] = useState(false);

    useEffect(() => {
        if (cartLoading || orderCompleted) return;
        if (items.length === 0) {
            router.push(ROUTES.CART);
        }
    }, [items, router, cartLoading, orderCompleted]);

    const handlePayment = async () => {
        if (!termsAccepted) {
            toast.error('Lütfen sözleşmeleri onaylayın');
            return;
        }

        const checkoutRaw = sessionStorage.getItem('checkoutData');
        if (!checkoutRaw) {
            toast.error('Teslimat bilgileri bulunamadı');
            router.push(ROUTES.CHECKOUT);
            return;
        }

        const checkoutData = JSON.parse(checkoutRaw);
        setProcessing(true);

        try {
            const orderData = {
                memberId: checkoutData.memberId || null,
                isGuest: checkoutData.isGuest,
                customerEmail: checkoutData.isGuest
                    ? checkoutData.billing?.email
                    : checkoutData.customerEmail,
                customerPhone: checkoutData.isGuest
                    ? checkoutData.billing?.phone
                    : checkoutData.customerPhone,
                customerName: checkoutData.isGuest
                    ? (checkoutData.billing?.fullName || checkoutData.billing?.authorizedPerson)
                    : checkoutData.customerName,
                billingAddressId: checkoutData.isGuest ? null : checkoutData.billingAddressId,
                shippingAddressId: checkoutData.isGuest ? null : checkoutData.shippingAddressId,
                guestBillingAddress: checkoutData.isGuest ? checkoutData.billing : null,
                guestShippingAddress: checkoutData.isGuest
                    ? (checkoutData.useSameAddress ? checkoutData.billing : checkoutData.shipping)
                    : null,
                items: items.map(item => ({
                    productKey: item.productKey,
                    name: item.productName,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    totalPrice: item.unitPrice * item.quantity
                })),
                pricing: {
                    subtotal: items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0),
                    shippingCost: 0,
                    discountAmount: 0,
                    total: items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0)
                },
                paymentMethod: 'bank_transfer',
                customerNote: ''
            };

            const order = await orderService.createOrder(orderData);

            if (order) {
                setOrderCompleted(true);
                sessionStorage.removeItem('checkoutData');
                sessionStorage.setItem('orderSuccess', order.orderNumber);
                await clearCart(true);
                router.push(`/siparis-basarili?order=${order.orderNumber}`);
            }else {
                toast.error('Sipariş oluşturulamadı');
            }
        } catch (error) {
            console.error('Sipariş hatası:', error);
            toast.error('Bir hata oluştu');
        } finally {
            setProcessing(false);
        }
    };

    if (cartLoading) {
        return (
            <div className="container py-5 text-center">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Yükleniyor...</span>
                </div>
            </div>
        );
    }

    if (items.length === 0) {
        return null;
    }

    return (
        <Container>
            <Row className='row-fluid'>
                <Col lg="12">
                    <PaymentTitle />
                </Col>
                <Row>
                    <Col lg={8} className='pl-0 ml-0'>
                        <PaymentContent onReady={setTermsAccepted} />
                    </Col>
                    <Col lg={3} className="offset-xl-1 pr-0 mr-0">
                        <PaymentSidebar
                            onSubmit={handlePayment}
                            loading={processing}
                            disabled={!termsAccepted}
                        />
                    </Col>
                </Row>
            </Row>
        </Container>
    );
}