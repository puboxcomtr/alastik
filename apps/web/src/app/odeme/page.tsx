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
                // Backend items ve pricing'i kendi hesaplayacak (güvenlik)
                items: items.map(item => ({
                    productKey: item.productKey,
                    quantity: item.quantity,
                    montagePointId: item.montagePointId || ''
                })),
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
                const gateway = cardData.gateway || 'netahsilat';

                try {
                    if (gateway === 'nkolay') {
                        // ===== NKOLAY (Tek çekim + Banka kartı) =====
                        const response = await fetch(API_ENDPOINTS.payment.nkolayInit(), {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                orderId: order._id,
                                cardNumber: cardData.cardNumber,
                                cardHolderName: cardData.cardHolderName,
                                expMonth: cardData.expMonth,
                                expYear: cardData.expYear,
                                cvc: cardData.cvc,
                                email: checkoutData.isGuest ? checkoutData.billing?.email : checkoutData.customerEmail
                            })
                        });

                        const result = await response.json();

                        if (result.success && result.threeDHtml) {
                            sessionStorage.removeItem('checkoutData');
                            document.open();
                            document.write(result.threeDHtml);
                            document.close();
                            return;
                        } else if (result.success && result.directSuccess) {
                            sessionStorage.removeItem('checkoutData');
                            await clearCart(true);
                            router.push(`/siparis-basarili?order=${result.orderNumber}`);
                            return;
                        } else {
                            toast.error(result.message || 'Ödeme başlatılamadı');
                            setProcessing(false);
                            return;
                        }

                    } else {
                        // ===== NETAHSILAT (Taksitli) =====
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
                            sessionStorage.removeItem('checkoutData');
                            window.location.href = result.threeDUrl;
                            return;
                        } else {
                            toast.error(result.message || '3D Secure başlatılamadı');
                            setProcessing(false);
                            return;
                        }
                    }
                } catch (error) {
                    console.error('Ödeme hatası:', error);
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
            <div className="row-fluid">
                <Row>
                    <Col lg="12">
                        <PaymentTitle />
                    </Col>
                </Row>
                <Row>
                    <Col lg={8}>
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
            </div>
        </Container>
    );
}