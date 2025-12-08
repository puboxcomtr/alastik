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
      <div className="offcanvas offcanvas-end pb-sm-2 px-sm-2" id="shoppingCart" tabIndex={-1}
        aria-labelledby="shoppingCartLabel" style={{ width: '500px' }}>
        {/* Header */}
        <div className="offcanvas-header flex-column align-items-start py-3 pt-lg-4">
          <div className="d-flex align-items-center justify-content-between w-100 mb-3 mb-lg-4">
            <h4 className="offcanvas-title" id="shoppingCartLabel">Alışveriş Sepetim</h4>
            <button type="button" className="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
          </div>
          <div className="alert alert-success text-dark-emphasis fs-sm border-0 rounded-4 mb-0" role="alert">
            Tebrikler 🎉 Sepetinize <span className="fw-semibold">4 adet veya daha fazla lastik</span> eklediniz. Bu
            alışverişinize özel olarak, lastik montaj
            hizmetimiz <span className="fw-semibold">tamamen ücretsiz!</span>
          </div>
          <div className="progress w-100" role="progressbar" aria-label="Free shipping progress" aria-valuenow={78}
            aria-valuemin={0} aria-valuemax={100} style={{ height: '4px' }}>
            <div className="progress-bar bg-dark rounded-pill d-none-dark" style={{ width: '78%' }}></div>
            <div className="progress-bar bg-light rounded-pill d-none d-block-dark" style={{ width: '78%' }}></div>
          </div>
        </div>
        <div className="offcanvas-body d-flex flex-column gap-4 pt-2">

          {/* Item */}
          <div className="d-flex align-items-center">
            <a className="flex-shrink-0" href="urun-detay.html">
              <img src="/assets/img/shop/pirelli.jpg" className="bg-body-tertiary rounded" width="110" alt="Ürün Adı - Site Adı" />
            </a>
            <div className="w-100 min-w-0 ps-3">
              <h5 className="d-flex animate-underline mb-2">
                <a className="d-block fs-sm fw-medium text-truncate animate-target" href="urun-detay.html">Leather
                  Pirelli SottoZero Serie 3 RFT BMW(*) Mercedes (MO) 245/45R18 100V XL
                </a>
              </h5>
              <div className="h6 pb-1 mb-2">9.813,96 TL</div>
              <div className="d-flex align-items-center justify-content-between">
                <div className="count-input rounded-2">
                  <button type="button" className="btn btn-icon btn-sm" data-decrement="" aria-label="Decrement quantity">
                    <i className="ci-minus"></i>
                  </button>
                  <input type="number" className="form-control form-control-sm" value="1" readOnly />
                  <button type="button" className="btn btn-icon btn-sm" data-increment="" aria-label="Increment quantity">
                    <i className="ci-plus"></i>
                  </button>
                </div>
                <button type="button" className="btn-close fs-sm" data-bs-toggle="tooltip" data-bs-custom-class="tooltip-sm"
                  data-bs-title="Ürünü Sil" aria-label="Ürünü Sil"></button>
              </div>
            </div>
          </div>

          {/* Item */}
          <div className="d-flex align-items-center">
            <a className="flex-shrink-0" href="urun-detay.html">
              <img src="/assets/img/shop/pirelli.jpg" className="bg-body-tertiary rounded" width="110" alt="Ürün Adı - Site Adı" />
            </a>
            <div className="w-100 min-w-0 ps-3">
              <h5 className="d-flex animate-underline mb-2">
                <a className="d-block fs-sm fw-medium text-truncate animate-target" href="urun-detay.html">Leather
                  Pirelli SottoZero Serie 3 RFT BMW(*) Mercedes (MO) 245/45R18 100V XL
                </a>
              </h5>
              <div className="h6 pb-1 mb-2">9.813,96 TL</div>
              <div className="d-flex align-items-center justify-content-between">
                <div className="count-input rounded-2">
                  <button type="button" className="btn btn-icon btn-sm" data-decrement="" aria-label="Decrement quantity">
                    <i className="ci-minus"></i>
                  </button>
                  <input type="number" className="form-control form-control-sm" value="1" readOnly />
                  <button type="button" className="btn btn-icon btn-sm" data-increment="" aria-label="Increment quantity">
                    <i className="ci-plus"></i>
                  </button>
                </div>
                <button type="button" className="btn-close fs-sm" data-bs-toggle="tooltip" data-bs-custom-class="tooltip-sm"
                  data-bs-title="Ürünü Sil" aria-label="Ürünü Sil"></button>
              </div>
            </div>
          </div>

          {/* Item */}
          <div className="d-flex align-items-center">
            <a className="flex-shrink-0" href="urun-detay.html">
              <img src="/assets/img/shop/pirelli.jpg" className="bg-body-tertiary rounded" width="110" alt="Ürün Adı - Site Adı" />
            </a>
            <div className="w-100 min-w-0 ps-3">
              <h5 className="d-flex animate-underline mb-2">
                <a className="d-block fs-sm fw-medium text-truncate animate-target" href="urun-detay.html">Leather
                  Pirelli SottoZero Serie 3 RFT BMW(*) Mercedes (MO) 245/45R18 100V XL
                </a>
              </h5>
              <div className="h6 pb-1 mb-2">9.813,96 TL</div>
              <div className="d-flex align-items-center justify-content-between">
                <div className="count-input rounded-2">
                  <button type="button" className="btn btn-icon btn-sm" data-decrement="" aria-label="Decrement quantity">
                    <i className="ci-minus"></i>
                  </button>
                  <input type="number" className="form-control form-control-sm" value="1" readOnly />
                  <button type="button" className="btn btn-icon btn-sm" data-increment="" aria-label="Increment quantity">
                    <i className="ci-plus"></i>
                  </button>
                </div>
                <button type="button" className="btn-close fs-sm" data-bs-toggle="tooltip" data-bs-custom-class="tooltip-sm"
                  data-bs-title="Ürünü Sil" aria-label="Ürünü Sil"></button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="offcanvas-header flex-column align-items-start">
          <div className="d-flex align-items-center justify-content-between w-100 mb-3 mb-md-4">
            <span className="text-light-emphasis">Toplam:</span>
            <span className="h6 mb-0">29.441,88 TL</span>
          </div>
          <div className="d-flex w-100 gap-3">
            <a className="btn btn-lg btn-secondary w-100" href="#!">Sepete Git</a>
            <a className="btn btn-lg btn-dark w-100" href="#!">Ödemeyi Tamamla</a>
          </div>
        </div>
      </div>
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

        {/* Product Single Slider */}
        <SingleShowCase showcaseKey="third" />

        {/* Two Banner */}
        <Banner />

        {/* Product Showcase */}
        <ProductShowCase showcaseKey="fourth" />

        {/* Two Banner */}
        <Banner />

        {/* ProductShowcase */}
        <ProductShowCase showcaseKey="fifth" />

        {/* Customer Comments */}
        <Testimonials />

        {/* Blog */}
        <HomeBlog />
      </main>
      <div className="offcanvas offcanvas-top" id="searchBox" tabIndex={-1} aria-labelledby="searchBoxLabel">
        <div className="offcanvas-header">
          <h5 className="offcanvas-title" id="searchBoxLabel">Ürün Ara</h5>
          <button type="button" className="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
        </div>
        <div className="offcanvas-body">
          <div className="position-relative">
            <input type="text" className="form-control form-icon-end"
              placeholder="Ürün Adı, stok kodu veya lastik ebatı ile arama yapabilirsiniz.."
              aria-label="Ürün Adı, stok kodu veya lastik ebatı ile arama yapabilirsiniz.." />
            <i className="ci-search position-absolute top-50 end-0 translate-middle-y me-3"></i>
          </div>
        </div>
      </div>
    </>
  );
}
