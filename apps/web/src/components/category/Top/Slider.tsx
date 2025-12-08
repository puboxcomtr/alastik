'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from "next/image";

// Swiper
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';

// Services
import { getSliderById, getSliderImageUrl } from '@/src/services/sliderService';

// Types
import type { Slider } from '@/src/types/slider';

// Swiper CSS
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

interface CategorySliderProps {
    sliderId?: string | null;
}

export default function CategorySlider({ sliderId }: CategorySliderProps) {
    const [slider, setSlider] = useState<Slider | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSlider = async () => {
            if (!sliderId) {
                setLoading(false);
                return;
            }

            try {
                const data = await getSliderById(sliderId);
                setSlider(data);
            } catch (error) {
                console.error('Slider fetch error:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSlider();
    }, [sliderId]);

    // Slider yoksa veya yükleniyorsa gösterme
    if (loading) {
        return null;
    }

    if (!slider || !slider.sliders || slider.sliders.length === 0) {
        return null;
    }

    // Sadece aktif sliderları filtrele
    const activeSlides = slider.sliders.filter(s => s.isActive !== false);

    if (activeSlides.length === 0) {
        return null;
    }

    const settings = slider.settings || {};

    return (
        <Swiper
            modules={[Pagination, Autoplay]}
            loop={settings.loop !== false && activeSlides.length > 1}
            autoplay={settings.autoStart ? {
                delay: parseInt(settings.displayDuration) || 5000,
                disableOnInteraction: false
            } : false}
            speed={parseInt(settings.changeSpeed) || 500}
            pagination={settings.showDots !== false ? { clickable: true } : false}
            slidesPerView={1}
            spaceBetween={0}
            className="category-slider hover-effect-opacity mb-4"
        >
            {activeSlides.map((slide, index) => (
                <SwiperSlide key={index} className="rounded">
                    {slide.link ? (
                        <Link
                            href={slide.link}
                            target={slide.openNewTab ? '_blank' : '_self'}
                            className="w-100 d-flex align-items-center justify-content-center"
                        >
                            <Image
                                className="rounded"
                                src={getSliderImageUrl(slide.image)}
                                alt={slide.description || `${slider.name} - Slide ${index + 1}`}
                                width={parseInt(settings.width) || 1260}
                                height={parseInt(settings.height) || 500}
                                style={{ objectFit: 'cover', maxWidth: '100%', height: 'auto' }}
                                priority={index === 0}
                            />
                        </Link>
                    ) : (
                        <div className="w-100 d-flex align-items-center justify-content-center">
                            <Image
                                className="rounded"
                                src={getSliderImageUrl(slide.image)}
                                alt={slide.description || `${slider.name} - Slide ${index + 1}`}
                                width={parseInt(settings.width) || 1260}
                                height={parseInt(settings.height) || 500}
                                style={{ objectFit: 'cover', maxWidth: '100%', height: 'auto' }}
                                priority={index === 0}
                            />
                        </div>
                    )}
                </SwiperSlide>
            ))}
        </Swiper>
    );
}