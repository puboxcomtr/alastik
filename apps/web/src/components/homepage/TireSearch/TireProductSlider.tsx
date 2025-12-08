'use client'

import React, { useRef, useEffect, useState } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination } from 'swiper/modules'

import ProductSlideCard from '@components/shop/Product/Slide/Card'

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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api'

export default function TireProductSlider({ showcaseKey = 'first' }: Props) {
  const prevRef = useRef<HTMLElement | null>(null)
  const nextRef = useRef<HTMLElement | null>(null)
  const [showcase, setShowcase] = useState<ShowcaseData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchShowcase()
  }, [showcaseKey])

  const fetchShowcase = async () => {
    try {
      const res = await fetch(`${API_URL}/showcases/public/homepage`)
      const result = await res.json()

      if (result.success && result.data) {
        const found = result.data.find((s: ShowcaseData) => s.key === showcaseKey)
        setShowcase(found || null)
      }
    } catch (error) {
      console.error('Vitrin yüklenemedi:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="featured_products position-relative">
        <div className="text-center py-4">
          <div className="spinner-border spinner-border-sm text-primary" role="status">
            <span className="visually-hidden">Yükleniyor...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!showcase || !showcase.products || showcase.products.length === 0) {
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
          spaceBetween={20}
          loop={true}
          className="swiper"
        >
          <SwiperSlide><ProductSlideCard /></SwiperSlide>
          <SwiperSlide><ProductSlideCard /></SwiperSlide>
          <SwiperSlide><ProductSlideCard /></SwiperSlide>
        </Swiper>
        <div className="swiper-pagination swiper_pagination_product"></div>
      </div>
    )
  }

  // Dinamik veri
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
        spaceBetween={20}
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