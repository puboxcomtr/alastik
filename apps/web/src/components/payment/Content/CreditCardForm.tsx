'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

interface CardInfo {
    bin: string;
    cardType: string;
    isDebitCard: boolean;
    isCreditCard: boolean;
    brand: string;
    cardName: string;
    program: string;
    isBusinessCard: boolean;
}

interface Installment {
    installment: number;
    vPosId: number;
    vPosName: string;
    commRate: number;
}

interface BinResponse {
    success: boolean;
    cardInfo?: CardInfo;
    installments?: Installment[];
    hasInstallment?: boolean;
    message?: string;
}

interface CreditCardFormProps {
    onCardDataChange: (data: CardFormData | null) => void;
    totalAmount: number;
}

export interface CardFormData {
    cardNumber: string;
    cardHolderName: string;
    expMonth: string;
    expYear: string;
    cvc: string;
    installment: number;
    vPosId: number;
    isValid: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082';

export default function CreditCardForm({ onCardDataChange, totalAmount }: CreditCardFormProps) {
    const [cardNumber, setCardNumber] = useState('');
    const [cardHolderName, setCardHolderName] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvc, setCvc] = useState('');
    const [selectedInstallment, setSelectedInstallment] = useState<number>(1);
    const [selectedVPosId, setSelectedVPosId] = useState<number>(0);

    const [cardInfo, setCardInfo] = useState<CardInfo | null>(null);
    const [installments, setInstallments] = useState<Installment[]>([]);
    const [loading, setLoading] = useState(false);
    const [binChecked, setBinChecked] = useState(false);

    // Kart numarası formatla
    const formatCardNumber = (value: string) => {
        const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        const matches = v.match(/\d{4,16}/g);
        const match = (matches && matches[0]) || '';
        const parts = [];
        for (let i = 0, len = match.length; i < len; i += 4) {
            parts.push(match.substring(i, i + 4));
        }
        return parts.length ? parts.join(' ') : v;
    };

    // Son kullanma tarihi formatla
    const formatExpiry = (value: string) => {
        const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        if (v.length >= 2) {
            return v.substring(0, 2) + '/' + v.substring(2, 4);
        }
        return v;
    };

    // BIN kontrolü (ilk 6 hane)
    useEffect(() => {
        const cleanNumber = cardNumber.replace(/\s/g, '');

        if (cleanNumber.length >= 6 && !binChecked) {
            const bin = cleanNumber.substring(0, 6);
            checkBin(bin);
        } else if (cleanNumber.length < 6) {
            setBinChecked(false);
            setCardInfo(null);
            setInstallments([]);
            setSelectedInstallment(1);
            setSelectedVPosId(0);
        }
    }, [cardNumber, binChecked]);

