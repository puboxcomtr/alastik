'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Tooltip } from "@mui/material";

import { getImageUrl } from '@/src/config/api';
import { buildProductUrl } from '@/src/config/routes';

// Context
import { useBrands } from '@/src/context/BrandsContext';

import { CartItem, CartContentProps } from '@/src/types/cart';

export default function CartContent({ items, onUpdateQuantity, onRemoveItem }: CartContentProps) {

    const formatPrice = (price: number) => {
        return price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };
    const { getBrand } = useBrands();
    return (
        <>
            <div className="card mr-2">
                <div className="card-body">
                    {items.map((item, index) => (
                        <div className='mb-3' key={item.productKey}>
                            <div className="p-2 border-bottom rounded">
                                <div className="row align-items-center">
                                    {/* Resim */}
                                    <div className="col-3 col-md-2">
                                        <Link href={buildProductUrl(item.productSlug)}>
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
                                                        src={getImageUrl(logoUrl)}
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
            <div className="card mr-2 my-3 border-0" style={{ backgroundColor: '#1a1a1a', overflow: 'hidden' }}>
                <div className="card-body p-4">
                    <div className="row align-items-center g-3">
                        <div className="col">
                            <h6 className="text-white fw-bold mb-1">
                                Türkiye'nin 81 İlinde Montaj Hizmeti
                            </h6>
                            <p className="text-white-50 mb-0 small d-md-none">
                                Ürününüzü teslim aldıktan sonra montaj işlemini dilediğiniz noktada gerçekleştirebilir...
                            </p>
                            <p className="text-white-50 mb-0 small d-none d-md-block">
                                Ürününüzü teslim aldıktan sonra montaj işlemini dilediğiniz noktada gerçekleştirebilir veya bizimle iletişime geçerek Türkiye'nin 81 ilinde profesyonel montaj hizmetimizden faydalanabilirsiniz.
                            </p>
                        </div>
                        <div className="col-12 col-md-auto">
                            <Link
                                href="/iletisim"
                                className="btn fw-semibold px-4 py-2 d-inline-flex align-items-center gap-2 text-white text-decoration-none">
                                <i className="ri-phone-fill"></i>
                                İletişime Geç
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}