'use client';
// Next
import React from 'react';

// Library
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';

// @import Shop
import MainTireSearch from '@src/app/homepage/TireSearch/page';
import HomeSlider from '@src/app/homepage/Slider/page';
import Brand from '@app/homepage/Brand/page';
import DraggableBanner from '@app/homepage/DraggableBanner/page';
import ShowcaseBanner from '@app/homepage/DraggableBanner/ShowcaseBanner';
import ProductShowCase from '@app/homepage/Product/page';
import SingleShowCase from '@app/homepage/Product/Single/page';
import Testimonials from '@app/homepage/Testimonials/page';

// @İmport
import HomeBlog from '@app/homepage/Blog/page';
import Banner from '@components/shop/Banner';

export default function AlastikHomePage() {
  return (
    <>
      <main className="content-wrapper">
        {/* Lastik & Jant Arama Motor */}
        <MainTireSearch site="alastik" />

        {/* Slider */}
        <HomeSlider site="alastik" />

        {/* Brand Slider */}
        <Brand site="alastik" />

        {/* 4 Set Banner Draggable */}
        <DraggableBanner
          site="alastik"
          sliderKey="homepage_banner"
          slidesPerView={4}
          slidesPerViewMobile={2}
          slidesPerViewTablet={2}
          spaceBetween={20}
        />

        {/* Product Showcase */}
        <ProductShowCase showcaseKey="second" site="alastik" />
        <ShowcaseBanner showcaseKey="second" site="alastik" />
        {/* Two Banner */}
        {/* <Banner /> */}

        {/* Product Single Slider */}
        <SingleShowCase showcaseKey="third" site="alastik" />
        <ShowcaseBanner showcaseKey="third" site="alastik" />

        {/* Product Showcase */}
        <ProductShowCase showcaseKey="fourth" site="alastik" />
        <ShowcaseBanner showcaseKey="fourth" site="alastik" />

        {/* Two Banner */}
        {/* <Banner /> */}

        {/* ProductShowcase */}
        <ProductShowCase showcaseKey="fifth" site="alastik" />
        <ShowcaseBanner showcaseKey="fifth" site="alastik" />

        {/* Customer Comments */}
        <Testimonials site="alastik" />

        {/* Blog */}
        <HomeBlog site="alastik" />
      </main>
    </>
  );
}
