'use client';
import React from 'react';
import Link from 'next/link';

/* Metarial IO */
import { Card, CardContent, Typography, IconButton, Box, Avatar } from '@mui/material';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';

// Swiper
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';

// Swiper CSS
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

export default function Testimonials() {
    return (
        <section className="bg-body-tertiary my-5">
            <div className="container">
                <div className="row-fluid">
                    <h2 className="text-center mb-4">Mutlu Müşteriler</h2>
                    <Box position="relative">
                        <IconButton
                            id="reviewsPrev"
                            aria-label="Prev"
                            sx={{
                                position: 'absolute',
                                top: '50%',
                                left: 0,
                                zIndex: 10,
                                transform: 'translateY(-50%)',
                                bgcolor: 'background.paper',
                            }}
                        >
                            <ChevronLeft />
                        </IconButton>

                        <IconButton
                            id="reviewsNext"
                            aria-label="Next"
                            sx={{
                                position: 'absolute',
                                top: '50%',
                                right: 0,
                                zIndex: 10,
                                transform: 'translateY(-50%)',
                                bgcolor: 'background.paper',
                            }}
                        >
                            <ChevronRight />
                        </IconButton>
                        <Swiper
                            modules={[Navigation, Pagination]}
                            navigation={{ prevEl: '#reviewsPrev', nextEl: '#reviewsNext' }}
                            pagination={{ clickable: true }}
                            spaceBetween={24}
                            loop
                            breakpoints={{
                                0: { slidesPerView: 1 },
                                600: { slidesPerView: 2 },
                                992: { slidesPerView: 3 },
                            }}
                        >
                            {[...Array(5)].map((_, i) => (
                                <SwiperSlide key={i}>
                                    <Card
                                        variant="outlined"
                                        sx={{
                                            borderRadius: 3,
                                            height: '100%',
                                        }}
                                    >
                                        <CardContent>
                                            <Box display="flex" alignItems="center" mb={2}>
                                                <Avatar
                                                    src="/assets/img/shop/pirelli.jpg"
                                                    alt="Ürün Adı"
                                                    sx={{ width: 64, height: 64, mr: 2 }}
                                                />
                                                <Box>
                                                    <Box display="flex" gap={0.5} mb={0.5}>
                                                        {[...Array(5)].map((_, j) => (
                                                            <Star key={j} size={16} color="#fbbf24" fill="#fbbf24" />
                                                        ))}
                                                    </Box>
                                                    <Typography variant="subtitle1" fontWeight="500">
                                                        Abdurrahman Çamcı
                                                    </Typography>
                                                </Box>
                                            </Box>
                                            <Typography variant="body2">
                                                Hem kargo çok hızlı ve iyi hem satış ve sonrası destek çok iyi teşekkür ederim.
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </SwiperSlide>
                            ))}
                        </Swiper>
                    </Box>
                </div>
            </div>
        </section>
    );
}