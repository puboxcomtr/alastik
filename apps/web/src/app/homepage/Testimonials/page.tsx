'use client';
import React from 'react';
import Link from 'next/link';

/* Metarial IO */
import { Card, CardContent, Typography, IconButton, Box, Avatar } from '@mui/material';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';

// Swiper
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';

/* Library */
import Testimonials from '@components/homepage/Testimonials/Testimonials';

// Swiper CSS
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

export default function TestimonialsPage() {
    return (
        <Testimonials />
    )
}