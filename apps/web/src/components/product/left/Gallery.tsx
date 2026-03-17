"use client";
import React, { useState, useEffect } from "react";

/* Library */
import "/public/assets/css/modules/ProductGallery.css";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import Lightbox from "yet-another-react-lightbox";

/* Resize Image */
import { resizeMultipleImages, ResizeError } from "@lib/resize";

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

export default function ProductGallery({ product }: GalleryProps) {
    const productImages = getProductImages(product);
    const originalImages = productImages.map(img => img.url);
    const imageAlts = productImages.map(img => img.alt);

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

    return (
        <div>
            <div className="mainProductGallery">
                <img
                    className="main__image"
                    src={mainImages[activeIndex]}
                    alt={imageAlts[activeIndex]}
                    onClick={() => setOpen(true)}
                />
                <div className='position-absolute bottom-0 end-0'>
                    <i className="ri-zoom-in-line fs-5" onClick={() => setOpen(true)}></i>
                </div>
            </div>

            <Swiper
                modules={[Navigation]}
                slidesPerView={3}
                spaceBetween={50}
                loop={originalImages.length > 3}
                allowTouchMove={true}
                navigation={{
                    nextEl: '.swiper-button-next',
                    prevEl: '.swiper-button-prev',
                    disabledClass: 'swiper-button-disabled-custom',
                }}
                style={{ position: 'relative', width: '100%' }}
            >
                {originalImages.map((img, i) => (
                    <SwiperSlide key={i}>
                        <div className={`productGallery ${i === activeIndex ? 'active' : ''}`}>
                            <img
                                src={thumbnailImages[i]}
                                alt={imageAlts[i]}
                                style={{
                                    width: "90px",
                                    height: "90px",
                                    objectFit: "cover"
                                }}
                                onClick={() => setActiveIndex(i)}
                            />
                        </div>
                    </SwiperSlide>
                ))}

                {originalImages.length > 3 && (
                    <>
                        <div className="swiper-button-prev custom-button-prev"></div>
                        <div className="swiper-button-next custom-button-next"></div>
                    </>
                )}
            </Swiper>

            <Typography className='text-muted fs-xs my-3'>
                Ürün görselleri örnek niteliğindedir ve teslim edilen ürünlerle farklılık gösterebilir. Gösterilen jantlar teslimat kapsamına dahil değildir.
            </Typography>

            {open && (
                <Lightbox
                    open={open}
                    close={() => setOpen(false)}
                    slides={originalImages.map((src, i) => ({
                        src,
                        alt: imageAlts[i]
                    }))}
                    index={activeIndex}
                    carousel={{ finite: originalImages.length <= 3 }}
                    on={{
                        view: ({ index }: { index: number }) => setActiveIndex(index)
                    }}
                />
            )}
        </div>
    );
}