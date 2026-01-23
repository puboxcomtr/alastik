'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { paymentService, BankAccount } from '@/src/services/paymentService';

interface PaymentContentProps {
    onReady?: (ready: boolean) => void;
    onSubmit?: () => void;
    loading?: boolean;
}

export default function PaymentContent({ onReady, onSubmit, loading }: PaymentContentProps) {
    const router = useRouter();
    const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'bank_transfer'>('bank_transfer');
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    const [copiedIban, setCopiedIban] = useState<string | null>(null);

    useEffect(() => {
        paymentService.getBankAccounts().then(setBankAccounts);
    }, []);

    useEffect(() => {
        onReady?.(paymentMethod === 'bank_transfer');
    }, [paymentMethod, onReady]);

    const copyIban = (iban: string) => {
        navigator.clipboard.writeText(iban);
        setCopiedIban(iban);
        setTimeout(() => setCopiedIban(null), 2000);
    };


    return (
        <>
            {/* Ödeme Yöntemi */}
            <div className="card border-0 mb-4">
                <div className="card-body py-0">
                    <h5 className="mb-3">Ödeme Yöntemi</h5>

                    {/* Kredi Kartı */}
                    <div className="form-check mb-3">
                        <input
                            className="form-check-input"
                            type="radio"
                            name="paymentMethod"
                            id="creditCard"
                            checked={paymentMethod === 'credit_card'}
                            onChange={() => setPaymentMethod('credit_card')}
                            disabled
                        />
                        <label className="form-check-label" htmlFor="creditCard">
                            Kredi / Banka Kartı
                        </label>
                    </div>

                    {/* Kart Formu */}
                    <div className="border rounded p-3 bg-light">
                        <div className="row g-3">
                            <div className="col-12">
                                <label className="form-label small">Kart Numarası</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="**** **** **** ****"
                                    disabled
                                />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label small">Son Kullanma Tarihi</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="AA/YY"
                                    disabled
                                />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label small">CVV</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="***"
                                    disabled
                                />
                            </div>
                            <div className="col-12">
                                <label className="form-label small">Kart Üzerindeki İsim</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="AD SOYAD"
                                    disabled
                                />
                            </div>
                        </div>
                        <div className="alert alert-warning mt-3 mb-0 small">
                            Ödeme entegrasyonu henüz yapılmadı. Bu alan geçici tasarımdır.
                        </div>
                    </div>

                    {/* Havale/EFT */}
                    <div className="form-check mt-3">
                        <input
                            className="form-check-input"
                            type="radio"
                            name="paymentMethod"
                            id="bankTransfer"
                            checked={paymentMethod === 'bank_transfer'}
                            onChange={() => setPaymentMethod('bank_transfer')}
                        />
                        <label className="form-check-label" htmlFor="bankTransfer">
                            Havale / EFT
                        </label>
                    </div>

                    {/* Havale Bilgileri */}
                    {paymentMethod === 'bank_transfer' && bankAccounts.length > 0 && (
                        <div className="alert alert-secondary mt-3 small">
                            <strong>Banka Hesap Bilgileri:</strong>
                            {bankAccounts.map((bank, index) => (
                                <div key={bank._id} className={index > 0 ? 'mt-2 pt-2 border-top' : 'mt-2'}>
                                    <div>Banka: {bank.name}</div>
                                    <div>Hesap Sahibi: {bank.accountName}</div>
                                    <div className="d-flex align-items-center gap-2">
                                        IBAN: {bank.iban}
                                        <button
                                            type="button"
                                            className="btn btn-link p-0 text-muted"
                                            onClick={() => copyIban(bank.iban)}
                                            style={{ fontSize: '12px' }}
                                        >
                                            {copiedIban === bank.iban ? (
                                                <span className="text-success">Kopyalandı!</span>
                                            ) : (
                                                <i className="ri-file-copy-2-line"></i>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <hr className="my-2" />
                            Sipariş numaranızı açıklama kısmına yazınız.
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}