'use client';
import React from 'react';
import Link from 'next/link';

/* İMG */
import Image from "next/image";

// Swiper
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, EffectFade } from 'swiper/modules';

// Swipper CSS
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';

export default function CategorySlider() {
    return (
        <Swiper
            modules={[EffectFade, Pagination, Navigation]}
            effect="fade"
            loop
            pagination={{ clickable: true }}
            navigation={{
                nextEl: ".slide_btn-next",
                prevEl: ".slide_btn-prev",
            }}
            className="hover-effect-opacity mb-4"
        >
            <SwiperSlide className="rounded">
                <Link className="w-100 d-flex align-items-center justify-content-center" href="/category-details">
                    <Image
                        className="rounded"
                        src="/assets/img/kategori/slider/categoryslide1.png"
                        alt="Slider Adı - Site Adı"
                        width={1260}
                        height={500}
                        priority
                    />
                </Link>
            </SwiperSlide>
            <SwiperSlide className="rounded">
                <Link className="w-100 d-flex align-items-center justify-content-center" href="/category-details">
                    <Image
                        className="rounded"
                        src="/assets/img/kategori/slider/categoryslide2.png"
                        alt="Slider Adı - Site Adı"
                        width={1260}
                        height={500}
                        priority
                    />
                </Link>
            </SwiperSlide>
            <SwiperSlide className="rounded">
                <Link className="w-100 d-flex align-items-center justify-content-center" href="/category-details">
                    <Image
                        className="rounded"
                        src="/assets/img/kategori/slider/categoryslide1.png"
                        alt="Slider Adı - Site Adı"
                        width={1260}
                        height={500}
                        priority
                    />
                </Link>
            </SwiperSlide>
            <SwiperSlide className="rounded">
                <Link className="w-100 d-flex align-items-center justify-content-center" href="/category-details">
                    <Image
                        className="rounded"
                        src="/assets/img/kategori/slider/categoryslide2.png"
                        alt="Slider Adı - Site Adı"
                        width={1260}
                        height={500}
                        priority
                    />
                </Link>
            </SwiperSlide>
            <SwiperSlide className="rounded">
                <Link className="w-100 d-flex align-items-center justify-content-center" href="/category-details">
                    <Image
                        className="rounded"
                        src="/assets/img/kategori/slider/categoryslide1.png"
                        alt="Slider Adı - Site Adı"
                        width={1260}
                        height={500}
                        priority
                    />
                </Link>
            </SwiperSlide>
            <SwiperSlide className="rounded">
                <Link className="w-100 d-flex align-items-center justify-content-center" href="/category-details">
                    <Image
                        className="rounded"
                        src="/assets/img/kategori/slider/categoryslide2.png"
                        alt="Slider Adı - Site Adı"
                        width={1260}
                        height={500}
                        priority
                    />
                </Link>
            </SwiperSlide>
            <SwiperSlide className="rounded">
                <Link className="w-100 d-flex align-items-center justify-content-center" href="/category-details">
                    <Image
                        className="rounded"
                        src="/assets/img/kategori/slider/categoryslide1.png"
                        alt="Slider Adı - Site Adı"
                        width={1260}
                        height={500}
                        priority
                    />
                </Link>
            </SwiperSlide>
            <SwiperSlide className="rounded">
                <Link className="w-100 d-flex align-items-center justify-content-center" href="/category-details">
                    <Image
                        className="rounded"
                        src="/assets/img/kategori/slider/categoryslide2.png"
                        alt="Slider Adı - Site Adı"
                        width={1260}
                        height={500}
                        priority
                    />
                </Link>
            </SwiperSlide>
        </Swiper>
    );
}