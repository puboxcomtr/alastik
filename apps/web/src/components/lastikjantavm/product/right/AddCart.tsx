// apps/web/src/components/product/right/Cart.tsx
"use client";
import React, { useState } from "react";
import { offerMontageAfterAdd } from '@/src/hooks/Cart/montageRedirect';
import { Grid, Divider, Tooltip } from "@mui/material";
import Image from 'next/image';
import Link from 'next/link';

import { Product } from '@/src/types/products';

import { useBrands } from '@/src/context/BrandsContext';
import { useCart } from '@/src/context/CartContext';
import { useFavourites } from '@/src/context/FavouritesContext';
import { useSettings } from '@/src/context/SettingsContext';
import { useDefinition } from '@/src/hooks/Theme/useDefinition';

import { getProductPrice, getDisplayPrice, getDeliveryDateRange, isLastik } from '@/src/hooks/Products/productHelpers';
import { checkPurchaseLimit, productToLimitCheckItem, clampQuantityToStock } from '@/src/hooks/Products/purchaseLimitHelpers';
import { toast } from 'react-toastify';

import { getImageUrl } from '@/src/config/api';

interface CartProps {
    product: Product;
}

// Panelden gelen yüzde değerini (ör. "5") orana çevirir; geçersiz/boş → 0
const toRate = (percent: unknown): number => {
    const n = Number(String(percent ?? '').replace(',', '.'));
    return Number.isFinite(n) && n > 0 && n < 100 ? n / 100 : 0;
};

