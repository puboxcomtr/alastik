'use client';
import React, { useEffect, useState, useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';

import ProductCard from '@components/shop/Product/Showcase/Card';
import Title from '@components/shop/Product/Showcase/Title';
import { Container, Row, Col } from 'react-bootstrap';

import { API_ENDPOINTS } from '@/src/config/api';

import type { Product } from '@/src/types/products';


import 'swiper/css';
import 'swiper/css/navigation';

type ShowcaseData = {
    key: string
    title: string
    subtitle: string
    itemsPerRow: number
    products: Product[]
}

type Props = {
    showcaseKey?: 'first' | 'second' | 'third' | 'fourth' | 'fifth'
}

export default function ProductShowCase({ showcaseKey = 'second' }: Props) {
    const [showcase, setShowcase] = useState<ShowcaseData | null>(null);
    const prevRef = useRef<HTMLButtonElement | null>(null);
    const nextRef = useRef<HTMLButtonElement | null>(null);

    useEffect(() => {
        fetchShowcase();
    }, [showcaseKey]);

    const fetchShowcase = async () => {
        try {
            const res = await fetch(API_ENDPOINTS.showcases.homepage());

            const result = await res.json();

            if (result.success && result.data) {
                const found = result.data.find((s: ShowcaseData) => s.key === showcaseKey);
                setShowcase(found || null);
            }
        } catch (error) {
            console.error('Vitrin yüklenemedi:', error);
        }
    };

    const getBreakpoints = (perRow: number) => {
        const base = Math.min(perRow, 5);
        return {
            0: { slidesPerView: 1.4, spaceBetween: 12 },
            768: { slidesPerView: Math.min(base, 3), spaceBetween: 20 },
            1024: { slidesPerView: Math.min(base, 4), spaceBetween: 20 },
            1280: { slidesPerView: base, spaceBetween: 24 },
        };
    };

    if (!showcase || !showcase.products || showcase.products.length === 0) {
        return null;
    }

    return (
        <Container className="row-fluid">
            <Row>
                <Col className="d-flex justify-content-between align-items-center">
                    <Title
                        title={showcase.title}
                        subtitle={showcase.subtitle}
                    />
                    <div className="d-flex gap-2">
                        <button
                            ref={prevRef}
                            className="btn btn-icon btn-outline-secondary rounded-circle"
                            aria-label="Önceki"
                        >
                            <i className="ci-chevron-left fs-lg"></i>
                        </button>
                        <button
                            ref={nextRef}
                            className="btn btn-icon btn-outline-secondary rounded-circle"
                            aria-label="Sonraki"
                        >
                            <i className="ci-chevron-right fs-lg"></i>
                        </button>
                    </div>
                </Col>
            </Row>
            <Row className="mt-2">
                <Col className='p-0'>
                    <Swiper
                        modules={[Navigation, Autoplay]}
                        onBeforeInit={(swiper) => {
                            if (swiper.params.navigation && typeof swiper.params.navigation !== 'boolean') {
                                swiper.params.navigation.prevEl = prevRef.current;
                                swiper.params.navigation.nextEl = nextRef.current;
                            }
                        }}
                        autoplay={{ delay: 3000, disableOnInteraction: false }}
                        loop={false}
                        breakpoints={getBreakpoints(showcase.itemsPerRow)}
                        style={{ overflow: 'hidden', clipPath: 'inset(0px 0px -100% 0px)' }}
                    >
                        {showcase.products.map((product) => (
                            <SwiperSlide key={product._key} style={{ height: 'auto', overflow: 'visible' }}>
                                <ProductCard product={product} />
                            </SwiperSlide>
                        ))}
                    </Swiper>
                </Col>
            </Row>
        </Container>
    );
}