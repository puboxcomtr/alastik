'use client'

import React, { useRef, useEffect, useState } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination } from 'swiper/modules'

// Components
import ProductCard from '@components/shop/Product/Showcase/Card'
import { API_ENDPOINTS } from '@/src/config/api';

// Swiper
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import 'swiper/css/effect-fade'

type ShowcaseData = {
    key: string
    title: string
    subtitle: string
    itemsPerRow: number
    products: any[]
}

type Props = {
    showcaseKey?: 'first' | 'second' | 'third'
}

export default function TireProductSlider({ showcaseKey = 'first' }: Props) {
    const prevRef = useRef<HTMLButtonElement | null>(null)
    const nextRef = useRef<HTMLButtonElement | null>(null)
    const [showcase, setShowcase] = useState<ShowcaseData | null>(null)

    useEffect(() => {
        fetchShowcase()
    }, [showcaseKey])

    const fetchShowcase = async () => {
        try {
            const res = await fetch(API_ENDPOINTS.showcases.homepage())
            const result = await res.json()

            if (result.success && result.data) {
                const found = result.data.find((s: ShowcaseData) => s.key === showcaseKey)
                setShowcase(found || null)
            }
        } catch (error) {
            console.error('Vitrin yüklenemedi', error)
        }
    }

    if (!showcase || !showcase.products || showcase.products.length === 0) {
        return null
    }

    return (
        <div className="featured_products position-relative">
            <Swiper
                modules={[Navigation, Pagination]}
                onBeforeInit={(swiper) => {
                    if (swiper.params.navigation && typeof swiper.params.navigation !== 'boolean') {
                        swiper.params.navigation.prevEl = prevRef.current
                        swiper.params.navigation.nextEl = nextRef.current
                    }
                }}
                pagination={{ clickable: true }}
                spaceBetween={20}
                loop={showcase.products.length > 1}
                slidesPerView={1}
                className="swiper"
            >
                {showcase.products.map((product: any) => (
                    <SwiperSlide key={product._key}>
                        <ProductCard product={product} />
                    </SwiperSlide>
                ))}
            </Swiper>
            <div className="swiper-pagination swiper_pagination_product"></div>
        </div>
    )
}