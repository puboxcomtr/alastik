'use client';
import Link from "next/link";
import { useState, useEffect } from "react";
import { Row, Col } from "react-bootstrap";
import Rating from '@mui/material/Rating';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import Image from 'next/image';

import { useTranslations } from '@/src/hooks/Theme/useTranslations';
import { ProductCardProps } from '@src/types/products';
import { useSettings } from '@src/context/SettingsContext';
import { useBrands } from '@/src/context/BrandsContext';
import { useCart } from '@/src/context/CartContext';
import { useDefinition } from '@/src/hooks/Theme/useDefinition';

import { isLastik, getProductFeature, getProductSeason, isSetLastik } from '@src/hooks/Products/productHelpers';
import { getRelatedBlogs } from '@/src/services/productService';



import {
    getProductUrl,
    getProductPrice,
    getProductOriginalPrice,
    hasProductDiscount,
    getProductImage,
    getProductStockCode,
} from '@src/hooks/Products/productHelpers';
import { checkPurchaseLimit, productToLimitCheckItem, clampQuantityToStock, canAddToCartStock } from '@src/hooks/Products/purchaseLimitHelpers';
import { toast } from 'react-toastify';

export default function OneColumn({ product }: ProductCardProps) {
    const [isFavorite, setIsFavorite] = useState(false);
    const [adding, setAdding] = useState(false);
    const [blogCount, setBlogCount] = useState(0);
    const { addToCart, items } = useCart();
    const { theme } = useSettings();
    const { definition } = useDefinition();
    const { t } = useTranslations('general');
    const { getBrand } = useBrands();
    const reviewCount = product.customData?.reviewStats?.reviewCount || 0;
    const reviewRating = product.customData?.reviewStats?.averageRating || 0;

    const handleAddToCart = async () => {
        if (adding) return;

        const currentInCart = items.find(i => i.productKey === product._key)?.quantity ?? 0;
        const stockCheck = canAddToCartStock(product, currentInCart, quantity);
        if (!stockCheck.allowed) {
            toast.warning(`En fazla ${stockCheck.maxStock} adet ekleyebilirsiniz`);
            return;
        }

        setAdding(true);

        try {
            const item = productToLimitCheckItem(product, quantity);
            const check = await checkPurchaseLimit([item]);

            if (!check.valid && check.violations.length > 0) {
                check.violations.forEach(v => toast.error(v.message));
                setAdding(false);
                return;
            }

            await addToCart(product._key, quantity);
        } catch (err) {
            console.error('Sepete ekleme hatası:', err);
            toast.error('Sepete eklenemedi');
        } finally {
            setAdding(false);
        }
    };
    useEffect(() => {
        if (!isLastik(product)) return;
        const ozelkod5 = product.diaData?.ozelkod5 || '';
        const patternMatch = ozelkod5.match(/^([a-z0-9-]+)/i);
        const pattern = patternMatch ? patternMatch[1].toLowerCase() : null;
        if (!pattern) return;
        getRelatedBlogs(pattern).then(blogs => setBlogCount(blogs.length));
    }, [product._key]);

    const getWhatsAppUrl = () => {
        const phone = definition?.companyInfo?.phone || '0539 825 71 01';
        const formatted = phone.replace(/\s+/g, '').replace(/^0/, '90');
        return `https://wa.me/${formatted}`;
    };
    const [quantity, setQuantity] = useState(1);
    const productUrl = getProductUrl(product);
    const price = getProductPrice(product);
    const originalPrice = getProductOriginalPrice(product);
    const hasDiscount = hasProductDiscount(product);
    const imageUrl = getProductImage(product, theme.defaultCatalogImage);
    const stockCode = getProductStockCode(product);
    const brandName = product.diaData.marka || '';
    const brandInfo = getBrand(brandName);
    const brandLogo = brandInfo?.logo && !brandInfo.logo.includes('gorsel-bulunamadi')
        ? `https://api.alastik.com${brandInfo.logo}`
        : null;

    return (
        <div className="product-card bg-body rounded border mb-2">
            <Row className="g-0 py-3 align-items-stretch">
                {/* Görsel */}
                <Col md={2}>
                    <Link href={productUrl}>
                        <img
                            src={imageUrl}
                            alt={product.diaData.aciklama}
                            style={{ objectFit: 'contain', maxHeight: '200px' }}
                        />
                    </Link>
                </Col>
                <Col md={6} className="pr-3">
                    {/* Marka */}
                    <div className="d-flex align-items-center justify-content-between">
                        <div>
                            {brandLogo ? (
                                <Image src={brandLogo} alt={brandName} width={90} height={36} style={{ objectFit: 'contain', marginLeft: '-8px' }} />
                            ) : (
                                <span className="fw-medium fs-sm">{brandInfo?.name || brandName || 'Marka Yok'}</span>
                            )}
                        </div>
                        {reviewCount > 0 && (
                            <Link href={`${productUrl}#reviews`} className="d-flex flex-column text-decoration-none">
                                <span className="text-black text-end" style={{ fontSize: '10px' }}>({reviewCount} Yorum)</span>
                                <Rating value={reviewRating} precision={0.5} size="small" readOnly />
                            </Link>
                        )}
                    </div>
                    {/* Ürün Adı */}
                    <Link href={productUrl} className="fs-md fw-semibold text-dark text-decoration-none d-block">
                        {product.diaData.aciklama}
                    </Link>
                    {/* Seçenekler */}
                    <div className="d-flex my-1 gap-4 align-items-center">
                        <span className="fs-xs text-body-secondary d-block">Stok Kodu {stockCode}</span>
                        {product.diaData?.ekalan5 && <span className="fs-xs text-body-secondary d-block">Üretim Tarihi {product.diaData.ekalan5}</span>}
                        {(() => {
                            const s = getProductSeason(product);
                            if (s) return <span className="fs-xs text-body-secondary d-block"><img src={s.icon} alt={s.text} width={14} height={14} className="me-1" />{s.text}</span>;
                            const mevsim = getProductFeature(product, 'Mevsim') || product.diaData?.ozelkod1;
                            return mevsim ? <span className="fs-xs text-body-secondary d-block">{mevsim}</span> : null;
                        })()}
                    </div>
                    <Divider className="my-3" />
                    {isLastik(product) && (
                        <div className="d-flex gap-2 flex-wrap mt-1 align-items-center">
                            {[
                                { title: 'Yakıt Verimliliği', icon: 'ri-gas-station-fill', key: 'Yakıt Verimliliği' },
                                { title: 'Islak Zeminde Frenleme', icon: 'ri-showers-fill', key: 'Islak Zeminde Frenleme' },
                                { title: 'Gürültü Seviyesi', icon: 'ri-volume-up-fill', key: 'Gürültü Seviyesi' },
                            ].map((item) => (
                                <Tooltip key={item.key} title={item.title} arrow placement="top">
                                    <span className="cursor-pointer d-flex gap-1 align-items-center badge text-body-emphasis">
                                        <i className={item.icon} style={{ fontSize: '16px', color: '#000' }}></i>
                                        <span style={{ fontSize: '13px' }}>
                                            {getProductFeature(product, item.key) || '-'}
                                        </span>
                                    </span>
                                </Tooltip>
                            ))}
                            <div className="border-start border-2 ps-3">
                                {blogCount > 0 && (
                                    <Link href={`${productUrl}#tire_test`} className='fw-semibold text-decoration-none fs-xs text-success'>
                                        {blogCount} Lastik Test Sonucu
                                    </Link>
                                )}
                            </div>
                        </div>
                    )}
                </Col>
                {/* Fiyat */}
                <Col md={4} className="border-start d-flex align-items-center">
                    <div className="d-flex flex-column px-3 gap-2 w-100">
                        <div className="d-flex justify-content-between align-items-end">
                            <div>
                                <div className="fw-semibold fs-xs text-black">
                                    {product.diaData?.gercek_stok > 0 ? (
                                        <>Stok Adeti:
                                            <span className="text-success" style={{ paddingLeft: "5px" }}>
                                                {product.diaData.gercek_stok > 20 ? '+20' : product.diaData.gercek_stok} Adet
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-danger">Stok Sorunuz</span>
                                    )}
                                </div>
                            </div>
                            <div className="text-end">
                                {isSetLastik(product) ? (
                                    <span className="text-body-secondary fw-semibold fs-xs d-block">Adet Fiyatı</span>
                                ) : (
                                    hasDiscount && (
                                        <del className="text-body-tertiary fs-md d-block">
                                            {originalPrice?.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL
                                        </del>
                                    )
                                )}
                                <span className="fw-bold fs-lg">
                                    {price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL
                                </span>
                            </div>
                        </div>
                        <div className="d-flex align-items-center gap-2 mt-2">
                            {product.diaData?.gercek_stok > 0 && (
                                <div className="count-input">
                                    <button type="button" className="btn btn-icon" onClick={() => setQuantity(q => Math.max(1, q - 1))} disabled={quantity <= 1}>
                                        <i className="ci-minus"></i>
                                    </button>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={quantity}
                                        onChange={(e) => {
                                            const { clamped, exceeded, maxStock } = clampQuantityToStock(product, parseInt(e.target.value) || 1);
                                            if (exceeded) toast.warning(`En fazla ${maxStock} adet ekleyebilirsiniz`);
                                            setQuantity(clamped);
                                        }}
                                        min="1"
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-icon"
                                        onClick={() => {
                                            const { clamped, exceeded, maxStock } = clampQuantityToStock(product, quantity + 1);
                                            if (exceeded) toast.warning(`En fazla ${maxStock} adet ekleyebilirsiniz`);
                                            setQuantity(clamped);
                                        }}
                                    >
                                        <i className="ci-plus"></i>
                                    </button>
                                </div>
                            )}
                            {product.diaData?.gercek_stok > 0 ? (
                                <Tooltip title="Sepete Ekle">
                                    <button type="button" className="btn btn-primary btn-md flex-fill" onClick={handleAddToCart} disabled={adding}>
                                        {adding ? 'Ekleniyor...' : t('addToCart')}
                                    </button>
                                </Tooltip>
                            ) : (
                                <Link href={getWhatsAppUrl()} target="_blank" className="btn btn-outline-success btn-md flex-fill">
                                    <i className="ri-whatsapp-line fs-md me-1"></i> Tedarik Et
                                </Link>
                            )}
                        </div>
                    </div>
                </Col>
            </Row>
        </div>
    );
}