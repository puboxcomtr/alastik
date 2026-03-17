// apps/web/src/components/product/right/Cart.tsx
"use client";
import React, { useState } from "react";
import { Grid, Divider, Tooltip } from "@mui/material";
import Image from 'next/image';
import Link from 'next/link';

import { Product } from '@/src/types/products';

import { useBrands } from '@/src/context/BrandsContext';
import { useCart } from '@/src/context/CartContext';
import { useDefinition } from '@/src/hooks/Theme/useDefinition';

import { getProductPrice, getDeliveryDateRange } from '@/src/hooks/Products/productHelpers';

import { getImageUrl } from '@/src/config/api';

interface CartProps {
    product: Product;
}

export default function Cart({ product }: CartProps) {
    const deliveryInfo = getDeliveryDateRange(product);
    const { getBrand } = useBrands();
    const price = getProductPrice(product);
    const [quantity, setQuantity] = useState(1);
    const [adding, setAdding] = useState(false);
    const { addToCart } = useCart();
    const { definition } = useDefinition();
    const getWhatsAppUrl = () => {
        const phone = definition?.companyInfo?.phone || '0539 825 71 01';
        const formatted = phone.replace(/\s+/g, '').replace(/^0/, '90');
        return `https://wa.me/${formatted}`;
    };
    const hasStock = product.diaData?.gercek_stok > 0;
    const handleAddToCart = async () => {
        if (adding) return;
        setAdding(true);
        await addToCart(product._key, quantity);
        setAdding(false);
    };
    const handleDecrease = () => {
        if (quantity > 1) setQuantity(quantity - 1);
    };
    const handleIncrease = () => {
        setQuantity(quantity + 1);
    };
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value) || 1;
        if (value > 0) setQuantity(value);
    };

    const brandName = product.diaData.marka || '';
    const brandInfo = getBrand(brandName);
    const brandLogo = brandInfo?.logo && !brandInfo.logo.includes('gorsel-bulunamadi')
        ? getImageUrl(brandInfo.logo)
        : null;

    return (
        <>
            <Grid container>
                <Grid size={12}>
                    <div className='d-none d-md-flex justify-content-center'>
                        {/* Marka */}
                        {brandLogo ? (
                            <Image
                                src={brandLogo}
                                alt={brandName || 'Marka'}
                                width={190}
                                height={90}
                                style={{ objectFit: 'contain' }}
                            />
                        ) : (
                            <span className="fw-medium fs-lg">{brandName || 'Marka Yok'}</span>
                        )}
                    </div>
                </Grid>
                {/* Add to Cart */}
                <Grid size={12}>
                    <div className="card bg-white rounded border-0 mt-3" style={{ boxShadow: '0 0 24px 0 rgba(0, 0, 0, .1)' }}>
                        <div className="card-body">
                            <h5 className="card-title">{hasStock ? 'Adet Seçimi' : 'Stok Bilgisi'}</h5>
                            {hasStock ? (
                                <>
                                    <div className='d-flex justify-content-between align-items-center'>
                                        <div>
                                            <div className="count-input">
                                                <button
                                                    type="button"
                                                    className="btn btn-icon"
                                                    onClick={handleDecrease}
                                                    disabled={quantity <= 1}
                                                >
                                                    <i className="ci-minus"></i>
                                                </button>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    value={quantity}
                                                    onChange={handleChange}
                                                    min="1"
                                                />
                                                <button
                                                    type="button"
                                                    className="btn btn-icon"
                                                    onClick={handleIncrease}
                                                    aria-label="Increment quantity"
                                                >
                                                    <i className="ci-plus"></i>
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-muted fw-normal">
                                                x
                                            </span>
                                        </div>
                                        <div>
                                            <span className='fw-bold text-black'>
                                                {price.toLocaleString('tr-TR', {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2
                                                })} TL
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className='productshipping_info'>
                                            Belirtilen fiyat, kargo bedeli hariçtir. Toplam tutarı <span className="text-underline">sepet aşamasında görüntüleyebilirsiniz.</span>
                                        </p>
                                    </div>
                                    <hr className="m-0 p-2" />
                                    {/* Kargo Teslim Tarihi */}
                                    <div>
                                        <div className="d-flex align-items-center gap-1">
                                            <i className="ri-box-3-fill text-black"></i>
                                            <p className='m-0 fw-bold text-black'>
                                                Kargoya Teslim Tarihi
                                            </p>
                                        </div>
                                        <div className="d-flex align-items-center gap-1 mt-1">
                                            {deliveryInfo ? (
                                                <p className='badge text-success bg-success-subtle'>
                                                    Tahmini Teslim Tarihi {deliveryInfo.startDate} - {deliveryInfo.endDate}
                                                </p>
                                            ) : (
                                                <p className='badge text-muted bg-light'>
                                                    Teslimat bilgisi mevcut değil
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    {/* Kampanyalar */}
                                    <div>
                                        <div className="d-flex align-items-center gap-1">
                                            <i className="ri-bank-card-fill text-black"></i>
                                            <p className='m-0 fw-bold text-black'>
                                                Peşin Fiyatına 4 Taksit
                                            </p>
                                        </div>
                                        <div className="d-flex align-items-center gap-1 mt-1">
                                            <p>
                                                Vade farksız 4 Taksit fırsatını kaçırma
                                            </p>
                                        </div>
                                    </div>
                                    <hr className="m-0 p-2" />
                                    <div className='d-flex'>
                                        <Tooltip title="Sepete Ekle">
                                            <button
                                                type="button"
                                                className="btn btn-primary btn-md w-75"
                                                onClick={handleAddToCart}
                                                disabled={adding}
                                            >
                                                {adding ? 'Ekleniyor...' : 'Sepete Ekle'}
                                            </button>
                                        </Tooltip>
                                        <Tooltip title="Favorilere Ekle">
                                            <button type="button" className="btn btn-md animate-shake">
                                                <i className="ri-heart-add-line"
                                                    style={{
                                                        fontSize: '24px'
                                                    }}></i>
                                            </button>
                                        </Tooltip>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="text-center py-3">
                                        <i className="ri-error-warning-line text-danger" style={{ fontSize: '36px' }}></i>
                                        <p className="text-danger fw-semibold mt-2 mb-1">Bu ürün şu an stokta bulunmamaktadır.</p>
                                        <p className="text-muted fs-sm">Stok bilgisi almak için bizimle iletişime geçebilirsiniz.</p>
                                    </div>
                                    <hr className="m-0 p-2" />
                                    <Link href={getWhatsAppUrl()} target="_blank" className="btn btn-outline-success btn-md w-100">
                                        <i className="ri-whatsapp-line me-2"></i> Stok Durumunu Sorun
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </Grid>
            </Grid>
        </>
    );
}