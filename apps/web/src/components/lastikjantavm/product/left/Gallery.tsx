"use client";
import React, { useState, useEffect } from "react";

/* Library */
import "/public/lastikjantavm/assets/css/modules/ProductGallery.css";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import Lightbox from "yet-another-react-lightbox";

/* Resize Image */
import { resizeMultipleImages } from "@lib/resize";

/* MUI */
import { Typography } from '@mui/material';

/* Swiper */
import "swiper/css";
import "swiper/css/navigation";
import "yet-another-react-lightbox/styles.css";

/* Helpers */
import { getProductImages } from '@src/hooks/Products/productHelpers';
import type { Product } from '@src/types/products';

interface GalleryProps {
    product: Product;
}

type ProductVideo = { url: string; videoId: string; title?: string };

// Galeride gösterilen her öğe: ya görsel ya video
type MedyaOgesi =
    | { tip: 'gorsel'; gorselIndex: number }
    | { tip: 'video'; video: ProductVideo };

export default function ProductGallery({ product }: GalleryProps) {
    const productImages = getProductImages(product);
    const originalImages = productImages.map(img => img.url);
    const imageAlts = productImages.map(img => img.alt);

    const videos: ProductVideo[] = (product as any)?.customData?.videos || [];

    // Video daima ikinci sırada: ilk görsel, sonra videolar, ardından kalan görseller
    const medya: MedyaOgesi[] = [
        ...(originalImages.length > 0 ? [{ tip: 'gorsel', gorselIndex: 0 } as MedyaOgesi] : []),
        ...videos.map(video => ({ tip: 'video', video } as MedyaOgesi)),
        ...originalImages.slice(1).map((_, i) => ({ tip: 'gorsel', gorselIndex: i + 1 } as MedyaOgesi))
    ];

    const [activeIndex, setActiveIndex] = useState<number>(0);
    const [open, setOpen] = useState<boolean>(false);

    const [mainImages, setMainImages] = useState<string[]>(originalImages);
    const [thumbnailImages, setThumbnailImages] = useState<string[]>(originalImages);

    useEffect(() => {
        const resizeAllImages = async (): Promise<void> => {
            try {
                const resizedMainImages = await resizeMultipleImages(originalImages, 350, 350);

                setMainImages(resizedMainImages);

                const resizedThumbnails = await resizeMultipleImages(originalImages, 111, 111);

                setThumbnailImages(resizedThumbnails);
            } catch (error) {
                console.warn('Görsel resize edilemedi, orijinal görseller kullanılıyor:', error);
            }
        };

        if (originalImages.length > 0) {
            resizeAllImages();
        }
    }, [product._key]);

    const aktif = medya[activeIndex];
    const ilkVideoIndex = medya.findIndex(m => m.tip === 'video');
    const videoThumb = (videoId: string) => `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;

    // Işık kutusu yalnızca görselleri içerir; aktif görselin oradaki sırası
    const aktifGorselIndex = aktif?.tip === 'gorsel' ? aktif.gorselIndex : 0;

    return (
        <div>
            <div className="mainProductGallery position-relative">
                {/* Videolu ürün rozeti — tıklanınca galeride videoya geçer */}
                {videos.length > 0 && (
                    <button
                        type="button"
                        className="position-absolute top-0 start-0 z-2 mt-2 ms-2 badge rounded-pill text-bg-danger border-0"
                        onClick={() => setActiveIndex(ilkVideoIndex)}
                    >
                        Videolu Ürün
                    </button>
                )}

                {aktif?.tip === 'video' ? (
                    // Görsellerle aynı kare alan
                    <div className="main__image" style={{ aspectRatio: '1 / 1', width: '100%' }}>
                        <iframe
                            src={`https://www.youtube.com/embed/${aktif.video.videoId}`}
                            title={aktif.video.title || product.diaData?.aciklama}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            style={{ width: '100%', height: '100%', border: 0, borderRadius: 4 }}
                        ></iframe>
                    </div>
                ) : (
                    <>
                        <img
                            className="main__image"
                            src={mainImages[aktifGorselIndex]}
                            alt={imageAlts[aktifGorselIndex]}
                            onClick={() => setOpen(true)}
                        />
                        <div className='position-absolute bottom-0 end-0'>
                            <i className="ri-zoom-in-line fs-5" onClick={() => setOpen(true)}></i>
                        </div>
                    </>
                )}
            </div>

            <Swiper
                modules={[Navigation]}
                slidesPerView={3}
                spaceBetween={50}
                loop={medya.length > 3}
                allowTouchMove={true}
                navigation={{
                    nextEl: '.swiper-button-next',
                    prevEl: '.swiper-button-prev',
                    disabledClass: 'swiper-button-disabled-custom',
                }}
                style={{ position: 'relative', width: '100%' }}
            >
                {medya.map((oge, i) => (
                    <SwiperSlide key={oge.tip === 'video' ? `video-${oge.video.videoId}` : `gorsel-${oge.gorselIndex}`}>
                        <div className={`productGallery position-relative ${i === activeIndex ? 'active' : ''}`}>
                            <img
                                src={oge.tip === 'video' ? videoThumb(oge.video.videoId) : thumbnailImages[oge.gorselIndex]}
                                alt={oge.tip === 'video' ? (oge.video.title || 'Ürün videosu') : imageAlts[oge.gorselIndex]}
                                style={{
                                    width: "90px",
                                    height: "90px",
                                    objectFit: "cover"
                                }}
                                onClick={() => setActiveIndex(i)}
                            />
                            {oge.tip === 'video' && (
                                <i
                                    className="ri-play-circle-fill position-absolute top-50 start-50 translate-middle text-white"
                                    style={{ fontSize: '28px', pointerEvents: 'none', textShadow: '0 0 6px rgba(0,0,0,.6)' }}
                                ></i>
                            )}
                        </div>
                    </SwiperSlide>
                ))}

                {medya.length > 3 && (
                    <>
                        <div className="swiper-button-prev custom-button-prev"></div>
                        <div className="swiper-button-next custom-button-next"></div>
                    </>
                )}
            </Swiper>

            <Typography className='text-muted fs-xs my-3'>
                Ürün görselleri örnek niteliğindedir ve teslim edilen ürünlerle farklılık gösterebilir. Gösterilen jantlar teslimat kapsamına dahil değildir.
            </Typography>

            {open && aktif?.tip === 'gorsel' && (
                <Lightbox
                    open={open}
                    close={() => setOpen(false)}
                    slides={originalImages.map((src, i) => ({
                        src,
                        alt: imageAlts[i]
                    }))}
                    index={aktifGorselIndex}
                    carousel={{ finite: originalImages.length <= 3 }}
                    on={{
                        // Işık kutusundaki görsel, galerideki karşılığına eşlenir
                        view: ({ index }: { index: number }) => {
                            const hedef = medya.findIndex(m => m.tip === 'gorsel' && m.gorselIndex === index);

                            if (hedef !== -1) setActiveIndex(hedef);
                        }
                    }}
                />
            )}
        </div>
    );
}
