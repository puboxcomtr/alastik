'use client';

import React, { useState, useEffect } from 'react';
import { addressService } from '@/src/services/addressService';
import { Address } from '@/src/types/adress';
import AddressModal from '@/src/components/layout/Modals/account/AddressModal';

interface AddressContentProps {
    userId: string;
}

interface AddressGroup {
    billing: Address;
    shipping: Address | null;
}

export default function AddressContent({ userId }: AddressContentProps) {
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAddress, setEditingAddress] = useState<Address | null>(null);

    useEffect(() => {
        if (userId) fetchAddresses();
    }, [userId]);

    const fetchAddresses = async () => {
        setLoading(true);
        try {
            const data = await addressService.getUserAddresses(userId);
            if (data && Array.isArray(data)) {
                setAddresses(data.filter((a: Address) => a.isActive !== false));
            } else {
                setAddresses([]);
            }
        } catch (error) {
            console.error('Adres yükleme hatası:', error);
            setAddresses([]);
        } finally {
            setLoading(false);
        }
    };

    const getAddressGroups = (): AddressGroup[] => {
        const billingAddresses = addresses.filter(a => a.isBilling);
        const shippingAddresses = addresses.filter(a => a.isShipping && !a.isBilling);
        const usedShippingIds = new Set<string>();

        const groups: AddressGroup[] = billingAddresses.map(billing => {
            let shipping: Address | null = null;
            if (billing.linkedShippingAddressId) {
                shipping = shippingAddresses.find(s => s._id === billing.linkedShippingAddressId) || null;
                if (shipping) usedShippingIds.add(shipping._id);
            }
            return { billing, shipping };
        });

        // Bağımsız teslimat adresleri (faturaya bağlı olmayanlar)
        shippingAddresses
            .filter(s => !usedShippingIds.has(s._id))
            .forEach(s => {
                groups.push({ billing: s, shipping: null });
            });

        return groups;
    };

    const handleEditClick = (address: Address) => {
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

    const groups = getAddressGroups();

    return (
        <>
            <div className="my-3">
                <div className="nav flex-nowrap align-items-center justify-content-between pb-1 mb-3">
                    <h2 className="h6 mb-0 text-primary">Adreslerim</h2>
                </div>

                {loading ? (
                    <div className="text-center py-4">
                        <div className="spinner-border spinner-border-sm text-primary" role="status">
                            <span className="visually-hidden">Yükleniyor...</span>
                        </div>
                    </div>
                ) : groups.length === 0 ? (
                    <div className="text-center py-4">
                        Kayıtlı adresiniz bulunmamaktadır.
                    </div>
                ) : (
                    <div className="row row-cols-1 g-3">
                        {groups.map(group => (
                            <div key={group.billing._id} className="col">
                                <div className="card h-100">
                                    <div className="card-body">
                                        <div className="d-flex align-items-center justify-content-between mb-3">
                                            <div>
                                                <h6 className="mb-0">
                                                    {group.billing.addressName}
                                                    {group.billing.isDefault && (
                                                        <span className="badge text-bg-primary rounded-pill ms-2">Varsayılan</span>
                                                    )}
                                                </h6>
                                            </div>
                                            <button
                                                type="button"
                                                className="btn text-black text-decoration-underline p-0 small"
                                                onClick={() => handleEditClick(group.billing)}
                                            >
                                                Düzenle
                                            </button>
                                        </div>
                                        {/* Teslimat Adresi */}
                                        {group.shipping && (
                                            <div className="pt-3 border-top">
                                                <span className="text-black d-flex gap-1 align-items-center mb-2">
                                                    <i className="ri-map-pin-line fw-medium"></i>
                                                    <span className='fw-semibold small'>Teslimat Adresi</span>
                                                </span>
                                                <ul className="list-unstyled fs-sm">
                                                    <li>{group.shipping.fullName || group.shipping.companyName}</li>
                                                    <li>{formatAddress(group.shipping)}</li>
                                                </ul>
                                            </div>
                                        )}
                                        {/* Fatura + Teslimat aynı adresse */}
                                        {!group.shipping && group.billing.isShipping && group.billing.isBilling && (
                                            <div className="pt-3 border-top">
                                                <span className="text-black d-flex gap-1 align-items-center mb-2">
                                                    <i className="ri-map-pin-line fw-medium"></i>
                                                    <span className='fw-semibold small'>Teslimat Adresi</span>
                                                </span>
                                                <ul className="list-unstyled fs-sm">
                                                    <li>{group.billing.fullName || group.billing.companyName}</li>
                                                    <li>{formatAddress(group.billing)}</li>
                                                </ul>
                                            </div>
                                        )}
                                        {/* Fatura Adresi */}
                                        {group.billing.isBilling && (
                                            <div className="mb-3">
                                                <span className="text-black d-flex gap-1 align-items-center my-2">
                                                    <i className="ri-file-info-line fw-medium"></i>
                                                    <span className='fw-semibold small'>Fatura Adresi</span>
                                                </span>
                                                <ul className="list-unstyled fs-sm ">
                                                    <li>{formatAddress(group.billing)}</li>
                                                    <li>
                                                        {group.billing.taxOffice && group.billing.taxNo && (
                                                            <span>
                                                                <strong>{group.billing.companyName} - VD: {group.billing.taxOffice} / {group.billing.taxNo}</strong>
                                                            </span>
                                                        )}
                                                    </li>
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div className='nav'>
                <button
                    className="btn btn-linknav-link animate-underline fs-base px-0"
                    onClick={handleAddNewClick}
                >
                    <i className='ci-plus fs-lg ms-n1 me-2'></i>
                    Yeni Adres Ekle
                </button>
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