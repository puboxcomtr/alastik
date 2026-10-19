'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Container } from 'react-bootstrap';
import { useCart } from '@/src/context/CartContext';
import { API_ENDPOINTS } from '@/src/config/api';
import { ROUTES } from '@/src/config/routes';

export default function ThreeDResultPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { clearCart } = useCart();
    const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
    const [message, setMessage] = useState('Ödeme işlemi tamamlanıyor...');

    useEffect(() => {
        const processPayment = async () => {
            const paymentGuid = searchParams.get('PaymentGuid');
            const transactionStatusId = searchParams.get('TransactionStatusId');
            const orderReference = searchParams.get('OrderReference') || searchParams.get('ClientReferenceCode');
            const bankMessage = searchParams.get('BankMessage');

            console.log('3D Sonuç Parametreleri:', {
                paymentGuid,
                transactionStatusId,
                orderReference,
                bankMessage
            });

            if (transactionStatusId !== '1' && transactionStatusId !== '4') {
                setStatus('error');
                setMessage(bankMessage || 'Ödeme başarısız oldu');
                setTimeout(() => {
                    router.push(`${ROUTES.PAYMENT_FAILED}?error=${encodeURIComponent(bankMessage || 'Ödeme başarısız')}`);
                }, 2000);
                return;
            }

            if (!paymentGuid) {
                setStatus('error');
                setMessage('Ödeme bilgisi alınamadı');
                setTimeout(() => {
                    router.push(`${ROUTES.PAYMENT_FAILED}?error=Ödeme bilgisi alınamadı`);
                }, 2000);
                return;
            }

            try {
                const response = await fetch(API_ENDPOINTS.payment.threeDCommit(), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        paymentGuid,
                        orderReference
                    })
                });

                const result = await response.json();

                if (result.success) {
                    setStatus('success');
                    setMessage('Ödeme başarılı! Yönlendiriliyorsunuz...');

                    await clearCart(true);

                    setTimeout(() => {
                        router.push(`${ROUTES.ORDER_SUCCESS}?order=${result.orderNumber}`);
                    }, 1500);
                } else {
                    setStatus('error');
                    setMessage(result.message || 'Ödeme tamamlanamadı');
                    setTimeout(() => {
                        router.push(`${ROUTES.PAYMENT_FAILED}?error=${encodeURIComponent(result.message || 'Ödeme tamamlanamadı')}`);
                    }, 2000);
                }
            } catch (error) {
                console.error('Commit hatası:', error);
                setStatus('error');
                setMessage('Bağlantı hatası');
                setTimeout(() => {
                    router.push(`${ROUTES.PAYMENT_FAILED}?error=Bağlantı hatası`);
                }, 2000);
            }
        };

        processPayment();
    }, [searchParams, router, clearCart]);

    return (
        <Container className="py-5">
            <div className="text-center" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                {status === 'processing' && (
                    <>
                        <div className="spinner-border text-primary mb-4" style={{ width: '4rem', height: '4rem' }} role="status">
                            <span className="visually-hidden">Yükleniyor...</span>
                        </div>
                        <h4 className="mb-2">Ödeme İşleniyor</h4>
                        <p className="text-muted">{message}</p>
                        <p className="text-muted small">Lütfen sayfayı kapatmayın...</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="text-success mb-4" style={{ fontSize: '64px' }}>
                            <i className="ri-checkbox-circle-fill"></i>
                        </div>
                        <h4 className="mb-2 text-success">Ödeme Başarılı</h4>
                        <p className="text-muted">{message}</p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="text-danger mb-4" style={{ fontSize: '64px' }}>
                            <i className="ri-close-circle-fill"></i>
                        </div>
                        <h4 className="mb-2 text-danger">Ödeme Esnasında Bir Hata Oluştu</h4>
                        <p className="text-muted">{message}</p>
                    </>
                )}
            </div>
        </Container>
    );
}