'use client';

import React, { useState, useEffect } from 'react';
import { paymentService, BankAccount } from '@/src/services/paymentService';
import CreditCardForm, { CardFormData } from './CreditCardForm';

interface PaymentContentProps {
    onReady?: (ready: boolean) => void;
    onCardData?: (data: CardFormData | null) => void;
    totalAmount: number;
}

export default function PaymentContent({ onReady, onCardData, totalAmount }: PaymentContentProps) {
    const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'bank_transfer'>('credit_card');
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    const [copiedIban, setCopiedIban] = useState<string | null>(null);
    const [cardData, setCardData] = useState<CardFormData | null>(null);

    useEffect(() => {
        paymentService.getBankAccounts().then(setBankAccounts);
    }, []);

    useEffect(() => {
        if (paymentMethod === 'bank_transfer') {
            onReady?.(true);
            onCardData?.(null);
        } else if (paymentMethod === 'credit_card') {
            const isReady = cardData?.isValid && cardData?.installment >= 1;
            onReady?.(isReady || false);
            onCardData?.(cardData);
        }
    }, [paymentMethod, cardData]);

    const copyIban = (iban: string) => {
        navigator.clipboard.writeText(iban);
        setCopiedIban(iban);
        setTimeout(() => setCopiedIban(null), 2000);
    };

    const handleCardDataChange = (data: CardFormData | null) => {
        setCardData(data);
    };

    const selectMethod = (method: 'credit_card' | 'bank_transfer') => {
        setPaymentMethod(method);
    };

    return (

        <div className="card border-0">
            <div className="card-body p-3 pt-0">
                <div className="payment-accordion">
                    {/* Kredi Kartı Accordion */}
                    <div
                        className={`payment-option ${paymentMethod === 'credit_card' ? 'active' : ''}`}
                        style={{
                            border: paymentMethod === 'credit_card' ? '1px solid rgb(233, 236, 239)' : '1px solid #dee2e6',
                            borderRadius: '8px',
                            marginBottom: '12px',
                            overflow: 'hidden',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <div
                            className="payment-option-header"
                            onClick={() => selectMethod('credit_card')}
                            style={{
                                padding: '16px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}
                        >
                            <div className="d-flex align-items-center gap-3">
                                <div
                                    style={{
                                        width: '22px',
                                        height: '22px',
                                        borderRadius: '50%',
                                        border: paymentMethod === 'credit_card' ? '6px solid #e2001a' : '2px solid #adb5bd',
                                        transition: 'all 0.2s ease'
                                    }}
                                />
                                <div>
                                    <div className="fw-semibold">Kredi Kartı ile Ödeme</div>
                                    <small className="text-muted">3D Secure ile Güvenli Ödeme</small>
                                </div>
                            </div>
                        </div>

                        {paymentMethod === 'credit_card' && (
                            <div
                                className="payment-option-content"
                                style={{
                                    padding: '0 16px 16px 16px',
                                    borderTop: '1px solid #e9ecef'
                                }}
                            >
                                <CreditCardForm
                                    onCardDataChange={handleCardDataChange}
                                    totalAmount={totalAmount}
                                />
                            </div>
                        )}
                    </div>

                    {/* Havale/EFT Accordion */}
                    <div
                        className={`payment-option ${paymentMethod === 'bank_transfer' ? 'active' : ''}`}
                        style={{
                            border: paymentMethod === 'bank_transfer' ? '1px solid #dee2e6' : '1px solid #dee2e6',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <div
                            className="payment-option-header"
                            onClick={() => selectMethod('bank_transfer')}
                            style={{
                                padding: '16px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}
                        >
                            <div className="d-flex align-items-center gap-3">
                                <div
                                    style={{
                                        width: '22px',
                                        height: '22px',
                                        borderRadius: '50%',
                                        border: paymentMethod === 'bank_transfer' ? '6px solid #e2001a' : '2px solid #adb5bd',
                                        transition: 'all 0.2s ease'
                                    }}
                                />
                                <div>
                                    <div className="fw-semibold">Havale / EFT</div>
                                    <small className="text-muted">Banka havalesi ile ödeme</small>
                                </div>
                            </div>
                        </div>

                        {paymentMethod === 'bank_transfer' && bankAccounts.length > 0 && (
                            <div
                                className="payment-option-content"
                                style={{
                                    padding: '16px',
                                    borderTop: '1px solid #e9ecef'
                                }}
                            >
                                <div className="small text-muted">
                                    Aşağıdaki hesaplardan birine havale/EFT yapabilirsiniz.
                                </div>

                                {bankAccounts.map((bank, index) => (
                                    <div
                                        key={bank._id}
                                        className="bank-account-card"
                                        style={{
                                            padding: '14px',
                                            marginBottom: index < bankAccounts.length - 1 ? '10px' : '0',
                                            borderBottom: '1px solid #e9ecef'
                                        }}
                                    >
                                        <div className="d-flex justify-content-between align-items-start mb-2">
                                            <strong style={{ color: '#1a1a2e' }}>{bank.name}</strong>
                                        </div>
                                        <div className="small text-muted mb-1">
                                            Hesap Sahibi: {bank.accountName}
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between">

                                            <div className="small text-muted mb-1">
                                                IBAN: {bank.iban}
                                            </div>
                                            <code style={{ fontSize: '13px', color: '#495057' }}></code>
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-outline-secondary"
                                                onClick={() => copyIban(bank.iban)}
                                                style={{ padding: '4px 10px', fontSize: '12px' }}
                                            >
                                                {copiedIban === bank.iban ? (
                                                    <><i className="ri-check-line me-1"></i>Kopyalandı</>
                                                ) : (
                                                    <><i className="ri-file-copy-line me-1"></i>Kopyala</>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}