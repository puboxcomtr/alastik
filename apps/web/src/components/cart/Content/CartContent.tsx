'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Tooltip } from "@mui/material";
import { resolveSiteFromHost } from '@/src/config/siteConfig';

import { getImageUrl } from '@/src/config/api';
import { buildProductUrl } from '@/src/config/routes';

// Context
import { useBrands } from '@/src/context/BrandsContext';

import { CartItem, CartContentProps } from '@/src/types/cart';

export default function CartContent({ items, onUpdateQuantity, onRemoveItem }: CartContentProps) {
    // Montaj bloğu: LJA'da Montaj Noktaları sayfasına, diğer sitede iletişime yönlenir
    const [isLja, setIsLja] = useState(false);
    useEffect(() => {
        setIsLja(resolveSiteFromHost(window.location.host) === 'lastikjantavm');
    }, []);

    // Montaj hizmeti: sepette uygun çapta lastik varsa adedi lastik adedine kilitlidir
    const isQuantityLocked = (item: CartItem) => {
        if (item.itemType !== 'montage' || !item.rimRange) return false;
        return items.some(t => t.itemType === 'tire' && t.rimSize !== null && t.rimSize !== undefined && t.rimSize >= item.rimRange!.min && t.rimSize <= item.rimRange!.max);
    };

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
                                                {item.montagePointLabel && (
                                                    <small className="d-block mb-1" style={{ color: '#8a8a8a' }}>
                                                        <i className="ri-map-pin-2-line me-1"></i>{item.montagePointLabel}
                                                    </small>
                                                )}
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

                                    {/* Adet — montaj hizmetinde lastik varsa adet lastik adedine kilitlidir */}
                                    <div className="col-6 col-md-3 mt-3 mt-md-0">
                                        <div className="d-flex align-items-center">
                                            <button
                                                className="btn btn-outline-secondary btn-sm"
                                                onClick={() => onUpdateQuantity(item.productKey, item.quantity - 1)}
                                                disabled={item.quantity <= 1 || isQuantityLocked(item)}
                                            >
                                                <i className="ri-subtract-line"></i>
                                            </button>
                                            <span className="mx-3 fw-medium">{item.quantity}</span>
                                            <button
                                                className="btn btn-outline-secondary btn-sm"
                                                onClick={() => onUpdateQuantity(item.productKey, item.quantity + 1)}
                                                disabled={isQuantityLocked(item)}
                                            >
                                                <i className="ri-add-line fs-6"></i>
                                            </button>
                                        </div>
                                        {isQuantityLocked(item) && (
                                            <small className="text-muted d-block mt-1">Adet lastik adedine göre belirlenir</small>
                                        )}
                                    </div>

                                    {/* Fiyat */}
                                    <div className="col-4 col-md-2 mt-3 mt-md-0 text-end">
                                        {item.originalPrice > item.unitPrice && (
                                            <small className="text-decoration-line-through text-muted fs-7">{formatPrice(item.originalPrice)} TL</small>
                                        )}
                                        <p className="mb-0 fw-bold text-primary fs-7">{item.unitPrice === 0 ? 'Ücretsiz' : `${formatPrice(item.unitPrice)} TL`}</p>
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
            {items.some(i => i.montagePointLabel) && (
                <div
                    className="d-flex align-items-center gap-3 mt-3 px-3 py-3 rounded-3"
                    style={{ backgroundColor: '#fff8e1', border: '1px solid #f0e3b0' }}
                >
                    <i className="ri-notification-3-line" style={{ fontSize: 22, color: '#b58900' }}></i>
                    <div className="small" style={{ color: '#6b5b1e' }}>
                        <span className="fw-semibold">Montaj bilgilendirmesi:</span>{' '}
                        Alışverişi tamamladıktan sonra montaj noktası bilgileri tarafınıza SMS veya e-posta ile gönderilecektir.
                    </div>
                </div>
            )}
            <div className="card mr-2 my-3 border-0" style={{ backgroundColor: '#1a1a1a', overflow: 'hidden' }}>
                <div className="card-body p-4">
                    <div className="row align-items-center g-3">
                        <div className="col">
                            <h6 className="text-white fw-bold mb-1">
                                Türkiye'nin 81 İlinde Montaj Hizmeti
                            </h6>
                            {isLja ? (
                                <>
                                    <p className="text-white-50 mb-0 small d-md-none">
                                        Anlaşmalı montaj noktalarımızı inceleyebilir, montaj hizmetini online satın alabilirsiniz.
                                    </p>
                                    <p className="text-white-50 mb-0 small d-none d-md-block">
                                        Türkiye'nin 81 ilindeki anlaşmalı montaj noktalarımızı inceleyebilir, size en yakın noktadan montaj hizmetini online satın alabilirsiniz.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p className="text-white-50 mb-0 small d-md-none">
                                        Ürününüzü teslim aldıktan sonra montaj işlemini dilediğiniz noktada gerçekleştirebilir...
                                    </p>
                                    <p className="text-white-50 mb-0 small d-none d-md-block">
                                        Ürününüzü teslim aldıktan sonra montaj işlemini dilediğiniz noktada gerçekleştirebilir veya bizimle iletişime geçerek Türkiye'nin 81 ilinde profesyonel montaj hizmetimizden faydalanabilirsiniz.
                                    </p>
                                </>
                            )}
                        </div>
                        <div className="col-12 col-md-auto">
                            {isLja ? (
                                <Link
                                    href="/montaj-noktalari"
                                    className="btn fw-semibold px-4 py-2 d-inline-flex align-items-center gap-2 text-white text-decoration-none">
                                    <i className="ri-map-pin-2-fill"></i>
                                    Montaj Noktaları
                                </Link>
                            ) : (
                                <Link
                                    href="/iletisim"
                                    className="btn fw-semibold px-4 py-2 d-inline-flex align-items-center gap-2 text-white text-decoration-none">
                                    <i className="ri-phone-fill"></i>
                                    İletişime Geç
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}