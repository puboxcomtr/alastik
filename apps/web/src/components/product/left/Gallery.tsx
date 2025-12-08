"use client";
import React, { useState, useEffect } from "react";

/* Library */
import "/public/assets/css/modules/ProductGallery.css";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import Lightbox from "yet-another-react-lightbox";

/* Resize Image */
import { resizeImage, resizeMultipleImages, ResizeError } from "@lib/resize";

/* MUI */
import { Typography } from '@mui/material';

/* Swiper */
import "swiper/css";
import "swiper/css/navigation";
import "yet-another-react-lightbox/styles.css";

export default function ProductGallery() {
    const originalImages = [
        "/assets/img/shop/product1.jpg",
        "/assets/img/shop/product2.jpg",
        "/assets/img/shop/product2.jpg",
        "/assets/img/shop/product2.jpg",
        "/assets/img/shop/product2.jpg",
        "/assets/img/shop/product1.jpg",
    ];

    const [activeIndex, setActiveIndex] = useState<number>(0);
    const [open, setOpen] = useState<boolean>(false);

    // Resize edilmiş görseller için state'ler
    const [mainImages, setMainImages] = useState<string[]>([]);
    const [thumbnailImages, setThumbnailImages] = useState<string[]>([]);
    const [mainLoading, setMainLoading] = useState<boolean>(true);
    const [thumbLoading, setThumbLoading] = useState<boolean>(true);

    // Component mount olduğunda görselleri resize et
    useEffect(() => {
        const resizeAllImages = async (): Promise<void> => {
            try {
                // Ana görsel için 350x350 resize
                setMainLoading(true);
                const resizedMainImages = await resizeMultipleImages(originalImages, 350, 350);
                setMainImages(resizedMainImages);

                // Thumbnail'ler için 111x111 resize
                setThumbLoading(true);
                const resizedThumbnails = await resizeMultipleImages(originalImages, 111, 111);
                setThumbnailImages(resizedThumbnails);

            } catch (error) {
                console.error('Görsel resize hatası:', error as ResizeError);
                // Hata durumunda orijinal görselleri kullan
                setMainImages(originalImages);
                setThumbnailImages(originalImages);
            } finally {
                setMainLoading(false);
                setThumbLoading(false);
            }
        };

        if (originalImages.length > 0) {
            resizeAllImages();
        }
    }, []);

    return (
        <div>
            <div className="mainProductGallery">
                {mainLoading ? (
                    <div className="MainProductLoading">
                        Görsel Yükleniyor...
                    </div>
                ) : (
                    <img
                        src={mainImages[activeIndex] || originalImages[activeIndex]}
                        alt="Ürün görseli"
                        style={{
                            width: "350px",
                            height: "350px",
                        }}
                        onClick={() => setOpen(true)}
                    />
                )}
                <div className='position-absolute bottom-0 end-0'>
                    <i className="ri-zoom-in-line fs-5"></i>
                </div>
            </div>

            <Swiper
                modules={[Navigation]}
                slidesPerView={3}
                spaceBetween={50}
                loop={true}
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
                        <div className={"productGallery"} style={{
                            width: "100px",
                            height: "100px",
                            display: "flex",
                            borderRadius: ".5rem",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: "#f8f9fa",
                            border: i === activeIndex ? "1px solid #000" : "transparent",
                            cursor: "pointer",
                            flexShrink: 0
                        }}>
                            {thumbLoading ? (
                                <span style={{ fontSize: "10px", color: "#666" }}>...</span>
                            ) : (
                                <img
                                    src={thumbnailImages[i] || img}
                                    alt={`Thumbnail ${i + 1}`}
                                    style={{
                                        width: "90px",
                                        height: "90px",
                                    }}
                                    onClick={() => setActiveIndex(i)}
                                />
                            )}
                        </div>
                    </SwiperSlide>
                ))}

                <div className="swiper-button-prev custom-button-prev"></div>
                <div className="swiper-button-next custom-button-next"></div>
            </Swiper>
            <Typography
                className='text-muted fs-xs mt-3'>
                Ürün görselleri örnek niteliğindedir ve teslim edilen ürünlerle farklılık gösterebilir. Gösterilen jantlar teslimat kapsamına dahil değildir.
            </Typography>
            {open && (
                <Lightbox
                    open={open}
                    close={() => setOpen(false)}
                    slides={originalImages.map((src) => ({ src }))}
                    index={activeIndex}
                    carousel={{ finite: true }}
                    on={{
                        view: ({ index }: { index: number }) => setActiveIndex(index)
                    }}
                />
            )}
        </div>
    );
}