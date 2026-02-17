'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Row, Col } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { ROUTES } from '@/src/config/routes';
import { useCart } from '@/src/context/CartContext';
import { orderService } from '@/src/services/orderService';
import { CardFormData } from '@/src/components/payment/Content/CreditCardForm';

// Components
import PaymentTitle from '@/src/components/payment/Content/PaymentTitle';
import PaymentContent from '@/src/components/payment/Content/PaymentContent';
import PaymentSidebar from '@/src/components/payment/Sidebar/PaymentSidebar';

import { API_ENDPOINTS } from '@/src/config/api';


export default function PaymentPage() {
    const router = useRouter();
    const { items, clearCart, refreshCart } = useCart();
    const [processing, setProcessing] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [orderCompleted, setOrderCompleted] = useState(false);
    const [cardData, setCardData] = useState<CardFormData | null>(null);

    const totalAmount = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    useEffect(() => {
        refreshCart();
    }, [refreshCart]);
    useEffect(() => {
        if (orderCompleted) return;
        if (items.length === 0) {
            router.push(ROUTES.CART);
        }
    }, [items, router, orderCompleted]);

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
            // Sipariş oluştur
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
                    subtotal: totalAmount,
                    shippingCost: 0,
                    discountAmount: 0,
                    total: totalAmount
                },
                paymentMethod: cardData ? 'credit_card' : 'bank_transfer',
                customerNote: ''
            };

            const order = await orderService.createOrder(orderData);

            if (!order) {
                toast.error('Sipariş oluşturulamadı');
                setProcessing(false);
                return;
            }

            // Kredi kartı ile ödeme
            if (cardData && cardData.isValid) {
                try {
                    const response = await fetch(API_ENDPOINTS.payment.threeDInit(), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            orderId: order._id,
                            cardNumber: cardData.cardNumber,
                            cardHolderName: cardData.cardHolderName,
                            expMonth: cardData.expMonth,
                            expYear: cardData.expYear,
                            cvc: cardData.cvc,
                            installment: cardData.installment,
                            vPosId: cardData.vPosId,
                            email: checkoutData.isGuest ? checkoutData.billing?.email : checkoutData.customerEmail
                        })
                    });

                    const result = await response.json();

                    if (result.success && result.threeDUrl) {
                        // 3D Secure sayfasına yönlendir
                        sessionStorage.removeItem('checkoutData');
                        window.location.href = result.threeDUrl;
                        return;
                    } else {
                        toast.error(result.message || '3D Secure başlatılamadı');
                        setProcessing(false);
                        return;
                    }
                } catch (error) {
                    console.error('3D init hatası:', error);
                    toast.error('Ödeme işlemi başarısız');
                    setProcessing(false);
                    return;
                }
            }

            // Havale/EFT ile ödeme
            setOrderCompleted(true);
            sessionStorage.removeItem('checkoutData');
            sessionStorage.setItem('orderSuccess', order.orderNumber);
            await clearCart(true);
            router.push(`/siparis-basarili?order=${order.orderNumber}`);

        } catch (error) {
            console.error('Sipariş hatası:', error);
            toast.error('Bir hata oluştu');
        } finally {
            setProcessing(false);
        }
    };

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
                        <PaymentContent
                            onReady={setTermsAccepted}
                            onCardData={setCardData}
                            totalAmount={totalAmount}
                        />
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