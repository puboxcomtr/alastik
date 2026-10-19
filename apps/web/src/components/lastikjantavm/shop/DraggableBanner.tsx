'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

import { getSliderByKey, getSliderImageUrl } from '@/src/services/sliderService';

import type { Slider } from '@/src/types/slider';

interface DraggableBannerProps {
    sliderKey: string;
    site?: string;
    slidesPerView?: number;
    slidesPerViewMobile?: number;
    slidesPerViewTablet?: number;
    spaceBetween?: number;
}

const gridKolonu = (perRow: number): number => {
    const adet = Math.max(1, Math.min(12, Math.round(perRow) || 1));

    return Math.max(1, Math.round(12 / adet));
};

export default function DraggableBanner({
    sliderKey,
    site = 'lastikjantavm',
    slidesPerView,
    slidesPerViewMobile,
    slidesPerViewTablet,
    spaceBetween
}: DraggableBannerProps) {
    const [slider, setSlider] = useState<Slider | null>(null);

    useEffect(() => {
        const fetchSlider = async () => {
            try {
                const data = await getSliderByKey(sliderKey, site);
                setSlider(data);
            } catch (error) {
                console.error('Banner slider yüklenemedi:', error);
            }
        };
        if (sliderKey) {
            fetchSlider();
        }
    }, [sliderKey, site]);

    if (!slider || !slider.sliders || slider.sliders.length === 0) {
        return null;
    }

    const settings = slider.settings || {};
    const finalPerRow = slidesPerView || settings.slidesPerView || 2;
    const finalPerRowMobile = slidesPerViewMobile || settings.slidesPerViewMobile || 1;
    const finalPerRowTablet = slidesPerViewTablet || settings.slidesPerViewTablet || 2;
    const finalSpaceBetween = spaceBetween || settings.spaceBetween || 20;

    const kolonSinifi = [
        `col-${gridKolonu(finalPerRowMobile)}`,
        `col-md-${gridKolonu(finalPerRowTablet)}`,
        `col-lg-${gridKolonu(finalPerRow)}`
    ].join(' ');

    return (
        <section
            id="draggable_banner"
            className="position-relative"
            style={{ paddingTop: `${finalSpaceBetween}px`, paddingBottom: `${finalSpaceBetween}px` }}
        >
            <div className="container">
                <div className="row-fluid">
                    <div
                        className="row"
                        style={{
                            '--cz-gutter-x': `${finalSpaceBetween}px`,
                            '--cz-gutter-y': `${finalSpaceBetween}px`
                        } as React.CSSProperties}
                    >
                        {slider.sliders.map((slide, index) => (
                            <div key={index} className={kolonSinifi}>
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
                                            width={800}
                                            height={400}
                                            quality={95}
                                            style={{ objectFit: 'cover', width: '100%', height: 'auto', marginTop: 0 }}
                                        />
                                    </Link>
                                ) : (
                                    <Image
                                        className="homepage_banner rounded"
                                        src={getSliderImageUrl(slide.image)}
                                        alt={slide.description || `${slider.name} - Banner ${index + 1}`}
                                        width={800}
                                        height={400}
                                        quality={95}
                                        style={{ objectFit: 'cover', width: '100%', height: 'auto', marginTop: 0 }}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
