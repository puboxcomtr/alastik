'use client';
import React, { useEffect, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectFade, Autoplay } from 'swiper/modules';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';

import { API_ENDPOINTS } from '@/src/config/api';

import ProductSlideCard from '@components/shop/Product/Slide/Card';

type ShowcaseData = {
    key: string
    title: string
    subtitle: string
    itemsPerRow: number
    products: any[]
}

type Props = {
    showcaseKey?: 'first' | 'second' | 'third' | 'fourth' | 'fifth'
}

export default function SingleProduct({ showcaseKey = 'third' }: Props) {
    const [showcase, setShowcase] = useState<ShowcaseData | null>(null);

    useEffect(() => {
        fetchShowcase();
    }, [showcaseKey]);

    const fetchShowcase = async () => {
        try {
            const res = await fetch(API_ENDPOINTS.showcases.homepage())
            const result = await res.json()

            if (result.success && result.data) {
                const found = result.data.find((s: ShowcaseData) => s.key === showcaseKey)
                setShowcase(found || null)
            }
        } catch (error) {
            console.error('Vitrin yüklenemedi:', error);
        }
    };

    if (!showcase || !showcase.products || showcase.products.length === 0) {
        return null;
    }

    return (
        <section className="container pb-5 pb-md-0">
            <div className="row-fluid">
                <div className="text-center py-3 py-md-2 mt-lg-5">
                    {showcase.subtitle && (
                        <span style={{ color: '#e2001a' }}>{showcase.subtitle}</span>
                    )}
                    {showcase.title && <h3>{showcase.title}</h3>}
                </div>
                <div className="position-relative px-4 px-md-3 px-lg-4">
                    <div className="row position-relative z-2 justify-content-center">
                        {/* Sağdaki küçük ürün kart slider */}
                        <div className="col-md-3 col-xl-3 order-md-2 d-flex justify-content-center justify-content-md-end py-4 py-md-3 py-lg-4">
                            <Swiper
                                modules={[Autoplay]}
                                spaceBetween={24}
                                loop={showcase.products.length > 1}
                                speed={400}
                                autoplay={{
                                    delay: 2000,
                                    disableOnInteraction: false,
                                }}
                                style={{ maxWidth: '416px' }}
                            >
                                {showcase.products.map((product: any) => (
                                    <SwiperSlide key={product._key}>
                                        <ProductSlideCard product={product} />
                                    </SwiperSlide>
                                ))}
                            </Swiper>
                        </div>

                        {/* Ortadaki text slider */}
                        <div className="col-sm-9 col-md-8 col-xl-7 order-md-1 d-flex align-items-center">
                            <Swiper
                                modules={[EffectFade, Autoplay]}
                                allowTouchMove={false}
                                loop={showcase.products.length > 1}
                                effect="fade"
                                fadeEffect={{ crossFade: true }}
                                autoplay={{
                                    delay: 2000,
                                    disableOnInteraction: false,
                                }}
                                style={{ width: '100%' }}
                            >
                                {showcase.products.map((product: any) => (
                                    <SwiperSlide key={`text-${product._key}`}>
                                        <div className="d-flex align-items-center justify-content-center">
                                            <span className="swipe_slider_text">
                                                <h2 className="text-center" style={{ color: '#FFF' }}>
                                                    {product.diaData?.aciklama || 'Ürün'}
                                                </h2>
                                            </span>
                                        </div>
                                    </SwiperSlide>
                                ))}
                            </Swiper>
                        </div>
                    </div>

                    {/* Background */}
                    <div className="position-absolute top-0 start-0 w-100 h-100 user-select-none rounded-5">
                        <span
                            className="position-absolute top-0 start-0 w-100 h-100 rounded-5"
                            style={{
                                background: `url('/assets/img/bg/good-year-background.jpg')`,
                                backgroundSize: 'cover',
                            }}
                        ></span>
                    </div>
                </div>
            </div>
        </section>
    );
}