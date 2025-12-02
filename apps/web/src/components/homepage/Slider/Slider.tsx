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
    const changeSpeed = parseInt(settings.changeSpeed) || 5000;
    const autoStart = settings.autoStart === true;
    const autoplayConfig = autoStart ? {
        delay: changeSpeed,
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
                                            className="w-100 rounded"
                                            src={getImageUrl(slide.image)}
                                            alt={slide.description || `${slider.name} - Slider ${index + 1}`}
                                            width={width}
                                            height={height}
                                            priority={index === 0}
                                        />
                                    </Link>
                                ) : (
                                    <Image
                                        className="w-100 rounded"
                                        src={getImageUrl(slide.image)}
                                        alt={slide.description || `${slider.name} - Slider ${index + 1}`}
                                        width={width}
                                        height={height}
                                        priority={index === 0}
                                    />
                                )}
                            </SwiperSlide>
                        ))}
                    </Swiper>
                </div>
            </div>
        </section>
    );
}