'use client';
import React from 'react';
import AlastikBrand from '@components/alastik/homepage/Brand/Brands';
import LjaBrand from '@components/lastikjantavm/homepage/Brand/Brands';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';

type Props = { site?: string };

export default function BrandSlider({ site = 'alastik' }: Props) {
    const Brand = site === 'lastikjantavm' ? LjaBrand : AlastikBrand;
    return <Brand />;
}