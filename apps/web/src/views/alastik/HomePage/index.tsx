'use client';
import React from 'react';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';

import MainTireSearch from '@src/app/homepage/TireSearch/page';
import HomeSlider from '@src/app/homepage/Slider/page';
import Brand from '@app/homepage/Brand/page';
import DraggableBanner from '@app/homepage/DraggableBanner/page';
import ShowcaseBanner from '@app/homepage/DraggableBanner/ShowcaseBanner';
import ProductShowCase from '@app/homepage/Product/page';
import SingleShowCase from '@app/homepage/Product/Single/page';
import Testimonials from '@app/homepage/Testimonials/page';

import HomeBlog from '@app/homepage/Blog/page';
import Banner from '@components/shop/Banner';

export default function AlastikHomePage() {
  return (
    <>
      <main className="content-wrapper">
        <MainTireSearch site="alastik" />

        <HomeSlider site="alastik" />

        <Brand site="alastik" />

        <DraggableBanner
          site="alastik"
          sliderKey="homepage_banner"
          slidesPerView={4}
          slidesPerViewMobile={2}
          slidesPerViewTablet={2}
          spaceBetween={20}
        />

        <ProductShowCase showcaseKey="second" site="alastik" />
        <ShowcaseBanner showcaseKey="second" site="alastik" />

        <SingleShowCase showcaseKey="third" site="alastik" />
        <ShowcaseBanner showcaseKey="third" site="alastik" />

        <ProductShowCase showcaseKey="fourth" site="alastik" />
        <ShowcaseBanner showcaseKey="fourth" site="alastik" />

        <ProductShowCase showcaseKey="fifth" site="alastik" />
        <ShowcaseBanner showcaseKey="fifth" site="alastik" />

        <Testimonials site="alastik" />

        <HomeBlog site="alastik" />
      </main>
    </>
  );
}
