'use client';

import React from 'react';
import Link from 'next/link';
import { ROUTES } from '@/src/config/routes';

interface Address {
    _id?: string;
    addressName?: string;
    fullName?: string;
    phone?: string;
    street?: string;
    buildingNo?: string;
    floor?: string;
    apartmentNo?: string;
    neighborhoodName?: string;
    districtName?: string;
    cityName?: string;
    isDefault?: boolean;
    isShipping?: boolean;
    isBilling?: boolean;
    invoiceType?: string;
    companyName?: string;
    taxOffice?: string;
    taxNo?: string;
}

interface AddressContentProps {
    addresses: Address[];
}

export default function AddressContent({ addresses }: AddressContentProps) {
    const shippingAddress = addresses.find(a => a.isShipping) || addresses[0];
    const billingAddress = addresses.find(a => a.isBilling);
    const renderAddress = (addr: Address | undefined, label: string) => {
        if (!addr) return null;
        return (
            <ul className="list-unstyled fs-sm m-0">
                <li className="fw-medium">
                    <strong>{label} Adresi:</strong> {addr.addressName}
                    {addr.isDefault && <span className="badge bg-success-subtle text-success ms-2">Varsayılan</span>}
                </li>
                <li><strong>İsim Soyisim: </strong>{addr.fullName}</li>
                <li><strong>Adres:</strong> {addr.street} No:{addr.buildingNo}{addr.floor ? ` Kat:${addr.floor}` : ''}{addr.apartmentNo ? ` D:${addr.apartmentNo}` : ''} {addr.neighborhoodName}, {addr.districtName}, {addr.cityName}</li>
                <li><strong>Telefon:</strong> {addr.phone}</li>
                {addr.invoiceType === 'corporate' && addr.companyName && (
                    <li>{addr.companyName} - VD: {addr.taxOffice} / {addr.taxNo}</li>
                )}
            </ul>
        );
    };
    return (
        <div className="border-bottom py-4">
            <div className="nav flex-nowrap align-items-center justify-content-between pb-1 mb-3">
                <h2 className="h6 mb-0 text-primary">Adreslerim</h2>
                <Link className="nav-link text-decoration-underline p-0" href={ROUTES.ACCOUNT_ADDRESSES}>
                    {addresses.length > 0 ? 'Düzenle' : 'Adres Ekle'}
                </Link>
            </div>
            {addresses.length === 0 ? (
                <p className="fs-sm text-body-secondary m-0">Kayıtlı adresiniz bulunmuyor.</p>
            ) : (
                <div className="d-flex flex-column gap-3">
                    {renderAddress(shippingAddress, 'Teslimat')}
                    {billingAddress && billingAddress._id !== shippingAddress?._id && (
                        <>
                            <hr className="my-0" />
                            {renderAddress(billingAddress, 'Fatura')}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}