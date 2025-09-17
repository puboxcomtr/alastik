'use client';
import React from 'react';
import Link from 'next/link';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, EffectFade } from 'swiper/modules';

/* Swiper */
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';

export default function DraggableBanner() {
    return (
        <section id="draggable_banner" className="position-relative">
            <div className="container">
                <div className="row-fluid">
                    <Swiper
                        modules={[Navigation]}
                        loop={false}
                        slidesPerView={2}
                        spaceBetween={20}
                        navigation={{
                            nextEl: '.banner_btn_next',
                            prevEl: '.banner_btn_prev',
                        }}
                        breakpoints={{
                            600: {
                                slidesPerView: 2,
                            },
                            1000: {
                                slidesPerView: 4,
                            },
                        }}
                        className="hover-effect-opacity"
                    >
                        <SwiperSlide className="rounded">
                            <img className="homepage_banner rounded" src="/assets/img/slider/banner1.png" alt="Banner Adı - Site Adı" />
                        </SwiperSlide>
                        <SwiperSlide className="rounded">
                            <img className="homepage_banner rounded" src="/assets/img/slider/banner2.png" alt="Banner Adı - Site Adı" />
                        </SwiperSlide>
                        <SwiperSlide className="rounded">
                            <img className="homepage_banner rounded" src="/assets/img/slider/banner1.png" alt="Banner Adı - Site Adı" />
                        </SwiperSlide>
                        <SwiperSlide className="rounded">
                            <img className="homepage_banner rounded" src="/assets/img/slider/banner2.png" alt="Banner Adı - Site Adı" />
                        </SwiperSlide>
                        <SwiperSlide className="rounded">
                            <img className="homepage_banner rounded" src="/assets/img/slider/banner1.png" alt="Banner Adı - Site Adı" />
                        </SwiperSlide>
                        <SwiperSlide className="rounded">
                            <img className="homepage_banner rounded" src="/assets/img/slider/banner2.png" alt="Banner Adı - Site Adı" />
                        </SwiperSlide>
                        <div className="position-absolute top-50 start-0 z-2 translate-middle-y ms-3 ms-sm-4 hover-effect-target">
                            <button
                                type="button"
                                className="btn banner_btn_prev btn-icon btn-primary border-0 rounded-circle animate-slide-start"
                            >
                                <i className="ci-chevron-left fs-lg animate-target"></i>
                            </button>
                        </div>

                        <div className="position-absolute top-50 end-0 z-2 translate-middle-y me-3 me-sm-4 hover-effect-target">
                            <button
                                type="button"
                                className="btn banner_btn_next btn-icon btn-primary border-0 rounded-circle animate-slide-end"
                            >
                                <i className="ci-chevron-right fs-lg animate-target"></i>
                            </button>
                        </div>
                    </Swiper>
                </div>
            </div>
        </section>
    );
}