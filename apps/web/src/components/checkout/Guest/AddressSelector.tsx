'use client';

import React from 'react';

interface Address {
    _id: string;
    addressName?: string;
    fullName?: string;
    companyName?: string;
    invoiceType: 'individual' | 'corporate';
    phone: string;
    cityName: string;
    districtName: string;
    neighborhoodName: string;
    street?: string;
    buildingNo?: string;
    apartmentNo?: string;
    isDefault: boolean;
}

interface AddressSelectorProps {
    addresses: Address[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    onAddNew: () => void;
}

export default function AddressSelector({ addresses, selectedId, onSelect, onAddNew }: AddressSelectorProps) {
    const getAddressPreview = (address: Address) => {
        const parts = [
            address.neighborhoodName,
            address.street,
            address.buildingNo && `No: ${address.buildingNo}`,
            address.apartmentNo && `D: ${address.apartmentNo}`,
            address.districtName,
            address.cityName
        ].filter(Boolean);
        return parts.join(', ');
    };

    return (
        <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Kayitli Adreslerim</h5>
                <button type="button" className="btn btn-sm btn-outline-primary" onClick={onAddNew}>
                    Yeni Adres Ekle
                </button>
            </div>
            <div className="card-body">
                {addresses.length === 0 ? (
                    <p className="text-muted">Kayitli adresiniz bulunmuyor.</p>
                ) : (
                    <div className="row">
                        {addresses.map(address => (
                            <div key={address._id} className="col-md-6 mb-3">
                                <div
                                    className={`card h-100 cursor-pointer ${selectedId === address._id ? 'border-primary' : ''}`}
                                    onClick={() => onSelect(address._id)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div className="card-body">
                                        <div className="form-check">
                                            <input
                                                type="radio"
                                                className="form-check-input"
                                                checked={selectedId === address._id}
                                                onChange={() => onSelect(address._id)}
                                            />
                                            <label className="form-check-label w-100">
                                                <div className="d-flex justify-content-between">
                                                    <strong>{address.addressName || 'Adres'}</strong>
                                                    {address.isDefault && (
                                                        <span className="badge bg-success">Varsayilan</span>
                                                    )}
                                                </div>
                                                <div className="mt-2 text-muted small">
                                                    <div>{address.invoiceType === 'individual' ? address.fullName : address.companyName}</div>
                                                    <div>{address.phone}</div>
                                                    <div className="mt-1">{getAddressPreview(address)}</div>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}