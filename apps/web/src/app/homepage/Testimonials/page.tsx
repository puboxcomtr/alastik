'use client';
import React from 'react';
import AlastikTestimonials from '@components/alastik/homepage/Testimonials/Testimonials';
import LjaTestimonials from '@components/lastikjantavm/homepage/Testimonials/Testimonials';

type Props = { site?: string };

export default function TestimonialsPage({ site = 'alastik' }: Props) {
    const Testimonials = site === 'lastikjantavm' ? LjaTestimonials : AlastikTestimonials;
    return <Testimonials site={site} />;
}