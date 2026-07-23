'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

import { buildProductUrl } from '@/src/config/routes';

/* Metarial IO */
import { Card, CardContent, Typography, IconButton, Box, Avatar } from '@mui/material';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';

// Swiper
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay } from 'swiper/modules';

// Swiper CSS
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

import { API_ENDPOINTS } from '@/src/config/api';

interface Review {
    _id: string;
    displayName: string;
    overallRating: number;
    comment: string;
    tireSize: string;
    createdAt: string;
    product: {
        name: string;
        brand: string;
        image: string | null;
        seoUrl: string;
    } | null;
}

export default function Testimonials({ site = 'alastik' }: { site?: string }) {
    const [reviews, setReviews] = useState<Review[]>([]);

    useEffect(() => {
        fetch(`${API_ENDPOINTS.reviews.top()}?limit=10`, {
            headers: { 'X-Site': site }
        })
            .then(res => res.json())
            .then(data => {
                if (data.success && data.data) setReviews(data.data);
            })
            .catch(() => { })
    }, [site]);

    if (reviews.length === 0) {
        return null;
    }

    return (
        <section className="bg-body-tertiary my-5 py-5">
            <div className="container">
                <div className="row-fluid">
                    <h2 className="text-center mb-4">Sizden Gelen Yorumlar</h2>
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
                            modules={[Navigation, Autoplay]}
                            loop={reviews.length > 3}
                            spaceBetween={24}
                            autoplay={{ delay: 4000, disableOnInteraction: false }}
                            navigation={{ prevEl: '#reviewsPrev', nextEl: '#reviewsNext' }}
                            breakpoints={{
                                0: { slidesPerView: 1 },
                                600: { slidesPerView: 2 },
                                992: { slidesPerView: 3 },
                            }}
                        >
                            {reviews.map((review) => (
                                <SwiperSlide key={review._id}>
                                    <Card
                                        variant="outlined"
                                        sx={{
                                            borderRadius: 3
                                        }}
                                    >
                                        <CardContent>
                                            <Box display="flex" alignItems="center" mb={2}>
                                                {review.product?.image ? (
                                                    <Link href={buildProductUrl(review.product.seoUrl)}>
                                                        <Avatar
                                                            src={review.product.image}
                                                            alt={review.product.name}
                                                            sx={{ width: 64, height: 64, mr: 2, cursor: 'pointer' }}
                                                        />
                                                    </Link>
                                                ) : (
                                                    <Avatar sx={{ width: 64, height: 64, mr: 2, bgcolor: '#f0f0f0' }}>
                                                        <i className="ri-user-line" style={{ fontSize: 28, color: '#999' }}></i>
                                                    </Avatar>
                                                )}
                                                <Box>
                                                    <Box display="flex" gap={0.5} mb={0.5}>
                                                        {[...Array(5)].map((_, j) => (
                                                            <Star
                                                                key={j}
                                                                size={16}
                                                                color={j < review.overallRating ? '#fbbf24' : '#ddd'}
                                                                fill={j < review.overallRating ? '#fbbf24' : '#ddd'}
                                                            />
                                                        ))}
                                                    </Box>
                                                    <Typography variant="subtitle1" fontWeight="500">
                                                        {review.displayName}
                                                    </Typography>
                                                    {review.product && (
                                                        <Link href={buildProductUrl(review.product.seoUrl)} style={{ textDecoration: 'none' }}>
                                                            <Typography variant="caption" color="text.secondary" sx={{
                                                                display: 'block',
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                maxWidth: '200px'
                                                            }}>
                                                                {review.product.name}
                                                            </Typography>
                                                        </Link>
                                                    )}
                                                </Box>
                                            </Box>
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