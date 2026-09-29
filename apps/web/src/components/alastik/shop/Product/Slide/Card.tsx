'use client'
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from 'next/navigation'
import { ROUTES } from '@src/config/routes'
import Image from 'next/image'
import Tooltip from '@mui/material/Tooltip'
import Rating from '@mui/material/Rating'
import { Container } from "react-bootstrap"

import { useSettings } from '@src/context/SettingsContext'
import { useBrands } from '@/src/context/BrandsContext'
import { useCart } from '@/src/context/CartContext'
import { useTranslations } from '@/src/hooks/Theme/useTranslations'
import { useDefinition } from '@/src/hooks/Theme/useDefinition'
import { API_ENDPOINTS, getImageUrl } from '@/src/config/api';
import {
  getProductUrl,
  getProductPrice,
  getProductType,
  getDisplayPrice,
  getProductOriginalPrice,
  hasProductDiscount,
  getProductImage,
  getProductStockCode,
  getProductSeason,
  isPriceHidden,
  PRICE_HIDDEN_LABEL
} from '@src/hooks/Products/productHelpers'
import { checkPurchaseLimit, productToLimitCheckItem } from '@src/hooks/Products/purchaseLimitHelpers'
import { toast } from 'react-toastify'
type Props = {
  product: any
}

export default function ProductSlideCard({ product }: Props) {
  const [isFavorite, setIsFavorite] = useState(false)
  const [adding, setAdding] = useState(false)
  const router = useRouter()

  const { theme } = useSettings()
  const { getBrand } = useBrands()
  const { addToCart } = useCart()
  const { t } = useTranslations('general')
  const { definition } = useDefinition()
  const getWhatsAppUrl = () => {
    const phone = definition?.companyInfo?.phone || '0539 825 71 01'
    const formatted = phone.replace(/\s+/g, '').replace(/^0/, '90')
    return `https://wa.me/${formatted}`
  }
  const [championship, setChampionship] = useState<{ name: string; rank: number } | null>(null)
  useEffect(() => {
    if (product._key) {
      fetch(API_ENDPOINTS.products.championships(product._key))
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data?.length > 0) {
            setChampionship(data.data[0])
          }
        })
        .catch(() => { })
    }
  }, [product._key])
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 992)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const toggleFavorite = () => setIsFavorite((prev) => !prev)
  const handleAddToCart = async () => {
    if (adding || priceHidden) return
    setAdding(true)

    try {
      const item = productToLimitCheckItem(product, 1)
      const check = await checkPurchaseLimit([item])

      if (!check.valid && check.violations.length > 0) {
        check.violations.forEach(v => toast.error(v.message))
        setAdding(false)
        return
      }

      // Lastikte toast yerine montaj noktası seçimine yönlendirilir (ürün detayıyla aynı davranış)
      const isTire = getProductType(product) === 'LASTIK'
      const added = await addToCart(product._key, 1, isTire ? '' : undefined)
      if (added && isTire) {
        router.push(ROUTES.MONTAGE_SELECT)
        return
      }
    } catch (err) {
      console.error('Sepete ekleme hatası:', err)
      toast.error('Sepete eklenemedi')
    } finally {
      setAdding(false)
    }
  }
  const productUrl = getProductUrl(product)
  const price = getProductPrice(product)
  const priceHidden = isPriceHidden(product)
  // Kategori ayarı "haric" olan ürünlerde fiyat KDV hariç gösterilir (sepetle aynı biçim)
  const gosterim = getDisplayPrice(product, price);
  const originalPrice = getProductOriginalPrice(product)
  const hasDiscount = hasProductDiscount(product)
  const imageUrl = getProductImage(product, theme?.defaultCatalogImage || '/alastik/assets/img/shop/pirelli.jpg')
  const productName = product.diaData?.aciklama || 'Ürün'
  const stockCode = getProductStockCode(product)
  const season = getProductSeason(product)

  const brandName = product.diaData?.marka || ''
  const brandInfo = getBrand(brandName)
  const brandLogo = brandInfo?.logo && !brandInfo.logo.includes('gorsel-bulunamadi')
    ? getImageUrl(brandInfo.logo)
    : null

  return (
    <Container className="slide__card p-0" style={{ backgroundColor: '#fff' }}>
      <div className="position-relative p-3 p-sm-4">
        {/* Favori / Şampiyonluk Butonu */}
        {!isMobile && (
          championship ? (
            <div style={{
              position: 'absolute', top: 12, left: -4, zIndex: 2,
            }}>
              <div style={{
                background: 'linear-gradient(90deg, #B8860B, #DAA520, #B8860B)',
                color: '#fff', padding: '6px 16px 6px 12px',
                display: 'flex', alignItems: 'center', gap: '8px',
                clipPath: 'polygon(0 0, 100% 0, 95% 50%, 100% 100%, 0 100%)',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                minWidth: '180px'
              }}>
                <i className="ri-trophy-fill" style={{ fontSize: '16px' }}></i>
                <span style={{ fontSize: '11px', fontWeight: 700 }}>{championship.name}</span>
              </div>
            </div>
          ) : (
            <Tooltip title={isFavorite ? "Favorilerden Çıkar" : "Favorilere Ekle"}>
              <button
                type="button"
                onClick={toggleFavorite}
                className="btn btn-icon btn-secondary animate-pulse position-absolute top-0 end-0 mt-3 me-3 z-2"
                aria-label="Favorilere Ekle"
              >
                {isFavorite ? (
                  <i className="ri-heart-fill fs-base text-danger animate-target"></i>
                ) : (
                  <i className="ri-heart-line fs-base animate-target"></i>
                )}
              </button>
            </Tooltip>
          )
        )}

        {/* Ürün görseli */}
        <Link href={productUrl} className="d-block rounded-top overflow-hidden">
          {season && (
            <span className="season_icon position-absolute top-0 start-0 mt-5 ms-2 mt-lg-5 ms-lg-3" style={{ zIndex: 1 }}>
              <img src={season.icon} alt={season.text} width={28} height={28} />
            </span>
          )}
          <img
            src={imageUrl}
            alt={productName}
            className="w-100"
          />
        </Link>
        {/* Mobil Şampiyonluk Etiketi */}
        {isMobile && championship && (
          <div className="d-inline-flex align-items-center gap-1 mt-2 mb-1" style={{
            background: 'linear-gradient(90deg, #B8860B, #DAA520, #B8860B)',
            color: '#fff',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 700
          }}>
            <i className="ri-trophy-fill" style={{ fontSize: '14px' }}></i>
            <span>{championship.name}</span>
          </div>
        )}
        {/* Marka logosu / adı */}
        <div className="d-flex justify-content-between align-items-center mt-2 mb-1">
          <div>
            {brandLogo ? (
              <Image
                src={brandLogo}
                alt={brandName || 'Marka'}
                width={90}
                height={47}
                style={{ objectFit: 'contain' }}
              />
            ) : (
              <span className="fw-medium fs-xs">{brandName || ''}</span>
            )}
          </div>
          {/* Rating */}
          <div className="d-flex align-items-center gap-1">
            {product.customData?.reviewStats?.reviewCount > 0 && (
              <>
                <Rating
                  name={`slide-rating-${product._key}`}
                  value={product.customData.reviewStats.averageRating}
                  precision={0.5}
                  size="small"
                  readOnly
                />
                <span className="text-body-tertiary fs-xs">({product.customData.reviewStats.reviewCount} Yorum)</span>
              </>
            )}
          </div>
        </div>

        {/* Stok kodu + ürün adı — stok kodu kategori ayarı açıksa gösterilmez */}
        <h3 className="mb-2">
          {(product as any)?.hideStockCode !== true && (
            <span className="fs-xs text-body-secondary lh-sm mb-1 d-block">{stockCode}</span>
          )}
          <Link href={productUrl} className="d-block fs-sm fw-medium text-truncate">
            {productName}
          </Link>
        </h3>

        {/* Fiyat */}
        {/* Fiyat */}
        <div className="d-flex justify-content-end border-top pt-3 gap-2">
          <span>
            {!priceHidden && hasDiscount && originalPrice && (
              <del className="text-body-tertiary fw-normal">
                {originalPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL
              </del>
            )}
          </span>
          <span className="fw-bold">
            {priceHidden
              ? PRICE_HIDDEN_LABEL
              : `${gosterim.value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL${gosterim.suffix}`}
          </span>
        </div>

        <div className="d-flex justify-content-end gap-2">
          {/* Sepete Ekle / Stok Sorunuz */}
          {product.diaData?.gercek_stok > 0 ? (
            <Tooltip title="Sepete Ekle">
              <button
                type="button"
                className="btn btn-primary w-100 mt-3"
                onClick={handleAddToCart}
                disabled={adding || priceHidden}
              >
                {priceHidden ? PRICE_HIDDEN_LABEL : (adding ? 'Ekleniyor...' : t('addToCart'))}
              </button>
            </Tooltip>
          ) : (
            <Link href={getWhatsAppUrl()} target="_blank" className="btn btn-outline-success w-100 mt-3">
              <i className="ri-whatsapp-line me-1"></i> Stok Sorunuz
            </Link>
          )}
        </div>
      </div>
    </Container>
  )
}