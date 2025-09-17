'use client';
import React from 'react';
import Link from 'next/link';

/* Swiper */
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, EffectFade } from 'swiper/modules';

/* İMG */
import Image from "next/image";

/* Swiper Css */
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';

export default function Brand() {
    return (
        <section id="brand_list" className="position-relative pt-md-4 pb-2">
            <div className="container">
                <div className="row-fluid">
                    <Swiper
                        modules={[Pagination, Navigation]}
                        loop={true}
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
                                slidesPerView: 6,
                            },
                        }}
                        className="hover-effect-opacity"
                    >
                        <SwiperSlide>
                            <Link href="/brands" className="btn btn-outline-secondary w-100 rounded-4 p-3">
                                <Image
                                    src="/assets/img/marka/pirelli.png"
                                    alt="Pirelli Lastikleri - Site Adı"
                                    width={194}
                                    height={60}
                                    className="img-fluid"
                                />
                            </Link>
                        </SwiperSlide>
                           <SwiperSlide>
                            <Link href="/brands" className="btn btn-outline-secondary w-100 rounded-4 p-3">
                                <Image
                                    src="/assets/img/marka/pirelli.png"
                                    alt="Pirelli Lastikleri - Site Adı"
                                    width={194}
                                    height={60}
                                    className="img-fluid"
                                />
                            </Link>
                        </SwiperSlide>
                           <SwiperSlide>
                            <Link href="/brands" className="btn btn-outline-secondary w-100 rounded-4 p-3">
                                <Image
                                    src="/assets/img/marka/pirelli.png"
                                    alt="Pirelli Lastikleri - Site Adı"
                                    width={194}
                                    height={60}
                                    className="img-fluid"
                                />
                            </Link>
                        </SwiperSlide>
                           <SwiperSlide>
                            <Link href="/brands" className="btn btn-outline-secondary w-100 rounded-4 p-3">
                                <Image
                                    src="/assets/img/marka/pirelli.png"
                                    alt="Pirelli Lastikleri - Site Adı"
                                    width={194}
                                    height={60}
                                    className="img-fluid"
                                />
                            </Link>
                        </SwiperSlide>
                           <SwiperSlide>
                            <Link href="/brands" className="btn btn-outline-secondary w-100 rounded-4 p-3">
                                <Image
                                    src="/assets/img/marka/pirelli.png"
                                    alt="Pirelli Lastikleri - Site Adı"
                                    width={194}
                                    height={60}
                                    className="img-fluid"
                                />
                            </Link>
                        </SwiperSlide>
                           <SwiperSlide>
                            <Link href="/brands" className="btn btn-outline-secondary w-100 rounded-4 p-3">
                                <Image
                                    src="/assets/img/marka/pirelli.png"
                                    alt="Pirelli Lastikleri - Site Adı"
                                    width={194}
                                    height={60}
                                    className="img-fluid"
                                />
                            </Link>
                        </SwiperSlide>   <SwiperSlide>
                            <Link href="/brands" className="btn btn-outline-secondary w-100 rounded-4 p-3">
                                <Image
                                    src="/assets/img/marka/pirelli.png"
                                    alt="Pirelli Lastikleri - Site Adı"
                                    width={194}
                                    height={60}
                                    className="img-fluid"
                                />
                            </Link>
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