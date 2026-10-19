'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';

import 'swiper/css';
import 'swiper/css/navigation';

import { API_ENDPOINTS } from '@/src/config/api';

import AlastikProductCard from '@components/alastik/shop/Product/Showcase/Card';
import LjaProductCard from '@components/lastikjantavm/shop/Product/Showcase/Card';

interface PaymentProductsProps {
    orderNumber?: string;
}

export default function PaymentProducts({ orderNumber }: PaymentProductsProps) {
    const site = typeof document !== 'undefined' && document.cookie.includes('site=lastikjantavm') ? 'lastikjantavm' : 'alastik';
    const ProductCard = site === 'lastikjantavm' ? LjaProductCard : AlastikProductCard;
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const swiperRef = useRef<SwiperType | null>(null);

    useEffect(() => {
        const fetchSimilar = async () => {
            if (!orderNumber) {
                setLoading(false);
                return;
            }

            try {
                const res = await fetch(
                    `${API_ENDPOINTS.products.similarByOrder(orderNumber)}?limit=8`,
                    { cache: 'no-store' }
                );

                if (!res.ok) {
                    setLoading(false);
                    return;
                }

                const result = await res.json();
                if (result.success && result.data) {
                    setProducts(result.data);
                }
            } catch (error) {
                console.error('Benzer ürünler yüklenemedi:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSimilar();
    }, [orderNumber]);

    if (loading) {
        return (
            <div className="text-center py-4">
                <div className="spinner-border spinner-border-sm text-primary" role="status">
                    <span className="visually-hidden">Yükleniyor...</span>
                </div>
            </div>
        );
    }

    if (!products || products.length === 0) {
        return (
            <div className="position-relative d-flex align-items-center h-100 py-5 px-3 px-sm-4 px-xl-5">
                <span className="position-absolute top-0 start-0 w-100 h-100 bg-body-tertiary rounded-5 d-none d-md-block"></span>
                <span className="position-absolute top-0 start-0 w-100 h-100 bg-body-tertiary d-md-none"></span>
                <div className="position-relative w-100 z-2 mx-auto text-center" style={{ maxWidth: '636px' }}>
                    <h2 className="h4 pb-3">Bunları da Beğenebilirsiniz</h2>
                    <p className="text-muted mb-4">Şu anda önerilecek benzer ürün bulunamadı.</p>
                    <Link className="btn btn-lg btn-primary w-100" href="/">
                        Alışverişe Devam Et
                        <i className="ri-arrow-right-s-line fs-lg ms-1"></i>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="position-relative d-flex align-items-center h-100 py-5 px-3 px-sm-4 px-xl-5">
            <span className="position-absolute top-0 start-0 w-100 h-100 bg-body-tertiary rounded-5 d-none d-md-block"></span>
            <span className="position-absolute top-0 start-0 w-100 h-100 bg-body-tertiary d-md-none"></span>
            <div
                className="position-relative w-100 z-2 mx-auto pb-2 pb-sm-3 pb-md-0"
                style={{ maxWidth: '636px' }}
            >
                <h2 className="h4 text-center pb-3">Bunları da Beğenebilirsiniz</h2>
                <Swiper
                    modules={[Navigation, Autoplay]}
                    slidesPerView={2}
                    spaceBetween={16}
                    loop={products.length > 2}
                    autoplay={{
                        delay: 5000,
                        disableOnInteraction: false,
                    }}
                    onSwiper={(swiper) => { swiperRef.current = swiper; }}
                    className="mb-4"
                >
                    {products.map((product) => (
                        <SwiperSlide key={product._key}>
                            <ProductCard product={product} />
                        </SwiperSlide>
                    ))}
                </Swiper>

                <div className="d-flex justify-content-center gap-2 mb-4">
                    <button
                        type="button"
                        className="btn btn-icon btn-outline-secondary"
                        onClick={() => swiperRef.current?.slidePrev()}
                    >
                        <i className="ri-arrow-left-s-line"></i>
                    </button>
                    <button
                        type="button"
                        className="btn btn-icon btn-outline-secondary"
                        onClick={() => swiperRef.current?.slideNext()}
                    >
                        <i className="ri-arrow-right-s-line"></i>
                    </button>
                </div>

                <Link className="btn btn-lg btn-primary w-100" href="/">
                    Alışverişe Devam Et
                    <i className="ri-arrow-right-s-line fs-lg ms-1"></i>
                </Link>
            </div>
        </div>
    );
}