export default function Cart({ product }: CartProps) {
    const deliveryInfo = getDeliveryDateRange(product);
    const { getBrand } = useBrands();
    const price = getProductPrice(product);
    const gosterim = getDisplayPrice(product, price);
    const [quantity, setQuantity] = useState(1);
    const [adding, setAdding] = useState(false);
    const { addToCart } = useCart();
    const { toggleFavourite, isFavourite } = useFavourites();
    const { definition } = useDefinition();
    const { theme } = useSettings();
    const getWhatsAppUrl = () => {
        const phone = definition?.companyInfo?.phone || '0539 825 71 01';
        const formatted = phone.replace(/\s+/g, '').replace(/^0/, '90');
        return `https://wa.me/${formatted}`;
    };
    const hasStock = product.diaData?.gercek_stok > 0;
    const isSecondHand = (product.diaData?.m_kategoriler || []).some(
        (k: any) => String(k?.kategori_aciklama_1 || '').startsWith('İkinci El')
    );
    // Havale ve Peşin Ödeme fiyatı kutusu: oranlar panelden (Tema > Genel) gelir.
    // İkinci El ürünlerde kendi oranı, sıfır lastiklerde sıfır lastik oranı; diğer ürünlerde gösterilmez.
    const pickupCashRate = isSecondHand
        ? toRate(theme?.pickupCashDiscountSecondHand)
        : isLastik(product) ? toRate(theme?.pickupCashDiscountNewTire) : 0;
    // Hizmetlerimiz (montaj, rot, sibop vb.) ürünlerinde taksit promosyonu ve
    // tahmini teslim tarihi gösterilmez (hizmet kargolanmaz, tek çekim uygulanır).
    const isHizmet = (product.diaData?.m_kategoriler || []).some(
        (k: any) => String(k?.kategori_aciklama_1 || '') === 'Hizmetlerimiz'
    );
    // Seçilen adetin toplamı üzerinden (adet değiştikçe güncellenir)
    const pickupCashValue = Math.round(gosterim.value * quantity * (1 - pickupCashRate) * 100) / 100;
    const handleAddToCart = async () => {
        if (adding) return;
        setAdding(true);

        try {
            const item = productToLimitCheckItem(product, quantity);
            const check = await checkPurchaseLimit([item]);

            if (!check.valid && check.violations.length > 0) {
                check.violations.forEach(v => {
                    toast.error(v.message);
                });
                setAdding(false);
                return;
            }

            const added = await addToCart(product._key, quantity);
            if (added) offerMontageAfterAdd(product);
        } catch (err) {
            console.error('Sepete ekleme hatası:', err);
            toast.error('Sepete eklenemedi');
        } finally {
            setAdding(false);
        }
    };
    const handleDecrease = () => {
        if (quantity > 1) setQuantity(quantity - 1);
    };
    const handleIncrease = () => {
        const { clamped, exceeded, maxStock } = clampQuantityToStock(product, quantity + 1);
        if (exceeded) {
            toast.warning(`En fazla ${maxStock} adet ekleyebilirsiniz`);
        }
        setQuantity(clamped);
    };
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value) || 1;
        const { clamped, exceeded, maxStock } = clampQuantityToStock(product, value);
        if (exceeded) {
            toast.warning(`En fazla ${maxStock} adet ekleyebilirsiniz`);
        }
        setQuantity(clamped);
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
                        {/* Marka gizle açıksa detay sayfasında marka gösterilmez */}
                        {product.customData?.hideBrand !== true && (brandLogo ? (
                            <Image
                                src={brandLogo}
                                alt={brandName || 'Marka'}
                                width={130}
                                height={62}
                                style={{ objectFit: 'contain' }}
                            />
                        ) : (
                            <span className="fw-medium fs-lg">{brandInfo?.name || brandName || 'Marka Yok'}</span>
                        ))}
                    </div>
                </Grid>
                {/* Add to Cart */}
                <Grid size={12}>
                    <div className="card bg-white rounded border-0 mt-3" style={{ boxShadow: '0 0 24px 0 rgba(0, 0, 0, .1)' }}>
                        <div className="card-body">
                            {/* Adet/fiyat ve Sepete Ekle mobilde gizlenir; alttaki sabit satın alma çubuğu kullanılır */}
                            <h5 className={hasStock ? 'card-title d-none d-md-block' : 'card-title'}>{hasStock ? 'Adet Seçimi' : 'Stok Bilgisi'}</h5>
                            {hasStock ? (
                                <>
                                    <div className='d-none d-md-block'>
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
                                                {gosterim.value.toLocaleString('tr-TR', {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2
                                                })} TL{gosterim.suffix}
                                            </span>
                                        </div>
                                    </div>
                                    {pickupCashRate > 0 && (
                                        <>
                                            <hr className="my-3" />
                                            <div className="rounded-3 border border-success-subtle bg-success-subtle p-3 mb-3">
                                                <div className="fw-bold fs-sm text-dark text-nowrap">Havale ve Peşin Ödemelerde</div>
                                                <div className="fw-bold fs-lg text-success text-nowrap mt-2 lh-sm">
                                                    {pickupCashValue.toLocaleString('tr-TR', {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2
                                                    })} TL{gosterim.suffix}
                                                </div>
                                                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-1">
                                                    <span className="fs-xs text-body-secondary">
                                                        %{(pickupCashRate * 100).toLocaleString('tr-TR')} İndirim Fırsatı
                                                    </span>
                                                    <span className="badge rounded-pill bg-success">Montaj Dahil</span>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                    <hr className="m-0 p-2" />
                                    </div>
                                    {/* Kampanyalar — hizmet ürünlerinde ödeme promosyonları gösterilmez */}
                                    {!isHizmet && (
                                    <>
                                    <div>
                                        <div className="d-flex align-items-center gap-1">
                                            <i className="ri-bank-card-fill text-black"></i>
                                            <p className='m-0 fw-bold text-black'>
                                                Peşin Fiyatına 3 Taksit
                                            </p>
                                        </div>
                                        <div className="d-flex align-items-center gap-1 mt-1">
                                            <p>
                                                Vade farksız 3 Taksit fırsatını kaçırma
                                            </p>
                                        </div>
                                    </div>
                                    <hr className="m-0 p-2" />
                                    </>
                                    )}
                                    <div>
                                        <div className="d-flex align-items-center gap-1">
                                            <i className="ri-bank-card-fill text-black"></i>
                                            <p className='m-0 fw-bold text-black'>
                                                Türkiye'nin 81 İlinde Montaj Hizmeti
                                            </p>
                                        </div>
                                        <div className="d-flex align-items-center gap-1 mt-1">
                                            <p>
                                                Montaj işlemi gerçekleştirmek için bizimle iletişime geçebilirsiniz.
                                            </p>
                                        </div>
                                    </div>
                                    <hr className="m-0 p-2 d-none d-md-block" />
                                    <div className='d-none d-md-flex'>
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
                                        <Tooltip title={isFavourite(product._key) ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}>
                                            <button
                                                type="button"
                                                className="btn btn-md animate-shake"
                                                onClick={() => toggleFavourite(product._key)}
                                                aria-label="Favorilere Ekle"
                                            >
                                                {isFavourite(product._key) ? (
                                                    <i className="ri-heart-fill text-danger" style={{ fontSize: '24px' }}></i>
                                                ) : (
                                                    <i className="ri-heart-add-line" style={{ fontSize: '24px' }}></i>
                                                )}
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