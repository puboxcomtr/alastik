"use client";
import React, { useState, useEffect } from "react";

/* ========================================
   MUI Components
   ======================================== */
import { Grid, Typography, Rating, Link, Divider, Tooltip } from '@mui/material';

/* ========================================
   Custom Hooks & Helpers
   ======================================== */
import {
    getProductDetailFeatures,
    getProductSeason,
    getCategory,
    isLastik,
    getProductFeature,
    fetchAlternativeSizes
} from '@/src/hooks/Products/productHelpers';
import { getRelatedBlogs } from '@/src/services/productService';

/* ========================================
   Layout Components
   ======================================== */
import AlternativeSizesModal from '@/src/components/layout/Modals/AlternativeSizesModal';
import ShareProductModal from '@/src/components/layout/Modals/ShareProductModal';

/* @import Page */
interface MiddleProps {
    product: Product;
    productName: string;
    wheelSize?: any;
    reviews?: any;
}

export default function Middle({ product, productName, wheelSize, reviews }: MiddleProps) {
    const features = getProductDetailFeatures(product, 'lastikjantavm');
    const rating = reviews?.stats?.averageOverall || 0;
    const reviewCount = reviews?.stats?.total || 0;
    const [ebatDialogOpen, setEbatDialogOpen] = useState(false);
    const [shareDialogOpen, setShareDialogOpen] = useState(false);
    const [showAlternativeLink, setShowAlternativeLink] = useState(false);
    const season = getProductSeason(product);
    const categoryName = getCategory(product);
    useEffect(() => {
        const checkAlternatives = async () => {
            const ozelkod5 = product.diaData?.ozelkod5kodu;
            if (!ozelkod5) {
                setShowAlternativeLink(false);
                return;
            }

            const alternatives = await fetchAlternativeSizes(product);
            setShowAlternativeLink(alternatives.length > 3);
        };

        checkAlternatives();
    }, [product]);
    const [blogCount, setBlogCount] = useState(0);
    useEffect(() => {
        if (!isLastik(product)) return;
        const ozelkod5 = product.diaData?.ozelkod5 || '';
        const patternMatch = ozelkod5.match(/^([a-z0-9-]+)/i);
        const pattern = patternMatch ? patternMatch[1].toLowerCase() : null;
        if (!pattern) return;
        getRelatedBlogs(pattern).then(blogs => setBlogCount(blogs.length));
    }, [product._key]);
    const handleEbatClick = () => {
        const model = product.diaData?.ozelkod5 || '';
        const modelKodu = product.diaData?.ozelkod5kodu || '';
        if (!model || !modelKodu || model.toLowerCase() === 'yok' || modelKodu.toLowerCase() === 'yok') return;
        setEbatDialogOpen(true);
    };
    return (
        <>
            <Grid container>
                <Grid size={12}>
                    <Grid container>
                        <Grid size={12}>
                            <Typography
                                className="fw-semibold d-block lh-sm"
                                variant="h6"
                                component="h1"
                                gutterBottom
                            >
                                {productName}
                            </Typography>
                        </Grid>
                        <Grid size={12}>
                            <div className="d-flex align-items-end gap-4 mb-4">
                                {/* Rating Component */}
                                {reviewCount > 0 ? (
                                    <div className="d-flex gap-1">
                                        <Rating
                                            name="product-rating"
                                            value={rating}
                                            precision={0.5}
                                            readOnly
                                            size="small"
                                        />
                                        <Typography
                                            variant="body2"
                                            className="fs-xs text-muted"
                                            component="span"
                                        >
                                            {rating.toFixed(2)} ({reviewCount} yorum)
                                        </Typography>
                                    </div>
                                ) : (
                                    <Typography
                                        variant="body2"
                                        className="fs-xs text-muted"
                                        component="span"
                                    >
                                        Henüz Yorum Yok
                                    </Typography>
                                )}
                                {/* Test Sonuçları */}
                                {blogCount > 0 && (
                                    <div className='d-flex gap-1'>
                                        <Link
                                            href="#tire_test"
                                            className='fw-semibold text-decoration-none fs-sm d-flex gap-1'
                                            color='primary'>
                                            <span>{blogCount} Lastik Test Sonucu</span>
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </Grid>
                        <Grid size={12}>
                            <div className="d-flex align-items-end gap-4">
                                {isLastik(product) ? (
                                    <div>
                                        <p className="fw-semibold mb-2">Öne Çıkan Özellikler</p>
                                        <div className="d-flex gap-2 flex-wrap">
                                            {wheelSize?.weThink && wheelSize.weThink.length > 0 ? (
                                                wheelSize.weThink.map((item: any, idx: number) => (
                                                    <span key={idx} className="badge text-body-emphasis border cursor-pointer">
                                                        {item.display}
                                                    </span>
                                                ))
                                            ) : (
                                                <>
                                                    <span className="badge text-body-emphasis border cursor-pointer">
                                                        Sürüş ve Konfor
                                                    </span>
                                                    <span className="badge text-body-emphasis border cursor-pointer">
                                                        Yakıt Verimliliği
                                                    </span>
                                                    <span className="badge text-body-emphasis border cursor-pointer">
                                                        Fiyat Performans
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ) : features.length > 0 && (
                                    <Typography
                                        className="fw-semibold d-block lh-sm"
                                        variant="body1"
                                        gutterBottom
                                    >
                                        Ürün Özellikleri
                                    </Typography>
                                )}
                            </div>
                        </Grid>
                        <Grid size={12}>
                            <Divider sx={{ my: 2 }} />
                        </Grid>
                        <Grid size={10}>
                            {isLastik(product) && (
                                <div className="d-flex gap-3">
                                    <p>
                                        <Tooltip title='Yakıt Verimliliği' arrow placement="top">
                                            <span className="cursor-pointer d-flex gap-1 align-items-center badge text-body-emphasis bg-body-secondary">
                                                <i className="ri-gas-station-fill" style={{ fontSize: '18px', color: '#000' }}></i>
                                                <span
                                                    style={{
                                                        textShadow: '0px 0px 1px #000, 0px 0px 1px #000, 0px 0px 1px #000, 0px 0px 1px #000, 0px 0px 1px #000',
                                                        fontSize: '14px',
                                                        color: '#FFF'
                                                    }}>
                                                    {getProductFeature(product, 'Yakıt Verimliliği') || '-'}
                                                </span>
                                            </span>
                                        </Tooltip>
                                    </p>
                                    <p>
                                        <Tooltip title='Islak Zeminde Frenleme' arrow placement="top">
                                            <span className="cursor-pointer d-flex gap-1 align-items-center badge text-body-emphasis bg-body-secondary">
                                                <i className="ri-showers-fill" style={{ fontSize: '18px', color: '#000' }}></i>
                                                <span
                                                    style={{
                                                        textShadow: '0px 0px 1px #000, 0px 0px 1px #000, 0px 0px 1px #000, 0px 0px 1px #000, 0px 0px 1px #000',
                                                        fontSize: '14px',
                                                        color: '#FFF'
                                                    }}>
                                                    {getProductFeature(product, 'Islak Zeminde Frenleme') || '-'}
                                                </span>
                                            </span>
                                        </Tooltip>
                                    </p>
                                    <p>
                                        <Tooltip title='Gürültü Seviyesi' arrow placement="top">
                                            <span className="cursor-pointer d-flex gap-1 align-items-center badge text-body-emphasis bg-body-secondary">
                                                <i className="ri-volume-up-fill" style={{ fontSize: '18px', color: '#000' }}></i>
                                                <span
                                                    style={{
                                                        textShadow: '0px 0px 1px #000, 0px 0px 1px #000, 0px 0px 1px #000, 0px 0px 1px #000, 0px 0px 1px #000',
                                                        fontSize: '14px',
                                                        color: '#FFF'
                                                    }}>
                                                    {getProductFeature(product, 'Gürültü Seviyesi') || '-'}
                                                </span>
                                            </span>
                                        </Tooltip>
                                    </p>
                                </div>
                            )}
                            <ul className="p-0 m-0 gap-3">
                                {isLastik(product) && (
                                    <li className="d-flex">
                                        <p className="fw-semibold mb-1 w-50">
                                            <Tooltip title="Lastiğin kullanım mevsimi" arrow placement="top">
                                                <span>Mevsim</span>
                                            </Tooltip>
                                        </p>
                                        <p className="mb-1">
                                            <span className='d-flex align-items-center gap-1'>
                                                {season && (
                                                    <img
                                                        src={season.icon}
                                                        alt={season.text}
                                                        width={15}
                                                        height={15}
                                                    />
                                                )}
                                                <span>
                                                    {getProductFeature(product, 'Mevsim') || product.diaData?.ozelkod1 || '-'}
                                                </span>
                                            </span>
                                        </p>
                                    </li>
                                )}
                                {features.map((feature, index) => (
                                    <li key={index} className="d-flex">
                                        <p className="fw-semibold mb-1 w-50">
                                            {feature.tooltip ? (
                                                <Tooltip title={feature.tooltip} arrow placement="top">
                                                    <span>
                                                        {feature.label}
                                                        <i className="ri-information-line ms-1 text-muted" style={{ fontSize: '14px' }}></i>
                                                    </span>
                                                </Tooltip>
                                            ) : (
                                                feature.label
                                            )}
                                        </p>
                                        <p className="mb-1" style={feature.color ? { color: feature.color } : {}}>
                                            {Array.isArray(feature.value) ? (
                                                <span className="d-flex align-items-center gap-2 flex-wrap">
                                                    {feature.value.map((item, idx) => (
                                                        <Tooltip key={idx} title={item.tooltip} arrow placement="top">
                                                            <span className="badge" style={{
                                                                backgroundColor: feature.color || '#000',
                                                                cursor: 'help'
                                                            }}>
                                                                {item.text}
                                                            </span>
                                                        </Tooltip>
                                                    ))}
                                                </span>
                                            ) : feature.isClickable ? (
                                                <Link
                                                    component="button"
                                                    onClick={handleEbatClick}
                                                    className="text-decoration-none fw-semibold cursor-pointer"
                                                    sx={{ cursor: 'pointer' }}
                                                >
                                                    {feature.value}
                                                    <i className="ri-pencil-line ms-1"></i>
                                                </Link>
                                            ) : (
                                                feature.value
                                            )}
                                        </p>
                                    </li>
                                ))}
                            </ul>

                            {/* Ürünü Paylaş */}
                            <div className="mt-3">
                                <button
                                    type="button"
                                    onClick={() => setShareDialogOpen(true)}
                                    className="btn btn-link p-0 text-decoration-none d-inline-flex align-items-center gap-1"
                                    style={{ color: 'var(--cz-primary)', fontSize: '14px', fontWeight: 600 }}
                                >
                                    <i className="ri-share-line" style={{ fontSize: '18px' }}></i>
                                    <span>Ürünü Paylaş</span>
                                </button>
                            </div>

                        </Grid>
                    </Grid>
                </Grid>
            </Grid >
            <AlternativeSizesModal
                open={ebatDialogOpen}
                onClose={() => setEbatDialogOpen(false)}
                product={product}
            />
            <ShareProductModal
                open={shareDialogOpen}
                onClose={() => setShareDialogOpen(false)}
                product={product}
            />
        </>
    );
}