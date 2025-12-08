'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';

// Services
import { getSliderByKey, getSliderImageUrl } from '@/src/services/sliderService';

// Types
import type { Slider } from '@/src/types/slider';

// Swiper CSS
import 'swiper/css';
import 'swiper/css/navigation';

interface DraggableBannerProps {
    sliderKey: string;
    // Override ayarları (opsiyonel)
    slidesPerView?: number;
    slidesPerViewMobile?: number;
    slidesPerViewTablet?: number;
    spaceBetween?: number;
    loop?: boolean;
    showNavigation?: boolean;
}

export default function DraggableBanner({
    sliderKey,
    slidesPerView = 4,
    slidesPerViewMobile = 2,
    slidesPerViewTablet = 2,
    spaceBetween = 20,
    loop = false,
    showNavigation = true
}: DraggableBannerProps) {
    const [slider, setSlider] = useState<Slider | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSlider = async () => {
            try {
                const data = await getSliderByKey(sliderKey);
                setSlider(data);
            } catch (error) {
                console.error('Banner slider yuklenemedi:', error);
            } finally {
                setLoading(false);
            }
        };

        if (sliderKey) {
            fetchSlider();
        } else {
            setLoading(false);
        }
    }, [sliderKey]);

    // Loading
    if (loading) {
        return (
            <section id="draggable_banner" className="position-relative">
                <div className="container">
                    <div className="row">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="col-6 col-md-3 mb-3">
                                <div
                                    className="bg-secondary bg-opacity-25 rounded"
                                    style={{ height: 150 }}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    // Slider yoksa veya boşsa gösterme
    if (!slider || !slider.sliders || slider.sliders.length === 0) {
        return null;
    }

    // Props override > DB settings > default
    const settings = slider.settings || {};
    const finalSlidesPerView = slidesPerView || settings.slidesPerView || 4;
    const finalSlidesPerViewMobile = slidesPerViewMobile || settings.slidesPerViewMobile || 2;
    const finalSlidesPerViewTablet = slidesPerViewTablet || settings.slidesPerViewTablet || 2;
    const finalSpaceBetween = spaceBetween || settings.spaceBetween || 20;
    const finalLoop = loop !== undefined ? loop : (settings.loop !== undefined ? settings.loop : false);
    const finalShowNav = showNavigation !== undefined ? showNavigation : (settings.showNavButtons !== false);

    return (
        <section id="draggable_banner" className="position-relative">
            <div className="container">
                <div className="row-fluid">
                    <Swiper
                        modules={[Navigation]}
                        loop={finalLoop && slider.sliders.length > finalSlidesPerView}
                        slidesPerView={finalSlidesPerViewMobile}
                        spaceBetween={finalSpaceBetween}
                        navigation={finalShowNav ? {
                            nextEl: `.banner_btn_next_${sliderKey}`,
                            prevEl: `.banner_btn_prev_${sliderKey}`,
                        } : false}
                        breakpoints={{
                            600: {
                                slidesPerView: finalSlidesPerViewTablet,
                            },
                            1000: {
                                slidesPerView: finalSlidesPerView,
                            },
                        }}
                        className="hover-effect-opacity"
                    >
                        {slider.sliders.map((slide, index) => (
                            <SwiperSlide key={index} className="rounded">
                                {slide.link ? (
                                    <Link
                                        href={slide.link}
                                        target={slide.openNewTab ? '_blank' : '_self'}
                                        rel={slide.openNewTab ? 'noopener noreferrer' : undefined}
                                    >
                                        <Image
                                            className="homepage_banner rounded"
                                            src={getSliderImageUrl(slide.image)}
                                            alt={slide.description || `${slider.name} - Banner ${index + 1}`}
                                            width={400}
                                            height={200}
                                            style={{ objectFit: 'cover', width: '100%', height: 'auto' }}
                                        />
                                    </Link>
                                ) : (
                                    <Image
                                        className="homepage_banner rounded"
                                        src={getSliderImageUrl(slide.image)}
                                        alt={slide.description || `${slider.name} - Banner ${index + 1}`}
                                        width={400}
                                        height={200}
                                        style={{ objectFit: 'cover', width: '100%', height: 'auto' }}
                                    />
                                )}
                            </SwiperSlide>
                        ))}

                        {finalShowNav && (
                            <>
                                <div className="position-absolute top-50 start-0 z-2 translate-middle-y ms-3 ms-sm-4 hover-effect-target">
                                    <button
                                        type="button"
                                        className={`btn banner_btn_prev_${sliderKey} btn-icon btn-primary border-0 rounded-circle animate-slide-start`}
                                        aria-label="Onceki"
                                    >
                                        <i className="ci-chevron-left fs-lg animate-target"></i>
                                    </button>
                                </div>

                                <div className="position-absolute top-50 end-0 z-2 translate-middle-y me-3 me-sm-4 hover-effect-target">
                                    <button
                                        type="button"
                                        className={`btn banner_btn_next_${sliderKey} btn-icon btn-primary border-0 rounded-circle animate-slide-end`}
                                        aria-label="Sonraki"
                                    >
                                        <i className="ci-chevron-right fs-lg animate-target"></i>
                                    </button>
                                </div>
                            </>
                        )}
                    </Swiper>
                </div>
            </div>
        </section>
    );
}