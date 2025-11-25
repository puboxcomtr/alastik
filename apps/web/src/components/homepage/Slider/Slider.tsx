'use client';
import React, { useEffect, useState } from 'react';
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

// Services
import { getSliderById } from '@/src/services/sliderService';

// Context
import { useSettings } from '@/src/context/SettingsContext';

// Types
import type { Slider } from '@/src/types/slider';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3082';
export default function HomeSlider() {
    const [slider, setSlider] = useState<Slider | null>(null);
    const [loading, setLoading] = useState(true);
    const { theme } = useSettings();

    useEffect(() => {
        const fetchSlider = async () => {
            if (!theme?.sliderSelect) {
                setLoading(false);
                return;
            }

            try {
                const sliderData = await getSliderById(theme.sliderSelect);
                setSlider(sliderData);
            } catch (error) {
                console.error('Slider yüklenemedi:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSlider();
    }, [theme?.sliderSelect]);
    if (loading || !slider || slider.sliders.length === 0) {
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
                            className="w-100 d-flex align-items-center justify-content-center"
                            href={slide.link}
                            target={slide.openNewTab ? '_blank' : '_self'}
                            rel={slide.openNewTab ? 'noopener noreferrer' : undefined}
                        >
                            <Image
                                className="rounded"
                                src={`${API_BASE_URL}${slide.image}`}
                                alt={slide.description || `${slider.name} - Slider ${index + 1}`}
                                width={width}
                                height={height}
                                priority={index === 0}
                            />
                        </Link>
                    ) : (
                        <div className="w-100 d-flex align-items-center justify-content-center">
                            <Image
                                className="rounded"
                                src={`${API_BASE_URL}${slide.image}`}
                                alt={slide.description || `${slider.name} - Slider ${index + 1}`}
                                width={width}
                                height={height}
                                priority={index === 0}
                            />
                        </div>
                    )}
                </SwiperSlide>
            ))}
        </Swiper>
    );
}