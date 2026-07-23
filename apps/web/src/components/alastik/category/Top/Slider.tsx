'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from "next/image";

import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Autoplay } from 'swiper/modules';

import { getSliderById, getSliderImageUrl } from '@/src/services/sliderService';
import type { Slider } from '@/src/types/slider';

import 'swiper/css';
import 'swiper/css/pagination';

interface CategorySliderProps {
    sliderId?: string | null;
}

export default function CategorySlider({ sliderId }: CategorySliderProps) {
    const [slider, setSlider] = useState<Slider | null>(null);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    useEffect(() => {
        const fetchSlider = async () => {
            if (!sliderId) return;
            try {
                const data = await getSliderById(sliderId);
                setSlider(data);
            } catch (error) {
                console.error('Slider fetch error:', error);
            }
        };
        fetchSlider();
    }, [sliderId]);

    if (isMobile) return null;
    if (!slider || !slider.sliders || slider.sliders.length === 0) return null;

    const activeSlides = slider.sliders.filter(s => s.isActive !== false);
    if (activeSlides.length === 0) return null;

    const settings = slider.settings || {};
    const width = parseInt(settings.width) || 1260;
    const height = parseInt(settings.height) || 500;
    const showDots = settings.showDots !== false;
    const autoStart = settings.autoStart;
    const displayDuration = parseInt(settings.displayDuration) || 5000;

    const autoplayConfig = autoStart ? { delay: displayDuration, disableOnInteraction: false } : undefined;

    const modules = [];
    if (showDots) modules.push(Pagination);
    if (autoStart) modules.push(Autoplay);

    return (
        <Swiper
            modules={modules}
            loop={settings.loop !== false && activeSlides.length > 1}
            autoplay={autoplayConfig}
            speed={300}
            pagination={showDots ? { clickable: true } : false}
            className="mb-4"
        >
            {activeSlides.map((slide, index) => (
                <SwiperSlide key={index} className="rounded">
                    {slide.link ? (
                        <Link
                            href={slide.link}
                            target={slide.openNewTab ? '_blank' : '_self'}
                            rel={slide.openNewTab ? 'noopener noreferrer' : undefined}
                        >
                            <Image
                                className="slide__item w-100 rounded"
                                src={getSliderImageUrl(slide.image)}
                                alt={slide.description || `${slider.name} - Slide ${index + 1}`}
                                width={width}
                                height={height}
                                priority={index === 0}
                                quality={95}
                            />
                        </Link>
                    ) : (
                        <Image
                            className="slide__item w-100 rounded"
                            src={getSliderImageUrl(slide.image)}
                            alt={slide.description || `${slider.name} - Slide ${index + 1}`}
                            width={width}
                            height={height}
                            priority={index === 0}
                            quality={95}
                        />
                    )}
                </SwiperSlide>
            ))}
        </Swiper>
    );
}