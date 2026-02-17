'use client'

import { useState, useEffect } from 'react'
import Grid from '@mui/material/Grid2'
import { CircularProgress, Box } from '@mui/material'

// Type Imports
import type { ProductType } from '@/types/apps/productTypes'

// Component Imports
import ProductHeader from '@views/products/ProductHeader'
import ProductInformation from '@views/products/ProductInformation'
import ProductImage from '@views/products/ProductImage'
import ProductFeatures from '@views/products/ProductFeatures'
import ProductEnventory from '@/views/products/ProductEnventory'
import ProductOrganize from '@/views/products/ProductOrganize'
import ProductBrand from '@/views/products/ProductBrand'
import ProductChampionship from '@/views/products/ProductChampionship'


// Context Import
import { ProductUpdateProvider } from '@/contexts/ProductUpdateContext'

import { API_ENDPOINTS, fetchAPI } from '@libs/api'

interface PageProps {
  params: Promise<{
    id: string
    lang: string
  }>
}

function ProductEditContent({ product }: { product: ProductType }) {
  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <ProductHeader product={product} />
      </Grid>
      <Grid size={{ xs: 12, md: 8 }}>
        <Grid container spacing={6}>
          <Grid size={{ xs: 12 }}>
            <ProductInformation product={product} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <ProductImage product={product} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <ProductFeatures product={product} />
          </Grid>
        </Grid>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <Grid container spacing={6}>
          <Grid size={{ xs: 12 }}>
            <ProductEnventory product={product} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <ProductOrganize product={product} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <ProductBrand product={product} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <ProductChampionship product={product} />
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  )
}

export default function ProductEdit({ params }: PageProps) {
  const [product, setProduct] = useState<ProductType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [productId, setProductId] = useState<string>('')

  useEffect(() => {
    async function loadProduct() {
      try {
        const resolvedParams = await params
        const id = resolvedParams.id
        setProductId(id)

        const data = await fetchAPI(API_ENDPOINTS.products.detail(id), {
          cache: 'no-store',
        })

        const productData = (data && (data.data || data.veri)) ?? null

        if (productData) {
          setProduct(productData)
        } else {
          setError(true)
        }
      } catch (err) {
        console.error('Product fetch error:', err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    loadProduct()
  }, [params])

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  if (error || !product) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="400px"
        textAlign="center"
        bgcolor="#fafafa"
        borderRadius={2}
        p={4}
      >
        <h2>Ürün Bulunamadı</h2>
        <p>ID: {productId} ile eşleşen ürün bulunamadı.</p>
      </Box>
    )
  }

  return (
    <ProductUpdateProvider productId={productId}>
      <ProductEditContent product={product} />
    </ProductUpdateProvider>
  )
}