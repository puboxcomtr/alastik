
import React, { useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';

// Components
import ProductSlideCard  from '@components/shop/Product/Slide/Card';

// Swiper
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';

export default function TireProductSlider() {
  const prevRef = useRef<HTMLElement | null>(null);
  const nextRef = useRef<HTMLElement | null>(null);

  return (
    <div className="featured_products position-relative">
      {<Swiper
        modules={[Navigation, Pagination]}
        onBeforeInit={(swiper) => {
          if (swiper.params.navigation && typeof swiper.params.navigation !== 'boolean') {
            swiper.params.navigation.prevEl = prevRef.current as any;
            swiper.params.navigation.nextEl = nextRef.current as any;
          }
        }}
        pagination={{ clickable: true }}
        spaceBetween={20}
        loop={true}
        className="swiper"
      >
        <SwiperSlide> <ProductSlideCard /> </SwiperSlide>
        <SwiperSlide> <ProductSlideCard /> </SwiperSlide>
        <SwiperSlide> <ProductSlideCard /> </SwiperSlide>
      </Swiper> }
      <div className="swiper-pagination swiper_pagination_product"></div>
    </div>
  );
}
