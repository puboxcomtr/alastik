'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Tooltip } from "@mui/material";
import { toast } from 'react-toastify';
import { resolveSiteFromHost, getSiteBySlug, DEFAULT_SITE, SiteSlug } from '@/src/config/siteConfig';

import { getImageUrl } from '@/src/config/api';
import { buildProductUrl, ROUTES } from '@/src/config/routes';

import { useBrands } from '@/src/context/BrandsContext';

import { CartItem, CartContentProps } from '@/src/types/cart';

export default function CartContent({ items, onUpdateQuantity, onRemoveItem }: CartContentProps) {
    const [siteSlug, setSiteSlug] = useState<SiteSlug>(DEFAULT_SITE);
    const [siteResolved, setSiteResolved] = useState(false);
    useEffect(() => {
        setSiteSlug(resolveSiteFromHost(window.location.host));
        setSiteResolved(true);
    }, []);

    const accentColor = getSiteBySlug(siteSlug)?.theme.primary || '';
    const readableTextOn = (hex: string): string => {
        const value = hex.replace('#', '');
        if (value.length !== 6) return '#000';
        const r = parseInt(value.slice(0, 2), 16);
        const g = parseInt(value.slice(2, 4), 16);
        const b = parseInt(value.slice(4, 6), 16);
        return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? '#000' : '#fff';
    };
    const accentTextColor = readableTextOn(accentColor);

    const isServiceItem = (item: CartItem) =>
        item.itemType === 'montage' || item.itemType === 'service' || Boolean(item.montagePointLabel);

    const montageCap = (item: CartItem): number | null => {
        if (item.itemType !== 'montage' || !item.rimRange) return null;
        const count = items
            .filter(t => t.itemType === 'tire' && t.rimSize !== null && t.rimSize !== undefined && t.rimSize >= item.rimRange!.min && t.rimSize <= item.rimRange!.max)
            .reduce((sum, t) => sum + t.quantity, 0);
        return count > 0 ? count : null;
    };
    const handleIncrease = (item: CartItem) => {
        const cap = montageCap(item);
        if (cap !== null && item.quantity >= cap) {
            toast.warning(`Montaj adedi sepetinizdeki lastik adedini (${cap}) aşamaz.`);
            return;
        }
        onUpdateQuantity(item.productKey, item.quantity + 1);
    };

    const formatPrice = (price: number) => {
        return price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const vatExcludedLabel = (item: CartItem, gross: number): string | null => {
        const isMontageItem = item.itemType === 'montage' || item.itemType === 'service';
        if (!isMontageItem || item.priceDisplay !== 'haric' || gross <= 0) return null;
        const rate = item.kdvRate > 0 ? item.kdvRate : 20;
        const net = Math.round((gross / (1 + rate / 100)) * 100) / 100;
        return `${formatPrice(net)} TL + KDV`;
    };

    const displayAmount = (item: CartItem, gross: number): { value: number; suffix: string } => {
        const isMontageItem = item.itemType === 'montage' || item.itemType === 'service';
        if (isMontageItem || item.priceDisplay !== 'haric') return { value: gross, suffix: '' };
        const rate = item.kdvRate > 0 ? item.kdvRate : 20;
        return { value: Math.round((gross / (1 + rate / 100)) * 100) / 100, suffix: ' + KDV' };
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
                                    {!isServiceItem(item) && (
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
                                    )}

                                    <div className={isServiceItem(item) ? 'col-12 col-md-6' : 'col-9 col-md-4'}>
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
                                        {item.brandName && !isServiceItem(item) && (() => {
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

                                    <div className="col-6 col-md-3 mt-3 mt-md-0">
                                        <div className="d-inline-block">
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
                                                    onClick={() => handleIncrease(item)}
                                                >
                                                    <i className="ri-add-line fs-6"></i>
                                                </button>
                                            </div>
                                            {(item.itemType === 'montage' || item.itemType === 'service') && (
                                                <div className="text-center mt-1" style={{ fontSize: '0.72rem', color: '#9a9a9a', whiteSpace: 'nowrap' }}>
                                                    {vatExcludedLabel(item, item.unitPrice) ? (
                                                        <span>&times; {vatExcludedLabel(item, item.unitPrice)}</span>
                                                    ) : (
                                                        <span>
                                                            {item.unitPrice === 0
                                                                ? 'Ücretsiz'
                                                                : (() => {
                                                                    const birim = displayAmount(item, item.unitPrice);
                                                                    return `× ${formatPrice(birim.value)} TL${birim.suffix}`;
                                                                })()}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="col-4 col-md-2 mt-3 mt-md-0 text-end">
                                        {item.originalPrice > item.unitPrice && (
                                            <small className="text-decoration-line-through text-muted fs-7 d-block">
                                                {formatPrice(displayAmount(item, item.originalPrice * item.quantity).value)} TL
                                            </small>
                                        )}
                                        <p className="mb-0 fw-bold text-primary fs-7">
                                            {item.unitPrice === 0
                                                ? 'Ücretsiz'
                                                : (() => {
                                                    const satir = displayAmount(item, item.unitPrice * item.quantity);
                                                    return `${formatPrice(satir.value)} TL${satir.suffix}`;
                                                })()}
                                        </p>
                                    </div>

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
            {siteResolved && (
                <Link
                    href={ROUTES.MONTAGE_SELECT}
                    className="card mr-2 my-3 border-0 text-decoration-none d-block"
                    style={{ backgroundColor: '#1a1a1a', overflow: 'hidden' }}
                >
                    <div className="card-body p-4">
                        <div className="row align-items-center g-3">
                            <div className="col">
                                <h6 className="text-white fw-bold mb-1">
                                    Türkiye'nin 81 İlinde Montaj Hizmeti
                                </h6>
                                <p className="text-white-50 mb-0 small d-md-none">
                                    Anlaşmalı montaj noktalarımızı inceleyebilir, montaj hizmetini online satın alabilirsiniz.
                                </p>
                                <p className="text-white-50 mb-0 small d-none d-md-block">
                                    Türkiye'nin 81 ilindeki anlaşmalı montaj noktalarımızı inceleyebilir, size en yakın noktadan montaj hizmetini online satın alabilirsiniz.
                                </p>
                            </div>
                            <div className="col-12 col-md-auto">
                                <span className="btn btn-primary fw-semibold px-4 py-2 d-inline-flex align-items-center gap-2">
                                    <i className="ri-map-pin-2-fill"></i>
                                    Montaj Noktası Seç
                                </span>
                            </div>
                        </div>
                    </div>
                </Link>
            )}
            <style jsx>{`
                :global(.cart-cta-btn) {
                    background-color: #fff;
                    color: #000;
                    border: 0;
                    transition: background-color .15s ease, color .15s ease;
                }
                :global(.cart-cta-btn):hover,
                :global(.cart-cta-btn):focus,
                :global(.cart-cta-btn):active {
                    background-color: ${accentColor};
                    color: ${accentTextColor};
                }
            `}</style>
        </>
    );
}