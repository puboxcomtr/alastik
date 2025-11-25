// apps/web/src/components/shop/Product/Showcase/Card.tsx
'use client';

import Link from "next/link";
import { useState, useEffect } from "react";
import Tooltip from '@mui/material/Tooltip';
import Rating from '@mui/material/Rating';
import Dropdown from "react-bootstrap/Dropdown";
import Image from 'next/image';

import { useTranslations } from '@/src/hooks/Theme/useTranslations';
import { ProductCardProps } from '@src/types/products';
import { useSettings } from '@src/context/SettingsContext';
import { getBrandByName } from '@/src/services/brandService';
import { getBrandDisplay } from '@/src/hooks/Products/brandHelpers';
import {
    getProductUrl,
    getProductPrice,
    getProductOriginalPrice,
    hasProductDiscount,
    getProductImage,
    getProductStockCode,
    getProductFeatures,
    getProductSeason
} from '@src/hooks/Products/productHelpers';

export default function ProductCard({ product }: ProductCardProps) {
    const [value, setValue] = useState<number | null>(4);
    const [isFavorite, setIsFavorite] = useState(false);
    const season = getProductSeason(product);
    const [brandInfo, setBrandInfo] = useState<{ name: string; logo: string | null } | null>(null);
    const { theme } = useSettings();
    const { t } = useTranslations('general');

    useEffect(() => {
        const fetchBrand = async () => {
            const response = await getBrandByName(product.diaData.marka);
            if (response.success && response.data) {
                setBrandInfo(response.data);
            }
        };

        fetchBrand();
    }, [product.diaData.marka]);

    const toggleFavorite = () => {
        setIsFavorite((prev) => !prev);
    };

    const productUrl = getProductUrl(product);
    const price = getProductPrice(product);
    const originalPrice = getProductOriginalPrice(product);
    const hasDiscount = hasProductDiscount(product);
    const imageUrl = getProductImage(product, theme.defaultCatalogImage);
    const stockCode = getProductStockCode(product);
    const { ebat, yukEndeksi, hizEndeksi, uretimTarihi } = getProductFeatures(product);

    // Marka gösterimi
    const brandDisplay = getBrandDisplay(brandInfo, product.diaData.marka);

    return (
        <div className="product-card animate-underline hover-effect-opacity bg-body rounded">
            <div className="position-relative">
                {/* Favorite button - aynı */}
                <div className="position-absolute top-0 end-0 z-2 hover-effect-target opacity-0 mt-3 me-3">
                    <div className="d-flex flex-column gap-2">
                        <button
                            type="button"
                            onClick={toggleFavorite}
                            className="btn btn-icon btn-secondary animate-pulse d-none d-lg-inline-flex"
                            aria-label="Favorilere Ekle"
                        >
                            {isFavorite ? (
                                <i className="ri-heart-fill fs-base text-danger animate-target"></i>
                            ) : (
                                <i className="ri-heart-line fs-base animate-target"></i>
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile dropdown - aynı */}
                <div className="d-lg-none position-absolute top-0 end-0 z-2 mt-2 me-2">
                    <Dropdown align="end">
                        <Dropdown.Toggle
                            variant="secondary"
                            size="sm"
                            className="btn btn-icon bg-body"
                            aria-label="More actions"
                        >
                            <i className="ri-more-2-fill fs-lg"></i>
                        </Dropdown.Toggle>
                        <Dropdown.Menu className="fs-xs p-2" style={{ minWidth: "auto" }}>
                            <Dropdown.Item onClick={toggleFavorite}>
                                <i className="ri-heart-line fs-sm ms-n1 me-2"></i>
                                {isFavorite ? "Favorilerden Çıkar" : "Favorilere Ekle"}
                            </Dropdown.Item>
                        </Dropdown.Menu>
                    </Dropdown>
                </div>

                {/* Product Image - aynı */}
                <Link className="d-block rounded-top overflow-hidden p-3 p-sm-4" href={productUrl}>
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
                        />
                    </div>
                </Link>
            </div>

            <div className="w-100 min-w-0 px-1 pb-2 px-sm-3 pb-sm-3">
                <div className="d-flex justify-content-between gap-2 mb-2">
                    <div>
                        {brandDisplay.hasLogo && brandDisplay.logo ? (
                            <Image
                                src={brandDisplay.logo}
                                alt={brandDisplay.name || 'Marka'}
                                width={60}
                                height={30}
                                style={{ objectFit: 'contain' }}
                            />
                        ) : (
                            <span className="fw-medium fs-sm">{brandDisplay.display}</span>
                        )}
                    </div>
                    {/* Rating - aynı */}
                    <div className='d-flex align-items-center'>
                        <Rating
                            name={`product-rating-${product._key}`}
                            value={value}
                            precision={0.5}
                            size="small"
                            onChange={(event, newValue) => {
                                setValue(newValue);
                            }}
                        />
                        <span className="text-body-tertiary fs-xs">({value})</span>
                    </div>
                </div>

                {/* Geri kalan kısım aynı */}
                <h3 className="pb-1 mb-2">
                    <span className="fs-xs text-body-secondary lh-sm mb-1 d-block">
                        {stockCode}
                    </span>
                    <Link
                        className="d-block fs-sm fw-medium text-truncates"
                        href={productUrl}
                    >
                        <span className="animate-target fs-sm">
                            {product.diaData.aciklama}
                        </span>
                    </Link>
                </h3>

                <div className="d-flex justify-content-end border-top pt-3 gap-2">
                    <span>
                        {hasDiscount && (
                            <del className="text-body-tertiary fw-normal">
                                {originalPrice?.toLocaleString('tr-TR', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                })} TL
                            </del>
                        )}
                    </span>
                    <span className="fw-bold">
                        {price.toLocaleString('tr-TR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        })} TL
                    </span>
                </div>

                <Tooltip title="Sepete Ekle">
                    <button
                        type="button"
                        className="product-card-button btn btn-icon btn-primary animate-slide-end w-100 mt-3"
                        aria-label="Sepete Ekle"
                    >
                        {t('addToCart')}
                    </button>
                </Tooltip>
            </div>

            {/* Product details hover - aynı */}
            <div className="product-card-details position-absolute top-100 start-0 w-100 bg-body rounded-bottom shadow mt-n2 p-3 pt-1">
                <span className="position-absolute top-0 start-0 w-100 bg-body mt-n2 py-2"></span>
                <ul className="list-unstyled d-flex flex-column gap-2 m-0">
                    <li className="d-flex align-items-center">
                        <span className="fs-xs">Ebat:</span>
                        <span className="d-block flex-grow-1 border-bottom border-dashed px-1 mt-2 mx-2"></span>
                        <span className="text-dark-emphasis fs-xs fw-medium text-end">
                            {ebat}
                        </span>
                    </li>
                    <li className="d-flex align-items-center">
                        <span className="fs-xs">Yük Endeksi:</span>
                        <span className="d-block flex-grow-1 border-bottom border-dashed px-1 mt-2 mx-2"></span>
                        <span className="text-dark-emphasis fs-xs fw-medium text-end">
                            {yukEndeksi}
                        </span>
                    </li>
                    <li className="d-flex align-items-center">
                        <span className="fs-xs">Hız Endeksi:</span>
                        <span className="d-block flex-grow-1 border-bottom border-dashed px-1 mt-2 mx-2"></span>
                        <span className="text-dark-emphasis fs-xs fw-medium text-end">
                            {hizEndeksi}
                        </span>
                    </li>
                    <li className="d-flex align-items-center">
                        <span className="fs-xs">Üretim Tarihi:</span>
                        <span className="d-block flex-grow-1 border-bottom border-dashed px-1 mt-2 mx-2"></span>
                        <span className="text-dark-emphasis fs-xs fw-medium text-end">
                            {uretimTarihi}
                        </span>
                    </li>
                </ul>
            </div>
        </div>
    );
}