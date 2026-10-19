import React from 'react'
import Link from 'next/link'

import { useState, useEffect } from 'react';
import { paymentService, BankAccount } from '@/src/services/paymentService';
import { Tooltip } from '@mui/material';
import { ROUTES } from '@/src/config/routes';
import { Order, AddressSnapshot, OrderSummaryProps } from '@/src/types/order';

function OrderSummary({ order }: OrderSummaryProps) {
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

    useEffect(() => {
        if (order.payment.method === 'bank_transfer') {
            paymentService.getBankAccounts().then(setBankAccounts);
        }
    }, [order.payment.method]);
    const [copiedIban, setCopiedIban] = useState<string | null>(null);
    const [copiedOrderNumber, setCopiedOrderNumber] = useState(false);

    const billing = order.billingSnapshot;
    const shipping = order.shippingSnapshot;
    const member = order.memberSnapshot;

    const isSameAddress = !shipping ||
        (billing?.neighborhoodName === shipping?.neighborhoodName &&
            billing?.street === shipping?.street &&
            billing?.buildingNo === shipping?.buildingNo);

    const recipientName = isSameAddress
        ? `${member?.firstName || ''} ${member?.lastName || ''}`.trim()
        : shipping?.fullName;

    const formatAddress = (addr: AddressSnapshot | null | undefined) => {
        if (!addr) return '-';
        return `${addr.neighborhoodName}, ${addr.street} No:${addr.buildingNo}${addr.floor ? ` Kat:${addr.floor}` : ''}${addr.apartmentNo ? ` D:${addr.apartmentNo}` : ''} ${addr.districtName}/${addr.cityName}`;
    };

    const paymentMethodText = order.payment.method === 'bank_transfer' ? 'Banka Havalesi' : 'Kredi Kartı';

    const copyIban = (iban: string) => {
        navigator.clipboard.writeText(iban);
        setCopiedIban(iban);
        setTimeout(() => setCopiedIban(null), 2000);
    };
    const copyOrderNumber = () => {
        navigator.clipboard.writeText(order.orderNumber);
        setCopiedOrderNumber(true);
        setTimeout(() => setCopiedOrderNumber(false), 2000);
    };

    return (
        <div className='py-4'>
            <div className="d-flex align-items-sm-center border-bottom pb-3 pb-md-4">
                <div className="d-flex align-items-center justify-content-center bg-success text-white rounded-circle flex-shrink-0">
                    <i className="ci-check fs-3 p-2"></i>
                </div>
                <div className="w-100 ps-3">
                    <div className="fs-sm mb-1">Sipariş Numarası: #{order.orderNumber}</div>
                    <div className="d-sm-flex align-items-center">
                        <h1 className="h4 mb-0 me-3">Siparişiniz Bize Ulaştı.</h1>
                        <div className="nav mt-2 mt-sm-0 ms-auto">
                            <Link className="nav-link text-decoration-underline p-0" href={ROUTES.ACCOUNT_ORDERS}>
                                Sipariş Takip
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <div className="d-flex flex-column gap-4 pt-3 mt-3">
                <div>
                    <h3 className="h6 mb-2">Alıcı Adı Soyadı</h3>
                    <p className="fs-sm mb-0">{recipientName || '-'}</p>
                </div>

                {isSameAddress ? (
                    <div>
                        <h3 className="h6 mb-2">Adres</h3>
                        <p className="fs-sm mb-0">{formatAddress(billing)}</p>
                        {billing?.invoiceType === 'corporate' && billing?.companyName && (
                            <p className="fs-sm text-muted mb-0 mt-1">
                                {billing.companyName} - VN: {billing.taxNo}
                            </p>
                        )}
                    </div>
                ) : (
                    <div className='row'>
                        <div className="col-lg-6 mb-3 mb-lg-0">
                            <h3 className="h6 mb-2">Teslimat Adresi</h3>
                            <p className="fs-sm mb-0">{formatAddress(shipping)}</p>
                        </div>
                        <div className="col-lg-6">
                            <h3 className="h6 mb-2">Fatura Adresi</h3>
                            <p className="fs-sm mb-0">{formatAddress(billing)}</p>
                            {billing?.invoiceType === 'corporate' && (
                                <p className="fs-sm text-muted mb-0 mt-1">
                                    {billing.companyName} - VN: {billing.taxNo}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                <div className='row'>
                    <div className="col-lg-6 mb-3 mb-lg-0">
                        <h3 className="h6 mb-2">Ödeme Yöntemi</h3>
                        <p className="fs-sm mb-0">{paymentMethodText}</p>
                    </div>
                    <div className="col-lg-6">
                        <h3 className="h6 mb-2">Toplam Tutar</h3>
                        <p className="fs-sm mb-0 fw-bold">{order.pricing.total.toLocaleString('tr-TR')} TL</p>
                    </div>
                </div>

                {order.payment.method === 'bank_transfer' && bankAccounts.length > 0 && (
                    <div className="border p-3 rounded">
                        <h3 className="h6 border-bottom pb-3 mb-3">Banka Hesap Bilgileri</h3>
                        {bankAccounts.map((bank, index) => (
                            <div key={bank._id} className={index > 0 ? 'mt-3 pt-3 border-top' : ''}>
                                <div className="row fs-sm">
                                    <div className="col-sm-3 fw-bold">Banka:</div>
                                    <div className="col-sm-9">{bank.name}</div>
                                </div>
                                <div className="row fs-sm mt-1">
                                    <div className="col-sm-3 fw-bold">Hesap Sahibi:</div>
                                    <div className="col-sm-9">{bank.accountName}</div>
                                </div>
                                <div className="row fs-sm mt-1">
                                    <div className="col-sm-3 fw-bold">IBAN:</div>
                                    <div className="col-sm-9 d-flex align-items-center gap-2">
                                        <span>{bank.iban}</span>
                                        <Tooltip title="IBAN Kopyala">
                                            <button
                                                type="button"
                                                className="btn btn-link p-0 text-muted"
                                                onClick={() => copyIban(bank.iban)}
                                            >
                                                {copiedIban === bank.iban ? (
                                                    <span className="text-success small">Kopyalandı!</span>
                                                ) : (
                                                    <i className="ri-file-copy-2-line"></i>
                                                )}
                                            </button>
                                        </Tooltip>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div className="row fs-sm mt-3 pt-3 border-top">
                            <div className="col-sm-3 fw-bold">Açıklama:</div>
                            <div className="col-sm-9 d-flex align-items-center gap-2">
                                <span className="text-decoration-underline">{order.orderNumber}</span>
                                <Tooltip title="Sipariş No Kopyala">
                                    <button
                                        type="button"
                                        className="btn btn-link p-0 text-muted"
                                        onClick={copyOrderNumber}
                                    >
                                        {copiedOrderNumber ? (
                                            <span className="text-success small">Kopyalandı!</span>
                                        ) : (
                                            <i className="ri-file-copy-2-line"></i>
                                        )}
                                    </button>
                                </Tooltip>
                            </div>
                        </div>
                        <p className="fs-sm mb-0 text-muted mt-3">
                            Havale açıklamasına <strong>sipariş numaranızı</strong> yazmayı unutmayın. Aksi taktirde sipariş işleme alınmayacaktır.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default OrderSummary