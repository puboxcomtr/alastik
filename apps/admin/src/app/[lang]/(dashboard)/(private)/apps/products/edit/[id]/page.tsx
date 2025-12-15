import { Suspense, useEffect } from 'react'
// MUI Imports
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

// Context Import
import { ProductUpdateProvider } from '@/contexts/ProductUpdateContext'

import { API_ENDPOINTS, fetchAPI } from '@libs/api'
async function fetchProduct(id: string): Promise<ProductType | null> {
  try {
    const data = await fetchAPI(API_ENDPOINTS.products.detail(id), {
      cache: 'no-store',
    })
    return (data && (data.data || data.veri)) ?? null
  } catch {
    return null
  }
}

interface PageProps {
  params: {
    id: string
    lang: string
  }
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
        </Grid>
      </Grid>
    </Grid>
  )
}

export default async function eCommerceProductsEdit({ params }: PageProps) {
  const id = (await params).id
  const product = await fetchProduct(id)

  if (!product) {
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
        <p>ID: {id} ile eşleşen ürün bulunamadı.</p>
      </Box>
    )
  }

  return (
    <ProductUpdateProvider productId={id}>
      <Suspense fallback={
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      }>
        <ProductEditContent product={product} />
      </Suspense>
    </ProductUpdateProvider>
  )
}