'use client';
import React, { useEffect, useState } from 'react';

// Components
import SliderComponent from '@components/homepage/Slider/Slider';

// Services
import { getSliderById } from '@/src/services/sliderService';

// Context
import { useSettings } from '@/src/context/SettingsContext';

// Types
import type { Slider } from '@/src/types/slider';

export default function HomeSlider() {
    const [slider, setSlider] = useState<Slider | null>(null);
    const { theme } = useSettings();

    useEffect(() => {
        const fetchSlider = async () => {
            if (!theme?.sliderSelect) {
                return;
            }

            try {
                const sliderData = await getSliderById(theme.sliderSelect);
                setSlider(sliderData);
            } catch (error) {
                console.error('Slider yüklenemedi:', error);
            }
        };

        fetchSlider();
    }, [theme?.sliderSelect]);
    if (!slider || slider.sliders.length === 0) {
        return null;
    }

    return <SliderComponent slider={slider} />;
}