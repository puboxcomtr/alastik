'use client';
import React from 'react';
import Link from 'next/link';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, EffectFade, Autoplay } from 'swiper/modules';

/* Swiper CSS */
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';

import ProductCard from '@components/shop/Product/Slide/Card'; 

export default function ProductModelSlide() {
  return (
    <section className="container pb-5 pb-md-0">
      <div className="row-fluid">
        <div className="text-center py-3 py-md-2 mt-lg-5">
          <span style={{ color: '#e2001a' }}>A Lastik'le Serin Sürüş</span>
          <h3>Performanslı Lastik Modelleri</h3>
        </div>
        <div className="position-relative px-4 px-md-3 px-lg-4">
          <div className="row position-relative z-2 justify-content-center">
            {/* Sağdaki küçük ürün kart slider */}
            <div className="col-md-3 col-xl-3 order-md-2 d-flex justify-content-center justify-content-md-end py-4 py-md-3 py-lg-4">
              <Swiper
                modules={[Pagination, Autoplay]}
                spaceBetween={24}
                loop={true}
                speed={400}
                autoplay={{
                  delay: 2000,
                  disableOnInteraction: false,
                }}
                pagination={{ clickable: true }}
                style={{ maxWidth: '416px' }}
              >
                <SwiperSlide>
                  <ProductCard />
                </SwiperSlide>
                <SwiperSlide>
                  <ProductCard />
                </SwiperSlide>
              </Swiper>
            </div>

            {/* Ortadaki text slider */}
            <div className="col-sm-9 col-md-8 col-xl-7 order-md-1 d-flex align-items-center">
              <Swiper
                modules={[EffectFade, Autoplay]}
                allowTouchMove={false}
                loop={true}
                effect="fade"
                fadeEffect={{ crossFade: true }}
                autoplay={{
                  delay: 2000,
                  disableOnInteraction: false,
                }}
                style={{ width: '100%' }}
              >
                <SwiperSlide>
                  <div
                    className=" d-flex align-items-center justify-content-center"
                  >
                    <span className="swipe_slider_text">
                      <h2 className="text-center" style={{ color: '#FFF' }}>
                        Goodyear Eagle F1 Asymmetric 6, aracınıza uyum sağlar ve yol sesini azaltır. Böylece yola daha iyi odaklanırsınız.
                      </h2>
                    </span>
                  </div>
                </SwiperSlide>
                <SwiperSlide>
                  <div
                    className=" d-flex align-items-center justify-content-center"
                  >
                    <span className="swipe_slider_text">
                      <h2 className="text-center" style={{ color: '#FFF' }}>
                        Pirelli <strong>Run Flat</strong> teknolojisi, havası inmiş lastikle sürüşe güvenle devam etmenizi sağlar.
                      </h2>
                    </span>
                  </div>
                </SwiperSlide>
              </Swiper>
            </div>
          </div>

          {/* Background slider */}
          <div className="position-absolute top-0 start-0 w-100 h-100 user-select-none rounded-5">
            <Swiper
              modules={[EffectFade, Autoplay]}
              loop={true}
              effect="fade"
              fadeEffect={{ crossFade: true }}
              autoplay={{
                delay: 2000,
                disableOnInteraction: false,
              }}
              style={{ width: '100%', height: '100%' }}
            >
              <SwiperSlide>
                <span
                  className="position-absolute top-0 start-0 w-100 h-100 rounded-5 d-none-dark"
                  style={{
                    background: `url('/assets/img/bg/good-year-background.jpg')`,
                    backgroundSize: 'cover',
                  }}
                ></span>
                <span
                  className="position-absolute top-0 start-0 w-100 h-100 rounded-5 d-none d-block-dark"
                  style={{
                    background: `url('/assets/img/bg/good-year-background.jpg')`,
                    backgroundSize: 'cover',
                  }}
                ></span>
              </SwiperSlide>
            </Swiper>
          </div>
        </div>
      </div>
    </section>
  );
}
