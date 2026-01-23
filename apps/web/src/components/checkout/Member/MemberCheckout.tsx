'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/hooks/Theme/useAuth';
import { addressService } from '@/src/services/addressService';
import { Address } from '@/src/types/adress';
import AddressModal from '@/src/components/layout/Modals/account/AddressModal';

interface MemberCheckoutProps {
    onAddressSelect: (billingId: string, shippingId?: string) => void;
    loading?: boolean;
}

export default function MemberCheckout({ onAddressSelect, loading }: MemberCheckoutProps) {
    const { user } = useAuth();
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [loadingAddresses, setLoadingAddresses] = useState(true);
    const [selectedAddressId, setSelectedAddressId] = useState<string>('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAddress, setEditingAddress] = useState<Address | null>(null);

    useEffect(() => {
        if (user?.id) {
            fetchAddresses();
        }
    }, [user]);

    const fetchAddresses = async () => {
        if (!user?.id) return;

        setLoadingAddresses(true);
        try {
            const data = await addressService.getUserAddresses(user.id);

            if (!data || !Array.isArray(data)) {
                setAddresses([]);
                setLoadingAddresses(false);
                return;
            }
            const billingAddresses = data.filter((a: Address) =>
                (a.isActive !== false) && (a.isBilling !== false)
            );
            setAddresses(billingAddresses);

            const defaultAddr = billingAddresses.find((a: Address) => a.isDefault);
            if (defaultAddr) {
                setSelectedAddressId(defaultAddr._id);
                onAddressSelect(defaultAddr._id, defaultAddr.linkedShippingAddressId || undefined);
            } else if (billingAddresses.length > 0) {
                setSelectedAddressId(billingAddresses[0]._id);
                onAddressSelect(billingAddresses[0]._id, billingAddresses[0].linkedShippingAddressId || undefined);
            }
        } catch (error) {
            console.error('Adres yükleme hatası:', error);
            setAddresses([]);
        } finally {
            setLoadingAddresses(false);
        }
    };

    const handleAddressSelect = (address: Address) => {
        setSelectedAddressId(address._id);
        onAddressSelect(address._id, address.linkedShippingAddressId || undefined);
    };

    const handleEditClick = (e: React.MouseEvent, address: Address) => {
        e.stopPropagation();
        setEditingAddress(address);
        setIsModalOpen(true);
    };

    const handleAddNewClick = () => {
        setEditingAddress(null);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setEditingAddress(null);
    };

    const handleModalSuccess = () => {
        fetchAddresses();
    };

    const formatAddress = (addr: Address) => {
        const parts = [
            addr.neighborhoodName,
            addr.street,
            addr.buildingNo && `No: ${addr.buildingNo}`,
            addr.apartmentNo && `D: ${addr.apartmentNo}`,
            addr.districtName,
            addr.cityName
        ].filter(Boolean);
        return parts.join(', ');
    };

    if (loadingAddresses) {
        return (
            <div className="card border-0">
                <div className="card-body text-center py-5">
                    <div className="spinner-border spinner-border-sm text-primary" role="status">
                        <span className="visually-hidden">Yükleniyor...</span>
                    </div>
                    <p className="mt-2 mb-0 text-muted">Adresler yükleniyor...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="card border-0">
                <div className="card-body py-0 px-0">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h5 className="mb-0">Kayıtlı Adreslerim</h5>
                        <button
                            className="btn btn-link text-primary p-0 text-decoration-underline"
                            onClick={handleAddNewClick}
                        >
                            Yeni Adres Ekle
                        </button>
                    </div>

                    {addresses.length === 0 ? (
                        <div className="alert alert-secondary">
                            Kayıtlı adresiniz bulunmuyor. Lütfen yeni adres ekleyin.
                        </div>
                    ) : (
                        <div className="row">
                            {addresses.map(addr => (
                                <div key={addr._id} className="col-md-6 mb-3">
                                    <div
                                        className={`form-control cursor-pointer py-3 h-100 ${selectedAddressId === addr._id ? 'border-primary border-2' : ''}`}
                                        onClick={() => handleAddressSelect(addr)}
                                    >
                                        <div className="d-flex align-items-center justify-content-between mb-2">
                                            <div className="d-flex align-items-center w-100 gap-2">
                                                <input
                                                    type="radio"
                                                    className="form-check-input m-0"
                                                    name="selectedAddress"
                                                    checked={selectedAddressId === addr._id}
                                                    onChange={() => handleAddressSelect(addr)}
                                                />
                                                <h6 className="mb-0 d-block w-100">{addr.addressName}</h6>
                                                {addr.isDefault && (
                                                    <span className="badge text-bg-primary rounded-pill">Varsayılan</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="ps-4">
                                            <ul className="list-unstyled fs-sm m-0 text-muted">
                                                <li><strong>{addr.fullName || addr.companyName}</strong></li>
                                                <li>{formatAddress(addr)}</li>
                                                <li>{addr.phone}</li>
                                            </ul>
                                            <button
                                                type="button"
                                                className="btn text-decoration-underline p-0 my-2 small"
                                                onClick={(e) => handleEditClick(e, addr)}
                                            >
                                                Düzenle
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <AddressModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                onSuccess={handleModalSuccess}
                address={editingAddress}
            />
        </>
    );
}