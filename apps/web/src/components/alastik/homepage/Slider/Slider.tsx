'use client';
import React from 'react';
import Link from 'next/link';
import Image from "next/image";

// Swiper
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, EffectFade, Autoplay } from 'swiper/modules';

// Swiper CSS
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';

// Types
import type { Slider } from '@/src/types/slider';

const MEDIA_URL = process.env.NEXT_PUBLIC_MEDIA_URL || 'http://localhost:3082';

// Helper fonksiyon
const getImageUrl = (url: string | undefined | null): string => {
    if (!url) return '/images/slider/gorsel-bulunamadi.jpg';
    if (url.startsWith('http')) return url;
    return `${MEDIA_URL}${url.startsWith('/') ? url : '/' + url}`;
};

interface SliderComponentProps {
    slider: Slider;
}

export default function SliderComponent({ slider }: SliderComponentProps) {
    if (!slider || slider.sliders.length === 0) {
        return null;
    }

    const settings = slider.settings || {};
    const width = parseInt(settings.width) || 1260;
    const height = parseInt(settings.height) || 500;
    const showNavButtons = settings.showNavButtons === true;
    const showDots = settings.showDots === true;
    // changeSpeed = "Resimlerin Değişme Süresi" (geçiş animasyonu) → Swiper speed
    // displayDuration = "Resmin Görüntülenme Süresi" (bekleme) → autoplay delay
    // Not: Eski kayıtlarda changeSpeed'e bekleme süresi (5000) girilmiş olabilir; mantıksız
    // büyük değer fade'i saniyelerce sürdürür → makul aralık dışını 500 ms'ye sabitle.
    const rawSpeed = parseInt(settings.changeSpeed) || 500;
    const changeSpeed = rawSpeed >= 100 && rawSpeed <= 2000 ? rawSpeed : 500;
    const displayDuration = parseInt(settings.displayDuration) || 5000;
    const autoStart = settings.autoStart === true;
    const autoplayConfig = autoStart ? {
        delay: displayDuration,
        disableOnInteraction: false,
    } : undefined;
    const modules = [EffectFade];
    if (showDots) modules.push(Pagination);
    if (showNavButtons) modules.push(Navigation);
    if (autoStart) modules.push(Autoplay);

    return (
        <section id="slider_list">
            <div className="container">
                <div className="row-fluid">
                    <Swiper
                        modules={modules}
                        effect="fade"
                        loop
                        speed={changeSpeed}
                        autoplay={autoplayConfig}
                        pagination={showDots ? { clickable: true } : false}
                        navigation={showNavButtons ? {
                            nextEl: ".slide_btn-next",
                            prevEl: ".slide_btn-prev",
                        } : false}
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
                                            className="slide__item w-100 rounded"
                                            src={getImageUrl(slide.image)}
                                            alt={slide.description || `${slider.name} - Slider ${index + 1}`}
                                            width={width}
                                            height={height}
                                            priority={index === 0}
                                            quality={95}
                                        />
                                    </Link>
                                ) : (
                                    <Image
                                        className="slide__item w-100 rounded"
                                        src={getImageUrl(slide.image)}
                                        alt={slide.description || `${slider.name} - Slider ${index + 1}`}
                                        width={width}
                                        height={height}
                                        priority={index === 0}
                                        quality={95}
                                    />
                                )}
                            </SwiperSlide>
                        ))}
                        {showNavButtons && (
                            <>
                                <div className="position-absolute top-50 start-0 z-2 translate-middle-y ms-3 ms-sm-4 hover-effect-target d-none d-lg-block">
                                    <button
                                        type="button"
                                        className="btn slide_btn-prev btn-icon btn-primary border-0 rounded-circle animate-slide-start"
                                        aria-label="Onceki"
                                    >
                                        <i className="ci-chevron-left fs-lg animate-target"></i>
                                    </button>
                                </div>
                                <div className="position-absolute top-50 end-0 z-2 translate-middle-y me-3 me-sm-4 hover-effect-target d-none d-lg-block">
                                    <button
                                        type="button"
                                        className="btn slide_btn-next btn-icon btn-primary border-0 rounded-circle animate-slide-end"
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