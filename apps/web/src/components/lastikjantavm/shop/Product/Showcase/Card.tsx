'use client';

import Link from "next/link";
import { useState } from "react";
import Tooltip from '@mui/material/Tooltip';
import Rating from '@mui/material/Rating';
import { Container } from "react-bootstrap"
import Dropdown from "react-bootstrap/Dropdown";
import Image from 'next/image';

import { useTranslations } from '@/src/hooks/Theme/useTranslations';
import { ProductCardProps } from '@src/types/products';
import { useSettings } from '@src/context/SettingsContext';
import { useBrands } from '@/src/context/BrandsContext';
import { useCart } from '@/src/context/CartContext';
import { useFavourites } from '@/src/context/FavouritesContext';
import { useDefinition } from '@/src/hooks/Theme/useDefinition';

import {
    getProductUrl,
    getProductPrice,
    getDisplayPrice,
    getProductOriginalPrice,
    hasProductDiscount,
    getProductImage,
    getProductStockCode,
    getProductFeatures,
    getProductSeason,
    isJant,
    isSetLastik,
    getProductFeature
} from '@src/hooks/Products/productHelpers';

import { checkPurchaseLimit, productToLimitCheckItem } from '@src/hooks/Products/purchaseLimitHelpers';
import { toast } from 'react-toastify';

