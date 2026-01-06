'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Tooltip } from "@mui/material";

// Context
import { useBrands } from '@/src/context/BrandsContext';

interface CartItem {
    productKey: string;
    productName: string;
    productImage: string | null;
    productSlug: string;
    brandName: string;
    quantity: number;
    unitPrice: number;
    originalPrice?: number;
    kdvRate: number;
}

interface CartContentProps {
    items: CartItem[];
    onUpdateQuantity: (productKey: string, quantity: number) => void;
    onRemoveItem: (productKey: string) => void;
}

export default function CartContent({ items, onUpdateQuantity, onRemoveItem }: CartContentProps) {

    const formatPrice = (price: number) => {
        return price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };
    const { getBrand } = useBrands();
    return (
        <div className="card border-0">
            <div className="card-body p-3">
                {items.map((item, index) => (
                    <div className='mb-3' key={item.productKey}>
                        <div className="p-2 border rounded">
                            <div className="row align-items-center">
                                {/* Resim */}
                                <div className="col-3 col-md-2">
                                    <Link href={`/urun/${item.productSlug}`}>
                                        {item.productImage ? (
                                            <Image
                                                src={item.productImage}
                                                alt={item.productName}
                                                width={120}
                                                height={120}
                                                style={{ objectFit: 'contain' }}
                                                className="rounded"
                                            />
                                        ) : (
                                            <div
                                                className="bg-light rounded d-flex align-items-center justify-content-center"
                                                style={{ width: 80, height: 80 }}
                                            >
                                                <i className="ri-image-line text-muted fs-4"></i>
                                            </div>
                                        )}
                                    </Link>
                                </div>

                                {/* Bilgiler */}
                                <div className="col-9 col-md-4">
                                    <Tooltip title="Ürünü İncele">
                                        <Link
                                            href={`/urun/${item.productSlug}`}
                                            className="text-decoration-none text-black"
                                        >
                                            <p className="mb-1 fw-medium">{item.productName}</p>
                                        </Link>
                                    </Tooltip>
                                    {item.brandName && (() => {
                                        const brandInfo = getBrand(item.brandName);
                                        const logoUrl = brandInfo?.logo;

                                        if (logoUrl && !logoUrl.includes('gorsel-bulunamadi')) {
                                            return (
                                                <Image
                                                    src={`https://api.alastik.com${logoUrl}`}
                                                    alt={item.brandName}
                                                    width={80}
                                                    height={30}
                                                    style={{ objectFit: 'contain' }}
                                                />
                                            );
                                        }
                                        return <small className="text-muted">{item.brandName}</small>;
                                    })()}
                                </div>

                                {/* Adet */}
                                <div className="col-6 col-md-3 mt-3 mt-md-0">
                                    <div className="d-flex align-items-center">
                                        <button
                                            className="btn btn-outline-secondary btn-sm"
                                            onClick={() => onUpdateQuantity(item.productKey, item.quantity - 1)}
                                            disabled={item.quantity <= 1}
                                        >
                                            <i className="ri-subtract-line"></i>
                                        </button>
                                        <span className="mx-3 fw-medium">{item.quantity}</span>
                                        <button
                                            className="btn btn-outline-secondary btn-sm"
                                            onClick={() => onUpdateQuantity(item.productKey, item.quantity + 1)}
                                        >
                                            <i className="ri-add-line fs-6"></i>
                                        </button>
                                    </div>
                                </div>

                                {/* Fiyat */}
                                <div className="col-4 col-md-2 mt-3 mt-md-0 text-end">
                                    {item.originalPrice > item.unitPrice && (
                                        <small className="text-decoration-line-through text-muted fs-7">{formatPrice(item.originalPrice)} TL</small>
                                    )}
                                    <p className="mb-0 fw-bold text-primary fs-7">{formatPrice(item.unitPrice)} TL</p>
                                </div>

                                {/* Sil */}
                                <div className="col-2 col-md-1 mt-3 mt-md-0 text-end">
                                    <Tooltip title="Ürünü Sepetten Kaldır">
                                        <button
                                            className="btn text-black p-0"
                                            onClick={() => onRemoveItem(item.productKey)}
                                        >
                                            <i className="ri-delete-bin-6-line fs-6"></i>
                                        </button>
                                    </Tooltip>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

    );
}