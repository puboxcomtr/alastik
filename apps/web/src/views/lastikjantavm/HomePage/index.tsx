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
import CallbackForm from '@components/lastikjantavm/homepage/CallbackForm/CallbackForm';

// @İmport
import HomeBlog from '@app/homepage/Blog/page';
import Banner from '@components/shop/Banner';

export default function LastikJantAvmHomePage() {
  return (
    <>
      <main className="content-wrapper">
        <MainTireSearch site="lastikjantavm" />
        <CallbackForm site="lastikjantavm" />
        <HomeSlider site="lastikjantavm" />
        <Brand site="lastikjantavm" />
        <DraggableBanner
          site="lastikjantavm"
          sliderKey="homepage_banner"
          slidesPerView={2}
          slidesPerViewMobile={1}
          slidesPerViewTablet={2}
          spaceBetween={20}
        />
        <ProductShowCase showcaseKey="second" site="lastikjantavm" />
        <ShowcaseBanner showcaseKey="second" site="lastikjantavm" />
        <SingleShowCase showcaseKey="third" site="lastikjantavm" />
        <ShowcaseBanner showcaseKey="third" site="lastikjantavm" />
        <ProductShowCase showcaseKey="fourth" site="lastikjantavm" />
        <ShowcaseBanner showcaseKey="fourth" site="lastikjantavm" />
        <ProductShowCase showcaseKey="fifth" site="lastikjantavm" />
        <ShowcaseBanner showcaseKey="fifth" site="lastikjantavm" />
        <Testimonials site="lastikjantavm" />
        <HomeBlog site="lastikjantavm" />
      </main>
    </>
  );
}