export default function ProductCard({ product }: ProductCardProps) {
    const [adding, setAdding] = useState(false);
    const { addToCart } = useCart();
    const { toggleFavourite, isFavourite } = useFavourites();
    const { definition } = useDefinition();
    const getWhatsAppUrl = () => {
        const phone = definition?.companyInfo?.phone || '0539 825 71 01';
        const formatted = phone.replace(/\s+/g, '').replace(/^0/, '90');
        return `https://wa.me/${formatted}`;
    };
    const handleAddToCart = async () => {
        if (adding) return;
        setAdding(true);

        try {
            const item = productToLimitCheckItem(product, 1);
            const check = await checkPurchaseLimit([item]);
            if (!check.valid && check.violations.length > 0) {
                check.violations.forEach(v => toast.error(v.message));
                setAdding(false);
                return;
            }

            await addToCart(product._key, 1);
        } catch (err) {
            console.error('Sepete ekleme hatası:', err);
            toast.error('Sepete eklenemedi');
        } finally {
            setAdding(false);
        }
    };
    const season = getProductSeason(product);
    const { theme } = useSettings();
    const { t } = useTranslations('general');
    const { getBrand } = useBrands();

    const productUrl = getProductUrl(product);
    const price = getProductPrice(product);
    const gosterim = getDisplayPrice(product, price);
    const originalPrice = getProductOriginalPrice(product);
    const hasDiscount = hasProductDiscount(product);
    const imageUrl = getProductImage(product, theme.defaultCatalogImage);
    const stockCode = getProductStockCode(product, 'lastikjantavm');

    // Marka bilgisini context'ten al
    const brandName = product.diaData.marka || '';
    const brandInfo = getBrand(brandName);
    const brandLogo = brandInfo?.logo && !brandInfo.logo.includes('gorsel-bulunamadi')
        ? brandInfo.logo
        : null;

    return (

        <Container className="p-0">
            <div className="product-card animate-underline hover-effect-opacity bg-body rounded">
                <div className="position-relative">
                    {/* Favorite button */}
                    <div className="position-absolute top-0 end-0 z-2 hover-effect-target opacity-1 mt-3 me-3">
                        <div className="d-flex flex-column gap-2">
                            <button
                                type="button"
                                onClick={() => toggleFavourite(product._key)}
                                className="btn btn-icon btn-secondary animate-pulse d-none d-lg-inline-flex"
                                aria-label="Favorilere Ekle"
                            >
                                {isFavourite(product._key) ? (
                                    <i className="ri-heart-fill fs-base text-danger animate-target"></i>
                                ) : (
                                    <i className="ri-heart-line fs-base animate-target"></i>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Videolu ürün rozeti — favori butonunun tam karşısında */}
                    {product.customData?.videos?.length > 0 && (
                        <span
                            className={`position-absolute top-0 start-0 z-2 ms-2 ms-lg-3 badge rounded-pill text-bg-danger video-badge ${season ? 'mt-6' : 'mt-2 mt-lg-3'}`}
                        >
                            Videolu Ürün
                        </span>
                    )}

                    {/* Product Image */}
                    <Link className="d-block rounded-top overflow-hidden p-0 p-md-3" href={productUrl}>
                        {season && (
                            <span
                                className="position-absolute top-0 start-0 mt-2 ms-2 mt-lg-3 ms-lg-3"
                                style={{ zIndex: 1 }}
                            >
                                <img
                                    src={season.icon}
                                    alt={season.text}
                                    width={32}
                                    height={32}
                                />
                            </span>
                        )}
                        <div>
                            <img
                                src={imageUrl}
                                alt={product.diaData.aciklama}
                                className="productImage"
                                width={60}
                                height={29}
                            />
                        </div>
                    </Link>
                </div>
                <div className="min-w-0 px-1 pb-2 px-sm-3 pb-sm-3">
                    <div className="product__information d-flex justify-content-between gap-2 mb-2">
                        <div>
                            {/* Marka gizle açıksa kartta marka gösterilmez */}
                            {product.customData?.hideBrand !== true && (brandLogo ? (
                                <Image
                                    src={brandLogo}
                                    alt={brandName || 'Marka'}
                                    width={90}
                                    height={47}
                                    style={{ objectFit: 'contain' }}
                                />
                            ) : (
                                <span className="fw-medium fs-sm">{brandInfo?.name || brandName || 'Marka Yok'}</span>
                            ))}
                        </div>
                        {/* Rating */}
                        <div className='d-flex align-items-center'>
                            {product.customData?.reviewStats?.reviewCount > 0 && (
                                <>
                                    <Rating
                                        name={`product-rating-${product._key}`}
                                        value={product.customData.reviewStats.averageRating}
                                        precision={0.5}
                                        size="small"
                                        readOnly
                                    />
                                    <span className="text-body-tertiary fs-xs">({product.customData.reviewStats.reviewCount} Yorum) </span>
                                </>
                            )}
                        </div>
                    </div>

                    <h3 className="pb-1 mb-2">
                        {/* Stok kodu — kategori ayarı açıksa gösterilmez */}
                        {(product as any)?.hideStockCode !== true && (
                            <span className="fs-xs text-body-secondary lh-sm mb-1 d-block">
                                {stockCode}
                            </span>
                        )}
                        <Link
                            className="d-block fs-sm fw-medium text-truncates"
                            href={productUrl}
                        >
                            <span className="animate-target fs-sm">
                                {product.diaData.aciklama}
                            </span>
                        </Link>
                    </h3>

                    <div className="d-flex justify-content-between align-items-center mb-2">
                        {product.customData?.hideProductionDate !== true ? (
                            <span className="fs-xs text-body-secondary">
                                Üretim Tarihi {product.diaData?.ekalan5 || '-'}
                            </span>
                        ) : <span />}
                        <span className="fs-xs fw-semibold">
                            {/* Stok gizle açıksa kartta stok adedi gösterilmez */}
                            {product.customData?.hideStock !== true && (product.diaData?.gercek_stok > 0 ? (
                                <>
                                    <span className="text-body-secondary">Stok:</span>
                                    <span className="text-success ms-1">
                                        {product.diaData.gercek_stok > 20 ? '+20' : product.diaData.gercek_stok} Adet
                                    </span>
                                </>
                            ) : (
                                <span className="text-danger">Stok Sorunuz</span>
                            ))}
                        </span>
                    </div>

                    <div className="product__price border-top pt-3">
                        {isSetLastik(product) && (
                            <div className="d-flex justify-content-end">
                                <span className="text-body-secondary fs-semibold fs-xs">Adet Fiyatı</span>
                            </div>
                        )}
                        <div className="d-flex flex-column flex-md-row justify-content-end align-items-end gap-1 gap-md-2">
                            {hasDiscount && (
                                <del className="text-body-tertiary fw-normal">
                                    {originalPrice?.toLocaleString('tr-TR', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    })} TL
                                </del>
                            )}
                            <span className="fw-bold">
                                {gosterim.value.toLocaleString('tr-TR', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                })} TL{gosterim.suffix}
                            </span>
                        </div>
                    </div>


                    {product.diaData?.gercek_stok > 0 ? (
                        <Tooltip title="Sepete Ekle">
                            <button
                                type="button"
                                className="product-card-button btn btn-icon btn-primary animate-slide-end w-100 mt-3"
                                aria-label="Sepete Ekle"
                                onClick={handleAddToCart}
                                disabled={adding}
                            >
                                {adding ? 'Ekleniyor...' : t('addToCart')}
                            </button>
                        </Tooltip>
                    ) : (
                        <Link href={getWhatsAppUrl()} target="_blank" className="btn btn-icon btn-outline-success animate-slide-end mt-3 w-100">
                            <i className="ri-whatsapp-line me-1"></i> Stok Sorunuz
                        </Link>
                    )}
                </div>
            </div>
        </Container>
    );
}