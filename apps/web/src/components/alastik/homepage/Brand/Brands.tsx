'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay } from 'swiper/modules';

import { buildBrandUrl } from '@/src/config/routes';

import type { HomepageBrand } from '@/src/types/brand';

import { getHomepageBrands, getBrandImageUrl } from '@/src/services/brandService';

import 'swiper/css';

export default function Brand() {
    const [brands, setBrands] = useState<HomepageBrand[]>([]);

    useEffect(() => {
        const fetchBrands = async () => {
            try {
                const response = await getHomepageBrands();

                if (response.success && response.data.length > 0) {
                    setBrands(response.data);
                }
            } catch (err) {
                console.error('Brand fetch error:', err);
            }
        };

        fetchBrands();
    }, []);
    if (brands.length === 0) {
        return null;
    }

    return (
        <section id="brand_list" className="position-relative pt-md-5 pb-md-4 pt-2 pb-2">
            <div className="container">
                <div className="row-fluid">
                    <Swiper
                        modules={[Navigation, Autoplay]}
                        loop={brands.length > 10}
                        slidesPerView={3}
                        spaceBetween={10}
                        autoplay={{
                            delay: 3000,
                            disableOnInteraction: false,
                        }}
                        navigation={{
                            nextEl: ".brand_btn_next",
                            prevEl: ".brand_btn_prev",
                        }}
                        breakpoints={{
                            600: {
                                slidesPerView: 5,
                            },
                            768: {
                                slidesPerView: 6,
                            },
                            1000: {
                                slidesPerView: 9,
                            },
                        }}
                        className="hover-effect-opacity"
                    >
                        {brands.map((brand) => (
                            <SwiperSlide key={brand._id}>
                                <Link
                                    href={buildBrandUrl(brand.seoUrl || brand.slug)}
                                    className="p-0"
                                    title={brand.name}
                                    style={{ minHeight: 86 }}
                                >
                                    {brand.logo ? (
                                        <Image
                                            src={getBrandImageUrl(brand.logo)}
                                            alt={brand.logoAlt}
                                            width={120}
                                            height={0}
                                            className="img-fluid rounded-2 brand-logo-img"
                                            style={{
                                                objectFit: 'contain',
                                                width: '120px',
                                                height: 'auto'
                                            }}
                                            unoptimized
                                        />
                                    ) : (
                                        <span className="text-muted fw-medium text-center">
                                            {brand.name}
                                        </span>
                                    )}
                                </Link>
                            </SwiperSlide>
                        ))}
                    </Swiper>
                </div>
            </div>
        </section>
    );
}