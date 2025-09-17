'use server'
// MUI Imports
import Grid from '@mui/material/Grid2'

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

async function fetchProduct(id: string): Promise<ProductType | null> {
  const baseUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api'
  try {
    const res = await fetch(`${baseUrl}/products/${id}`, { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
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

export default async function eCommerceProductsEdit({ params }: PageProps) {
  const id = (await params).id
  const product = await fetchProduct(id)
  if (!product) return <div>Ürün bulunamadı</div>

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
            <ProductOrganize />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <ProductBrand product={product} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <ProductEnventory product={product} />
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  )
}
