'use client';
import React from 'react';
import AlastikDraggableBanner from '@components/alastik/shop/DraggableBanner';
import LjaDraggableBanner from '@components/lastikjantavm/shop/DraggableBanner';

type Props = {
    site?: string;
    sliderKey?: string;
    slidesPerView?: number;
    slidesPerViewMobile?: number;
    slidesPerViewTablet?: number;
    spaceBetween?: number;
};

export default function DraggableBannerPage({ site = 'alastik', ...rest }: Props) {
    const DraggableBanner = site === 'lastikjantavm' ? LjaDraggableBanner : AlastikDraggableBanner;
    return <DraggableBanner site={site} {...rest} />;
}