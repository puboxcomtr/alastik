'use client'

import Link from "next/link"
import Tooltip from '@mui/material/Tooltip'
import Rating from '@mui/material/Rating'
import Image from "react-bootstrap/Image"
import { Container } from "react-bootstrap"
import { useState } from "react"

import { useSettings } from '@src/context/SettingsContext'
import {
  getProductUrl,
  getProductPrice,
  getProductOriginalPrice,
  hasProductDiscount,
  getProductImage
} from '@src/hooks/Products/productHelpers'

type Props = {
  product?: any
}

export default function ProductSlideCard({ product }: Props) {
  const [value, setValue] = useState<number | null>(4)
  const [isFavorite, setIsFavorite] = useState(false)
  const { theme } = useSettings()

  const toggleFavorite = () => {
    setIsFavorite((prev) => !prev)
  }

  if (!product) {
    return (
      <Container className="p-0" style={{ backgroundColor: '#fff' }}>
        <div className="position-relative p-3 p-sm-4">
          <Link href="/product" className="d-block rounded-top overflow-hidden">
            <Image
              src="/assets/img/shop/pirelli.jpg"
              alt="Ürün Adı"
              className="w-100"
            />
          </Link>
          <div className="d-flex align-items-center gap-2 mb-0 pb-0">
            <Rating name="product-rating" value={4} precision={0.5} size="small" readOnly />
            <span className="text-body-tertiary fs-xs">(4)</span>
          </div>
          <h3>
            <Link href="/product" className="d-block fs-sm fw-medium text-truncate">
              Michelin Primacy 4+ 205/55R16 91V
            </Link>
          </h3>
          <div className="d-flex align-items-center justify-content-between">
            <div className="h5 lh-1 mb-0">
              3.350 TL <del className="text-body-tertiary fs-sm fw-normal">5.300 TL</del>
            </div>
            <Tooltip title="Sepete Ekle">
              <button
                type="button"
                className="product-card-button btn btn-icon btn-primary animate-slide-end ms-2 rounded-2"
                aria-label="Add to Cart"
              >
                <i className="ci-shopping-cart fs-base animate-target"></i>
              </button>
            </Tooltip>
          </div>
        </div>
      </Container>
    )
  }

  const productUrl = getProductUrl(product)
  const price = getProductPrice(product)
  const originalPrice = getProductOriginalPrice(product)
  const hasDiscount = hasProductDiscount(product)
  const imageUrl = getProductImage(product, theme?.defaultCatalogImage || '/assets/img/shop/pirelli.jpg')
  const productName = product.diaData?.aciklama || 'Ürün'

  return (
    <Container className="p-0" style={{ backgroundColor: '#fff' }}>
      <div className="position-relative p-3 p-sm-4">
        <Link href={productUrl} className="d-block rounded-top overflow-hidden">
          <Image
            src={imageUrl}
            alt={productName}
            className="w-100"
          />
        </Link>
        <Tooltip title={isFavorite ? "Favorilerden Çıkar" : "Favorilere Ekle"}>
          <button
            type="button"
            onClick={toggleFavorite}
            className="btn btn-icon btn-secondary animate-pulse d-none d-lg-inline-flex position-absolute top-0 end-0 mt-3 me-3 z-2"
            aria-label="Favorilere Ekle"
          >
            {isFavorite ? (
              <i className="ri-heart-fill fs-base text-danger animate-target"></i>
            ) : (
              <i className="ri-heart-line fs-base animate-target"></i>
            )}
          </button>
        </Tooltip>
        <div className="d-flex align-items-center gap-2 mb-0 pb-0">
          <Rating
            name={`product-rating-${product._key}`}
            value={value}
            precision={0.5}
            size="small"
            onChange={(event, newValue) => {
              setValue(newValue)
            }}
          />
          <span className="text-body-tertiary fs-xs">({value})</span>
        </div>
        <h3>
          <Link
            href={productUrl}
            className="d-block fs-sm fw-medium text-truncate"
          >
            {productName}
          </Link>
        </h3>
        <div className="d-flex align-items-center justify-content-between">
          <div className="h5 lh-1 mb-0">
            {price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL{" "}
            {hasDiscount && originalPrice && (
              <del className="text-body-tertiary fs-sm fw-normal">
                {originalPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL
              </del>
            )}
          </div>
          <Tooltip title="Sepete Ekle">
            <button
              type="button"
              className="product-card-button btn btn-icon btn-primary animate-slide-end ms-2 rounded-2"
              aria-label="Add to Cart"
            >
              <i className="ci-shopping-cart fs-base animate-target"></i>
            </button>
          </Tooltip>
        </div>
      </div>
    </Container>
  )
}