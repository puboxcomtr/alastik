'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';

// Swiper
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';

// Swiper CSS
import 'swiper/css';
import 'swiper/css/navigation';

// Services
import { getSliderById } from '@/src/services/sliderService';

// Types
import type { Slider } from '@/src/types/slider';

const MEDIA_URL = process.env.NEXT_PUBLIC_MEDIA_URL || 'http://localhost:3082';

const getImageUrl = (url: string | undefined | null): string => {
    if (!url) return '/images/slider/gorsel-bulunamadi.jpg';
    if (url.startsWith('http')) return url;
    return `${MEDIA_URL}${url.startsWith('/') ? url : '/' + url}`;
};

// Statik ürünler (sliderId olmadığında kullanılır)
const staticProducts = [
    {
        image: '/images/products/lastik-1.jpg',
        description: 'Pirelli Cinturato P7 205/55R16',
        link: '/urun/pirelli-cinturato-p7',
    },
    {
        image: '/images/products/lastik-2.jpg',
        description: 'Michelin Primacy 4 195/65R15',
        link: '/urun/michelin-primacy-4',
    },
    {
        image: '/images/products/lastik-3.jpg',
        description: 'Continental EcoContact 6 185/60R15',
        link: '/urun/continental-ecocontact-6',
    },
    {
        image: '/images/products/lastik-4.jpg',
        description: 'Goodyear EfficientGrip 205/60R16',
        link: '/urun/goodyear-efficientgrip',
    },
];

interface RecommendedProductsProps {
    sliderId?: string;
}

export default function PaymentProducts({ sliderId }: RecommendedProductsProps) {
    const [slider, setSlider] = useState<Slider | null>(null);
    const [loading, setLoading] = useState(true);
    const swiperRef = useRef<SwiperType | null>(null);

    useEffect(() => {
        const fetchSlider = async () => {
            if (!sliderId) {
                setLoading(false);
                return;
            }

            try {
                const sliderData = await getSliderById(sliderId);
                setSlider(sliderData);
            } catch (error) {
                console.error('Slider yüklenemedi:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSlider();
    }, [sliderId]);

    if (loading) {
        return (
            <div className="text-center py-4">
                <div className="spinner-border spinner-border-sm text-primary" role="status">
                    <span className="visually-hidden">Yükleniyor...</span>
                </div>
            </div>
        );
    }

    // Slider varsa slider datası, yoksa statik ürünler
    const products = slider && slider.sliders.length > 0
        ? slider.sliders.map(s => ({ image: s.image, description: s.description, link: s.link, openNewTab: s.openNewTab }))
        : staticProducts;

    const settings = slider?.settings || {};
    const changeSpeed = parseInt(settings.changeSpeed) || 5000;
    const autoStart = settings.autoStart !== false;

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
                    autoplay={autoStart ? {
                        delay: changeSpeed,
                        disableOnInteraction: false,
                    } : undefined}
                    onSwiper={(swiper) => { swiperRef.current = swiper; }}
                    className="mb-4"
                >
                    {products.map((product, index) => (
                        <SwiperSlide key={index}>
                            <div className="product-card bg-body rounded overflow-hidden">
                                {product.link ? (
                                    <Link
                                        href={product.link}
                                        target={(product as any).openNewTab ? '_blank' : '_self'}
                                        rel={(product as any).openNewTab ? 'noopener noreferrer' : undefined}
                                        className="d-block"
                                    >
                                        <Image
                                            className="w-100 rounded"
                                            src="https://www.artvinticaret.com.tr/gecici/lassa/Lassa-Revola.jpg"
                                            alt={product.description || `Ürün ${index + 1}`}
                                            width={300}
                                            height={300}
                                            style={{ objectFit: 'cover' }}
                                        />
                                    </Link>
                                ) : (
                                    <Image
                                        className="w-100 rounded"
                                        src="https://www.artvinticaret.com.tr/gecici/lassa/Lassa-Revola.jpg"
                                        alt={product.description || `Ürün ${index + 1}`}
                                        width={300}
                                        height={300}
                                        style={{ objectFit: 'cover' }}
                                    />
                                )}
                                {product.description && (
                                    <div className="p-3">
                                        <p className="fs-sm text-truncate mb-0">{product.description}</p>
                                    </div>
                                )}
                            </div>
                        </SwiperSlide>
                    ))}
                </Swiper>

                {/* Navigation Buttons */}
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