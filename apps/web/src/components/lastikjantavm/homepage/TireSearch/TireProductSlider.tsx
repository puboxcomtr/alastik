'use client'

import React, { useRef, useEffect, useState } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination } from 'swiper/modules'

import ProductSlideCard from '@components/lastikjantavm/shop/Product/Slide/Card'
import { API_ENDPOINTS } from '@/src/config/api';

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
  showcaseKey?: 'first' | 'second' | 'third' | 'fourth' | 'fifth'
}

export default function TireProductSlider({ showcaseKey = 'first' }: Props) {
  const prevRef = useRef<HTMLElement | null>(null)
  const nextRef = useRef<HTMLElement | null>(null)
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
      console.error('Vitrin yüklenemedi:', error)
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
            swiper.params.navigation.prevEl = prevRef.current as any
            swiper.params.navigation.nextEl = nextRef.current as any
          }
        }}
        pagination={{ clickable: true }}
        slidesPerView={1.4}
        spaceBetween={12}
        breakpoints={{
          576: { slidesPerView: 2.3, spaceBetween: 12 },
          768: { slidesPerView: 2, spaceBetween: 16 },
          992: { slidesPerView: 1, spaceBetween: 20 },
        }}
        loop={showcase.products.length > 1}
        className="swiper"
      >
        {showcase.products.map((product: any) => (
          <SwiperSlide key={product._key}>
            <ProductSlideCard product={product} />
          </SwiperSlide>
        ))}
      </Swiper>
      <div className="swiper-pagination swiper_pagination_product"></div>
    </div>
  )
}