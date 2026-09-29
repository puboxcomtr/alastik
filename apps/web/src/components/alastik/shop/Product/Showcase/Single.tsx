'use client';
import React, { useEffect, useState, useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectFade, Autoplay, Pagination } from 'swiper/modules';

import 'swiper/css';
import 'swiper/css/effect-fade';
import 'swiper/css/pagination';

import { API_ENDPOINTS } from '@/src/config/api';
import { buildProductUrl } from '@/src/config/routes';
import ProductSlideCard from '@components/alastik/shop/Product/Slide/Card';
import { getProductStockCode } from '@/src/hooks/Products/productHelpers';

type ShowcaseData = {
    key: string
    title: string
    subtitle: string
    itemsPerRow: number
    products: any[]
}

type Props = {
    showcaseKey?: 'first' | 'second' | 'third' | 'fourth' | 'fifth'
    site?: string
}
const slideConfig: Record<string, { background: string; title: string; description: string; link?: string }> = {
    '1029512-25': {
        background: '/alastik/assets/img/bg/laufenn-i-fit.jpg',
        title: 'Laufenn i Fit+',
        description: 'Zorlu kış koşullarında üstün yol tutuş ve güvenli sürüş deneyimi sunan, 3PMSF sertifikalı kış lastiği.',
        link: '/etiket/laufenn-i-fit',
    },
    '1031619-25': {
        background: '/alastik/assets/img/bg/hankook-ventus-s1-evo.jpg',
        title: 'Hankook Ventus S1 Evo',
        description: 'Güçlü SUV ve 4x4 araçlar için geliştirilen dayanıklı karkas yapısı ve geniş temas yüzeyi sayesinde yüksek ağırlık altında dahi üstün yol tutuş, dengeli sürüş ve güvenli fren performansı sunar.',
        link: '/etiket/hankook-ventus-s1-evo',
    },
    '3949600-25': {
        background: '/alastik/assets/img/bg/pirelli-scorpion-winter.jpg',
        title: 'Pirelli Scorpion Winter',
        description: 'Kış mevsiminin zorlu şartlarına özel olarak, önde gelen otomobil üreticileriyle birlikte geliştirilen SCORPION™ WINTER, Pirelli SUV segmentine yönelik yüksek performanslı kış lastiğidir.',
        link: '/etiket/pirelli-scorpion-winter',
    },
    '214470-25': {
        background: '/alastik/assets/img/bg/competus-winter.jpg',
        title: 'Lassa Competus Winter 2+',
        description: 'Competus Winter 2+, yenilenen sırt deseni ve güçlendirilmiş kış hamuru teknolojisi sayesinde zorlu hava koşullarında yüksek yol tutuş, güvenli frenleme ve dengeli sürüş performansı sunar.',
        link: '/etiket/lassa-competus-winter-2',
    },
    '130950-26': {
        background: '/alastik/assets/img/bg/milestone-suvmile.jpg',
        title: 'Milestone Suvmile H/T',
        description: 'SUV ve Crossover segmenti araçların asfalt yol kullanımı için geliştirilen SuvMile H/T, yüksek sürüş konforu, ıslak ve kuru zeminde üstün tutuş sağlamak üzere tasarlanmıştır.',
        link: '/etiket/milestone-suvmile-ht',
    },
};

export default function SingleShowcase({ showcaseKey = 'third', site = 'alastik' }: Props) {
    const [showcase, setShowcase] = useState<ShowcaseData | null>(null);
    const swiperRef = useRef<any>(null);

    useEffect(() => {
        fetchShowcase();
    }, [showcaseKey, site]);

    const fetchShowcase = async () => {
        try {
            const res = await fetch(API_ENDPOINTS.showcases.homepage(), {
                headers: { 'X-Site': site }
            });
            const result = await res.json();

            if (result.success && result.data) {
                const found = result.data.find((s: ShowcaseData) => s.key === showcaseKey);
                setShowcase(found || null);
            }
        } catch (error) {
            console.error('Vitrin yüklenemedi:', error);
        }
    };

    if (!showcase || !showcase.products || showcase.products.length === 0) {
        return null;
    }

    return (
        <section className="container">
            <div className="row-fluid">
                <div className="position-relative">
                    <Swiper
                        modules={[EffectFade, Autoplay, Pagination]}
                        effect="fade"
                        fadeEffect={{ crossFade: true }}
                        loop={showcase.products.length > 1}
                        speed={600}
                        autoplay={{
                            delay: 9999999,
                            disableOnInteraction: false,
                        }}
                        onSwiper={(swiper) => { swiperRef.current = swiper; }}
                        style={{ borderRadius: '1rem', overflow: 'hidden' }}
                        pagination={{
                            clickable: true,
                            el: '.single-showcase-pagination',
                        }}

                    >

                        {showcase.products.map((product: any, index: number) => (
                            <SwiperSlide key={product._key}>
                                <div
                                    className="single__background position-relative"
                                    style={{
                                        minHeight: '400px',
                                        backgroundImage: `url('${slideConfig[getProductStockCode(product)]?.background || '/alastik/assets/img/bg/hankook-ventus-s1-evo.jpg'}')`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                    }}
                                >
                                    <div className="showcase__group row w-100 position-relative z-2 py-5">
                                        {/* Yazı */}
                                        <div className="col-sm-9 col-md-8 col-xl-7 d-flex flex-column">
                                            <div className="text-center">
                                                <h1 style={{ color: '#FFF' }}>
                                                    {slideConfig[getProductStockCode(product)]?.title
                                                        || product.diaData?.aciklama?.replace(/^LJA/i, 'AKD')
                                                        || showcase.title
                                                        || ''}
                                                </h1>
                                            </div>
                                            {slideConfig[getProductStockCode(product)]?.description && (
                                                <h5 className="showcase__season text-center mx-auto fw-normal">
                                                    {slideConfig[getProductStockCode(product)].description}
                                                </h5>
                                            )}
                                            <div className="text-center mt-3">
                                                <a
                                                    href={slideConfig[getProductStockCode(product)]?.link || buildProductUrl(product.customData?.seoUrl || product._key)}
                                                    className="btn btn-outline-light rounded-pill px-4"
                                                >
                                                    Ürünü İncele
                                                </a>
                                            </div>
                                        </div>
                                        {/* Ürün Kartı */}
                                        <div className="col-md-2 col-xl-3 d-flex justify-content-center justify-content-md-end">
                                            <div style={{ maxWidth: '320px' }}>
                                                <ProductSlideCard product={product} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </SwiperSlide>
                        ))}
                    </Swiper>
                    {/* Prev/Next Butonları */}
                    <button
                        onClick={() => swiperRef.current?.slidePrev()}
                        className="btn btn-icon btn-light d-none d-md-flex rounded-circle position-absolute top-50 start-0 translate-middle-y ms-2 z-3"
                        aria-label="Önceki"
                        style={{ width: '40px', height: '40px', opacity: 0.85 }}
                    >
                        <i className="ci-chevron-left fs-lg"></i>
                    </button>
                    <button
                        onClick={() => swiperRef.current?.slideNext()}
                        className="btn btn-icon btn-light d-none d-md-flex rounded-circle position-absolute top-50 end-0 translate-middle-y me-2 z-3"
                        aria-label="Sonraki"
                        style={{ width: '40px', height: '40px', opacity: 0.85 }}
                    >
                        <i className="ci-chevron-right fs-lg"></i>
                    </button>
                    <div className="single-showcase-pagination d-flex d-md-none justify-content-center gap-1 position-absolute bottom-0 start-0 end-0 mb-3 z-3"></div>
                </div>
            </div>
        </section >
    );
}