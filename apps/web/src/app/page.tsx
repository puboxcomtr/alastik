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
import Brand from '@src/app/homepage/Brand/page';
import DraggableBanner from '@components/shop/DraggableBanner';
import ProductShowCase from '@app/homepage/Product/page';
import SingleShowCase from '@app/homepage/Product/Single/page';
import Testimonials from '@app/homepage/Testimonials/page';

// @İmport
import HomeBlog from '@components/shop/HomeBlog';
import Banner from '@components/shop/Banner';

export default function Home() {
  return (
    <>
      <main className="content-wrapper">
        {/* Lastik & Jant Arama Motor */}
        <MainTireSearch />

        {/* Slider */}
        <HomeSlider />

        {/* Brand Slider */}
        <Brand />

        {/* 4 Set Banner Draggable */}
        <DraggableBanner
          sliderKey="homepage_banner"
          slidesPerView={4}
          slidesPerViewMobile={2}
          slidesPerViewTablet={2}
          spaceBetween={20}
        />

        {/* Product Showcase */}
        <ProductShowCase showcaseKey="second" />

        {/* Two Banner */}
        {/* <Banner /> */}
        
        {/* Product Single Slider */}
        <SingleShowCase showcaseKey="third" />

        {/* Product Showcase */}
        <ProductShowCase showcaseKey="fourth" />

        {/* Two Banner */}
        {/* <Banner /> */}

        {/* ProductShowcase */}
        <ProductShowCase showcaseKey="fifth" />

        {/* Customer Comments */}
        <Testimonials />

        {/* Blog */}
        <HomeBlog />
      </main>
    </>
  );
}
