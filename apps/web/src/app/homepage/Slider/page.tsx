'use client';
import React from 'react';
import AlastikSlider from '@components/alastik/homepage/Slider/Main';
import LjaSlider from '@components/lastikjantavm/homepage/Slider/Main';

type Props = { site?: string };

export default function HomeSlider({ site = 'alastik' }: Props) {
    const Slider = site === 'lastikjantavm' ? LjaSlider : AlastikSlider;
    return <Slider />;
}