    // BIN sorgula
    const checkBin = async (bin: string) => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/web/payments/netahsilat/bin/${bin}`);
            const data: BinResponse = await response.json();

            if (data.success && data.cardInfo) {
                setCardInfo(data.cardInfo);
                setBinChecked(true);

                if (data.cardInfo.isDebitCard) {
                    setInstallments([]);
                    setSelectedInstallment(1);
                    setSelectedVPosId(0);
                    toast.info('Banka kartı ile sadece tek çekim yapılabilir');
                } else if (data.hasInstallment && data.installments) {
                    setInstallments(data.installments);
                    if (data.installments.length > 0) {
                        setSelectedInstallment(data.installments[0].installment);
                        setSelectedVPosId(data.installments[0].vPosId);
                    }
                } else {
                    setInstallments([]);
                }
            } else {
                toast.error(data.message || 'Kart bilgisi alınamadı');
            }
        } catch (error) {
            console.error('BIN kontrol hatası:', error);
            toast.error('Kart doğrulama hatası');
        } finally {
            setLoading(false);
        }
    };

    // Form validasyonu ve data güncelleme
    useEffect(() => {
        const cleanNumber = cardNumber.replace(/\s/g, '');
        const [expMonth, expYear] = expiry.split('/');

        const isValid =
            cleanNumber.length === 16 &&
            cardHolderName.trim().length >= 3 &&
            expiry.length === 5 &&
            cvc.length >= 3 &&
            binChecked &&
            (cardInfo?.isDebitCard || selectedInstallment >= 1)

        if (isValid && cardInfo) {
            onCardDataChange({
                cardNumber: cleanNumber,
                cardHolderName: cardHolderName.trim(),
                expMonth,
                expYear: expYear.length === 2 ? '20' + expYear : expYear,
                cvc,
                installment: cardInfo.isDebitCard ? 1 : selectedInstallment,
                vPosId: selectedVPosId,
                isValid: true
            });
        } else {
            onCardDataChange(null);
        }
    }, [cardNumber, cardHolderName, expiry, cvc, selectedInstallment, selectedVPosId, binChecked, cardInfo]);

    // Taksit seçimi
    const handleInstallmentSelect = (inst: Installment) => {
        setSelectedInstallment(inst.installment);
        setSelectedVPosId(inst.vPosId);
    };

    // Taksitli tutar hesapla (mevcut fonksiyonu güncelle)
    const calculateInstallmentAmount = (installment: number): string => {
        return formatCurrency(totalAmount / installment);
    };

    // Para formatı helper fonksiyonu (component dışına ekle)
    const formatCurrency = (amount: number): string => {
        return new Intl.NumberFormat('tr-TR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    };

    return (
        <div className="p-3 bg-white">
            <div className="row g-3">
                {/* Kart Üzerindeki İsim */}
                <div className="col-12">
                    <label className="form-label">Kart Üzerindeki İsim Soyisim <span className="text-danger">*</span> </label>
                    <div className='position-relative'>
                        <input
                            type="text"
                            className="form-control form-control-lg form-icon-end"
                            placeholder="Lütfen İsim ve Soyisim Giriniz"
                            value={cardHolderName}
                            style={{
                                borderRadius: '0.375rem',
                                border: '1px solid black',
                                padding: '0.75rem'
                            }}
                            onChange={(e) => setCardHolderName(e.target.value)}
                        />
                        <span className='position-absolute d-flex top-50 end-0 translate-middle-y fs-5 text-body-tertiary me-3'>
                            <i className="ri-user-line"></i>
                        </span>
                    </div>
                </div>
                {/* Kart Numarası */}
                <div className="col-12">
                    <label className="form-label">Kart Numarası <span className="text-danger">*</span> </label>
                    <div className="position-relative">
                        <input
                            type="text"
                            className="form-control form-control-lg form-icon-end"
                            placeholder="**** **** **** ****"
                            value={cardNumber}
                            style={{
                                borderRadius: '0.375rem',
                                border: '1px solid black',
                                padding: '0.75rem'
                            }}
                            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                            maxLength={19}
                        />
                        <span className='position-absolute d-flex top-50 end-0 translate-middle-y fs-5 text-body-tertiary me-3'>
                            <i className="ri-bank-card-line"></i>
                        </span>
                    </div>
                </div>

                {/* Son Kullanma ve CVV */}
                <div className="col-md-6">
                    <label className="form-label small">Son Kullanma Tarihi <span className="text-danger">*</span> </label>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="AA/YY"
                        style={{
                            borderRadius: '0.375rem',
                            border: '1px solid black',
                            padding: '0.75rem'
                        }}
                        value={expiry}
                        onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                        maxLength={5}
                    />
                </div>
                <div className="col-md-6">
                    <label className="form-label small">CVV <span className="text-danger">*</span></label>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="***"
                        style={{
                            borderRadius: '0.375rem',
                            border: '1px solid black',
                            padding: '0.75rem'
                        }}
                        value={cvc}
                        onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').substring(0, 4))}
                        maxLength={4}
                    />
                </div>
                {/* Taksit Seçenekleri - JSX */}
                {cardInfo && cardInfo.isCreditCard && !cardInfo.isDebitCard && installments.length > 0 && (
                    <div className="col-12">
                        <hr />
                        <h6>Taksit Seçenekleri</h6>
                        <div className="d-flex flex-column gap-2">
                            {installments.map((inst) => {
                                const isSelected = selectedInstallment === inst.installment;
                                return (
                                    <div
                                        key={inst.installment}
                                        onClick={() => handleInstallmentSelect(inst)}
                                        className={`d-flex align-items-center justify-content-between p-3 rounded-3 border ${isSelected ? 'border-primary border-1' : 'border-secondary-subtle'}`}
                                        style={{
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <div className="d-flex align-items-center gap-3">
                                            <div
                                                className={`d-flex align-items-center justify-content-center rounded-circle ${isSelected ? 'bg-primary' : 'border border-secondary'}`}
                                                style={{ width: '22px', height: '22px' }}
                                            >
                                                {isSelected && (
                                                    <i className="ri-check-line text-white" style={{ fontSize: '14px' }}></i>
                                                )}
                                            </div>
                                            <div>
                                                <span className={`fw-semibold ${isSelected ? 'text-primary' : ''}`}>
                                                    {inst.installment === 1 ? 'Tek Çekim' : `${inst.installment} Taksit`}
                                                </span>
                                                {inst.installment > 1 && (
                                                    <small className="text-muted d-block">
                                                        Aylık {calculateInstallmentAmount(inst.installment)} TL
                                                    </small>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-end">
                                            <span className={`fw-bold ${isSelected ? 'text-primary' : ''}`}>
                                                {formatCurrency(totalAmount)} TL
                                            </span>
                                            {inst.commRate > 0 && (
                                                <small className="text-muted d-block">
                                                    +%{inst.commRate} komisyon
                                                </small>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                {/* Banka Kartı Uyarısı */}
                {cardInfo && cardInfo.isDebitCard && (
                    <div className="col-12">
                        <div className="alert alert-info mb-0 small">
                            Banka kartı ile sadece tek çekim yapılabilir. Tek çekim seçeneği yakın zamanda aktif olacaktır.
                        </div>
                    </div>
                )}

                {/* Taksit Yok Uyarısı */}
                {cardInfo && cardInfo.isCreditCard && !cardInfo.isDebitCard && installments.length === 0 && (
                    <div className="col-12">
                        <div className="alert alert-warning mb-0 small">
                            Bu kart için taksit seçeneği bulunmamaktadır.
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}