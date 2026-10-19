'use client';
import React, { useEffect, useState } from 'react';

import SliderComponent from '@components/lastikjantavm/homepage/Slider/Slider';

import { getSliderById } from '@/src/services/sliderService';

import { useSettings } from '@/src/context/SettingsContext';

import type { Slider } from '@/src/types/slider';

export default function HomeSlider() {
    const [slider, setSlider] = useState<Slider | null>(null);
    const [mobileSlider, setMobileSlider] = useState<Slider | null>(null);
    const [isMobile, setIsMobile] = useState(false);
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
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 992);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    useEffect(() => {
        const fetchMobileSlider = async () => {
            if (!theme?.mobileSelect) return;
            try {
                const data = await getSliderById(theme.mobileSelect);
                setMobileSlider(data);
            } catch (error) {
                console.error('Mobil slider yüklenemedi:', error);
            }
        };
        fetchMobileSlider();
    }, [theme?.mobileSelect]);
    if (isMobile && mobileSlider && mobileSlider.sliders.length > 0) {
        return <SliderComponent slider={mobileSlider} />;
    }

    if (!slider || slider.sliders.length === 0) {
        return null;
    }
    return <SliderComponent slider={slider} />;
}