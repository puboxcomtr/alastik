'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

/* Swiper */
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';

/* Routes */
import { buildBrandUrl } from '@/src/config/routes';

/* Types */
import type { HomepageBrand } from '@/src/types/brand';

/* Service */
import { getHomepageBrands, getBrandImageUrl } from '@/src/services/brandService';

/* Swiper Css */
import 'swiper/css';
import 'swiper/css/navigation';

export default function Brand() {
    const [brands, setBrands] = useState<HomepageBrand[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBrands = async () => {
            try {
                const response = await getHomepageBrands();

                if (response.success && response.data.length > 0) {
                    setBrands(response.data);
                }
            } catch (err) {
                console.error('Brand fetch error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchBrands();
    }, []);

    // Loading state
    if (loading) {
        return (
            <section id="brand_list" className="position-relative pt-md-4 pb-2">
                <div className="container">
                    <div className="row">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="col-6 col-md-2 mb-3">
                                <div className="btn btn-outline-secondary w-100 rounded-4 p-3">
                                    <div
                                        className="bg-secondary bg-opacity-25 rounded"
                                        style={{ height: 60 }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    // Bos state
    if (brands.length === 0) {
        return null;
    }

    return (
        <section id="brand_list" className="position-relative pt-md-5 pb-md-4 pb-2">
            <div className="container">
                <div className="row-fluid">
                    <Swiper
                        modules={[Navigation]}
                        loop={brands.length > 6}
                        slidesPerView={2}
                        spaceBetween={20}
                        navigation={{
                            nextEl: '.brand_btn_next',
                            prevEl: '.brand_btn_prev',
                        }}
                        breakpoints={{
                            600: {
                                slidesPerView: 3,
                            },
                            768: {
                                slidesPerView: 4,
                            },
                            1000: {
                                slidesPerView: 7,
                            },
                        }}
                        className="hover-effect-opacity"
                    >
                        {brands.map((brand) => (
                            <SwiperSlide key={brand._id}>
                                <Link
                                    href={buildBrandUrl(brand.seoUrl)}
                                    className="p-0"
                                    title={brand.name}
                                    style={{ minHeight: 86 }}
                                >
                                    {brand.logo ? (
                                        <Image
                                            src={getBrandImageUrl(brand.logo)}
                                            alt={brand.logoAlt}
                                            width={120}
                                            height={57}
                                            className="img-fluid rounded-2"
                                            style={{ objectFit: 'contain'}}
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

                        {/* Navigation Buttons */}
                        <div className="position-absolute top-50 start-0 z-2 translate-middle-y ms-3 ms-sm-4 hover-effect-target">
                            <button
                                type="button"
                                className="btn brand_btn_prev btn-icon btn-primary border-0 rounded-circle animate-slide-start"
                                aria-label="Onceki"
                            >
                                <i className="ci-chevron-left fs-lg animate-target"></i>
                            </button>
                        </div>

                        <div className="position-absolute top-50 end-0 z-2 translate-middle-y me-3 me-sm-4 hover-effect-target">
                            <button
                                type="button"
                                className="btn brand_btn_next btn-icon btn-primary border-0 rounded-circle animate-slide-end"
                                aria-label="Sonraki"
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